create table if not exists public.food_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.food_categories(id) on delete set null,
  name text not null unique,
  region text,
  dietary_labels text[] not null default '{}',
  serving_size numeric not null default 100 check (serving_size > 0),
  unit text not null default 'g',
  household_measure text,
  calories numeric not null default 0 check (calories >= 0),
  protein numeric not null default 0 check (protein >= 0),
  carbohydrates numeric not null default 0 check (carbohydrates >= 0),
  fat numeric not null default 0 check (fat >= 0),
  fibre numeric not null default 0 check (fibre >= 0),
  sugar numeric,
  sodium numeric,
  allergens text[] not null default '{}',
  preparation_notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exercise_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  fitness_level text not null default 'Beginner',
  duration_minutes integer not null default 20 check (duration_minutes > 0),
  instructions text not null,
  safety_notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.diet_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  diet_type text not null,
  region text,
  calorie_band text,
  template jsonb not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.system_notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  severity text not null default 'info' check (severity in ('info','success','warning','critical')),
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.application_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  consent_type text not null,
  policy_version text not null,
  granted boolean not null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists foods_category_idx on public.foods(category_id);
create index if not exists consent_records_user_idx on public.consent_records(user_id, created_at desc);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);

alter table public.food_categories enable row level security;
alter table public.foods enable row level security;
alter table public.exercise_templates enable row level security;
alter table public.diet_templates enable row level security;
alter table public.system_notices enable row level security;
alter table public.application_settings enable row level security;
alter table public.consent_records enable row level security;
alter table public.audit_logs enable row level security;

create policy "authenticated read food categories" on public.food_categories for select to authenticated using (active or public.is_admin());
create policy "authenticated read foods" on public.foods for select to authenticated using (active or public.is_admin());
create policy "authenticated read exercise templates" on public.exercise_templates for select to authenticated using (active or public.is_admin());
create policy "authenticated read diet templates" on public.diet_templates for select to authenticated using (active or public.is_admin());
create policy "active notices are readable" on public.system_notices for select to authenticated using (active or public.is_admin());

create policy "admin manages food categories" on public.food_categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin manages foods" on public.foods for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin manages exercise templates" on public.exercise_templates for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin manages diet templates" on public.diet_templates for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin manages notices" on public.system_notices for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin manages settings" on public.application_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "consent owner read" on public.consent_records for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "consent owner insert" on public.consent_records for insert to authenticated with check (user_id = auth.uid());
create policy "admin reads audit logs" on public.audit_logs for select to authenticated using (public.is_admin());
create policy "admin writes audit logs" on public.audit_logs for insert to authenticated with check (public.is_admin());

insert into public.application_settings(key, value, description)
values
  ('ai_daily_limit', '3', 'Maximum AI plan requests per user per day'),
  ('weekly_plan_limit', '2', 'Maximum full weekly plan generations per user per week'),
  ('maintenance_mode', 'false', 'Disable non-admin generation during maintenance')
on conflict (key) do nothing;

insert into public.food_categories(name, description)
values
  ('Grains', 'Whole grains and staple cereals'),
  ('Pulses', 'Lentils, beans, and legumes'),
  ('Vegetables', 'Fresh and cooked vegetables'),
  ('Fruits', 'Fresh fruits'),
  ('Dairy', 'Milk and dairy foods'),
  ('Protein', 'Egg, fish, poultry, and plant proteins'),
  ('Snacks', 'Balanced snack options')
on conflict (name) do nothing;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id, full_name, country, timezone, privacy_consent_at, disclaimer_consent_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    nullif(new.raw_user_meta_data->>'country',''),
    nullif(new.raw_user_meta_data->>'timezone',''),
    case when (new.raw_user_meta_data->>'privacy_consent')::boolean then now() else null end,
    case when (new.raw_user_meta_data->>'disclaimer_consent')::boolean then now() else null end
  );
  insert into public.health_profiles(user_id, date_of_birth, gender)
  values (new.id, nullif(new.raw_user_meta_data->>'date_of_birth','')::date, nullif(new.raw_user_meta_data->>'gender',''))
  on conflict (user_id) do nothing;
  if (new.raw_user_meta_data->>'privacy_consent')::boolean then
    insert into public.consent_records(user_id, consent_type, policy_version, granted)
    values (new.id, 'privacy', coalesce(new.raw_user_meta_data->>'policy_version','2026-07'), true);
  end if;
  if (new.raw_user_meta_data->>'disclaimer_consent')::boolean then
    insert into public.consent_records(user_id, consent_type, policy_version, granted)
    values (new.id, 'medical_disclaimer', coalesce(new.raw_user_meta_data->>'policy_version','2026-07'), true);
  end if;
  return new;
end $$;
