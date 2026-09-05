create or replace function public.can_manage_org(p_org_id uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.org_members om
    where om.org_id = p_org_id
      and om.user_id = p_user
      and om.role::text in ('organizer_owner', 'organizer_admin')
  ) or exists (
    select 1
    from public.admin_users au
    where au.user_id = p_user
  );
$$;

revoke all on function public.can_manage_org(uuid, uuid) from public, anon, authenticated;
grant execute on function public.can_manage_org(uuid, uuid) to service_role;
;
