-- TICK-266 (S1): fn_get_ticketiv_effective_roles as the single source of truth.
--
-- Changes vs the previous resolver:
--   * Org memberships now return their SPECIFIC role (organizer_owner/_admin/_staff/
--     finance/organizer) instead of collapsing to a generic 'organizer', so
--     in-workspace gating (S12) can use one resolver.
--   * Adds platform admins from admin_users (role_tier, e.g. super_admin).
--   * Drops events.created_by as a second organizer source — org membership is the
--     single ownership signal.
--   * Keeps the (role_key, role_label, source, source_id) shape; source_id = the
--     org/event id (or the user id for attendee/admin) for the context switcher.

create or replace function public.fn_get_ticketiv_effective_roles(p_user_id uuid)
returns table(user_id uuid, role_key text, role_label text, source text, source_id uuid)
language sql
stable security definer
set search_path to 'public'
as $function$
  -- Baseline attendee identity (everyone).
  select p.user_id, 'attendee'::text, 'Attendee'::text, 'profiles'::text, p.user_id
  from public.profiles p
  where p.user_id = p_user_id

  union

  -- Org memberships — specific role per org.
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
    and om.role in (
      'organizer'::public.app_role,
      'organizer_owner'::public.app_role,
      'organizer_admin'::public.app_role,
      'organizer_staff'::public.app_role,
      'finance'::public.app_role
    )

  union

  -- Scanner assignments.
  select es.user_id, 'scanner'::text, 'Scanner'::text, 'event_staff'::text, es.event_id
  from public.event_staff es
  where es.user_id = p_user_id
    and es.active is true
    and es.role in ('scanner'::public.app_role, 'organizer_scanner'::public.app_role)

  union

  -- Talent.
  select a.primary_user_id, 'talent'::text, 'Talent'::text, 'artists.primary_user_id'::text, a.id
  from public.artists a
  where a.primary_user_id = p_user_id

  union

  -- Platform admin (super_admin and other tiers) from admin_users.
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
    and au.active is true;
$function$;
