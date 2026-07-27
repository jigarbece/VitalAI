create policy "admins update profiles"
on public.profiles for update
using (public.is_admin())
with check (public.is_admin());

create policy "admins read report files"
on storage.objects for select
using (bucket_id = 'health-reports' and public.is_admin());

create policy "admins read progress photos"
on storage.objects for select
using (bucket_id = 'progress-photos' and public.is_admin());

create policy "users insert own ai logs"
on public.ai_generation_logs for insert
with check (user_id = auth.uid());
