create or replace function public.fn_get_ticketiv_effective_roles(p_user_id uuid)
returns table(user_id uuid, role_key text, role_label text, source text, source_id uuid)
language sql
stable
security definer
set search_path = public
as $function$
  select p.user_id, 'attendee'::text, 'Attendee'::text, 'profiles'::text, p.user_id
  from public.profiles p
  where p.user_id = p_user_id
    and (auth.uid() = p_user_id or auth.role() = 'service_role')

  union

  select om.user_id,
         om.role::text,
         case om.role
           when 'organizer_owner'::public.app_role then 'Owner'
           when 'organizer_admin'::public.app_role then 'Admin'
           when 'organizer_staff'::public.app_role then 'Staff'
           when 'finance'::public.app_role then 'Finance'
           when 'organizer'::public.app_role then 'Organizer'
           else initcap(replace(om.role::text, '_', ' '))
         end,
         'org_members'::text,
         om.org_id
  from public.org_members om
  where om.user_id = p_user_id
    and (auth.uid() = p_user_id or auth.role() = 'service_role')
    and om.role in (
      'organizer'::public.app_role,
      'organizer_owner'::public.app_role,
      'organizer_admin'::public.app_role,
      'organizer_staff'::public.app_role,
      'finance'::public.app_role
    )

  union

  select es.user_id, 'scanner'::text, 'Scanner'::text, 'event_staff'::text, es.event_id
  from public.event_staff es
  where es.user_id = p_user_id
    and (auth.uid() = p_user_id or auth.role() = 'service_role')
    and es.active is true
    and es.role in ('scanner'::public.app_role, 'organizer_scanner'::public.app_role)

  union

  select a.primary_user_id, 'talent'::text, 'Talent'::text, 'artists.primary_user_id'::text, a.id
  from public.artists a
  where a.primary_user_id = p_user_id
    and (auth.uid() = p_user_id or auth.role() = 'service_role')

  union

  select au.user_id,
         au.role_tier::text,
         case au.role_tier::text
           when 'super_admin' then 'Super admin'
           else initcap(replace(au.role_tier::text, '_', ' '))
         end,
         'admin_users'::text,
         au.user_id
  from public.admin_users au
  where au.user_id = p_user_id
    and (auth.uid() = p_user_id or auth.role() = 'service_role')
    and au.active is true;
$function$;

revoke all on function public.fn_get_ticketiv_effective_roles(uuid) from public, anon;
grant execute on function public.fn_get_ticketiv_effective_roles(uuid) to authenticated, service_role;
