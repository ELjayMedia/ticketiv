-- TICK-267 (S2): fix current_user_org_ids().
--
-- The old body read `profiles.role IN ('admin','organizer') AND profiles.org_id`,
-- but profiles no longer has an org_id column, so the function errored at runtime
-- and every RLS policy calling it survived only by OR short-circuiting on other
-- branches.
--
-- Reimplement against org_members. The function gates a dashboard UPDATE policy on
-- ticket_types, so it must keep the old "privileged manager" semantics rather than
-- returning every membership — otherwise any member (scanner/member/staff) could
-- update ticket types. Privileged roles: organizer_owner, organizer_admin,
-- organizer_staff.

create or replace function public.current_user_org_ids()
returns setof uuid
language sql
security definer
set search_path to 'pg_catalog', 'public', 'extensions'
as $function$
  select org_id
  from public.org_members
  where user_id = public.current_user_uid()
    and role = any (array['organizer_owner','organizer_admin','organizer_staff']::public.app_role[]);
$function$;
