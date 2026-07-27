create extension if not exists "pgcrypto";

create type public.app_role as enum ('user', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  country text,
  timezone text,
  role public.app_role not null default 'user',
  privacy_consent_at timestamptz,
  disclaimer_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.health_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  date_of_birth date, gender text, height_cm numeric, current_weight_kg numeric,
  waist_cm numeric, activity_level text, occupation_type text, work_hours numeric,
  wake_time time, bedtime time, diet_type text, region text,
  conditions text[] not null default '{}', allergies text[] not null default '{}',
  preferences jsonb not null default '{}', updated_at timestamptz not null default now()
);

create table public.user_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_type text not null, target_weight_kg numeric, target_date date,
  milestone_weight_kg numeric, status text not null default 'active',
  safety_result jsonb not null default '{}', created_at timestamptz not null default now()
);

create table public.health_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  metric_type text not null, value numeric not null, unit text not null,
  measured_at timestamptz not null, reference_range text, source text not null default 'manual',
  notes text, created_at timestamptz not null default now()
);
create index health_metrics_user_date_idx on public.health_metrics(user_id, measured_at desc);

create table public.uploaded_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null, category text not null, report_date date,
  storage_path text not null, mime_type text not null, size_bytes bigint not null,
  notes text, created_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.extracted_report_values (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.uploaded_reports(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  metric_type text not null, value numeric, unit text, reference_range text,
  confidence numeric, confirmed boolean not null default false,
  confirmed_at timestamptz, created_at timestamptz not null default now()
);

create table public.diet_plan_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  version integer not null, active boolean not null default false,
  generation_method text not null, provider text, model text, prompt_version text,
  health_snapshot jsonb not null, preference_snapshot jsonb not null,
  plan jsonb not null, reason text, rating integer check (rating between 1 and 5),
  feedback text, created_at timestamptz not null default now(), archived_at timestamptz,
  unique(user_id, version)
);

create table public.exercise_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  diet_plan_version_id uuid references public.diet_plan_versions(id) on delete set null,
  plan jsonb not null, created_at timestamptz not null default now()
);

create table public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  checkin_date date not null, data jsonb not null, updated_at timestamptz not null default now(),
  unique(user_id, checkin_date)
);

create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null, captured_on date not null, weight_kg numeric,
  notes text, created_at timestamptz not null default now()
);

create table public.ai_generation_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  provider text not null, model text, request_type text not null,
  success boolean not null, duration_ms integer, usage jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.safety_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  category text not null, severity text not null, resolved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.health_profiles enable row level security;
alter table public.user_goals enable row level security;
alter table public.health_metrics enable row level security;
alter table public.uploaded_reports enable row level security;
alter table public.extracted_report_values enable row level security;
alter table public.diet_plan_versions enable row level security;
alter table public.exercise_plans enable row level security;
alter table public.daily_checkins enable row level security;
alter table public.progress_photos enable row level security;
alter table public.ai_generation_logs enable row level security;
alter table public.safety_flags enable row level security;

create or replace function public.is_admin() returns boolean language sql stable security definer
set search_path = public as $$ select exists(select 1 from profiles where id = auth.uid() and role = 'admin' and deleted_at is null) $$;

create policy "profile owner read" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profile owner update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

do $$
declare table_name text;
begin
  foreach table_name in array array['health_profiles','user_goals','health_metrics','uploaded_reports','extracted_report_values','diet_plan_versions','exercise_plans','daily_checkins','progress_photos']
  loop
    execute format('create policy "owner all" on public.%I for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin())', table_name);
  end loop;
end $$;

create policy "admin logs" on public.ai_generation_logs for select using (public.is_admin());
create policy "admin flags" on public.safety_flags for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets(id, name, public) values ('health-reports', 'health-reports', false), ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;
create policy "private report files" on storage.objects for all using (bucket_id='health-reports' and (storage.foldername(name))[1]=auth.uid()::text)
with check (bucket_id='health-reports' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "private progress photos" on storage.objects for all using (bucket_id='progress-photos' and (storage.foldername(name))[1]=auth.uid()::text)
with check (bucket_id='progress-photos' and (storage.foldername(name))[1]=auth.uid()::text);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
