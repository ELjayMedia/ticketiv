alter table public.admin_action_catalog enable row level security;

create policy "Super admins can read admin action catalog"
on public.admin_action_catalog
for select
to authenticated
using (public.is_super_admin(auth.uid()));

create policy "Super admins can insert admin action catalog"
on public.admin_action_catalog
for insert
to authenticated
with check (public.is_super_admin(auth.uid()));

create policy "Super admins can update admin action catalog"
on public.admin_action_catalog
for update
to authenticated
using (public.is_super_admin(auth.uid()))
with check (public.is_super_admin(auth.uid()));

create policy "Super admins can delete admin action catalog"
on public.admin_action_catalog
for delete
to authenticated
using (public.is_super_admin(auth.uid()));;
