create or replace function app.uid()
returns uuid language sql stable set search_path to 'pg_catalog' as $function$
  select (select auth.uid())::uuid
$function$;

create or replace function app.is_platform_admin()
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select exists (select 1 from public.admin_users au where au.user_id = app.uid())
$function$;

create or replace function app.org_has_role(p_org uuid, p_roles app_role[])
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select exists (
    select 1 from public.org_members m
    where m.org_id = p_org and m.user_id = app.uid()
      and (p_roles is null or m.role = any (p_roles))
  )
$function$;

create or replace function app.is_org_member_of(p_org uuid)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select app.org_has_role(p_org, null)
$function$;

create or replace function app.is_org_owner(p_org uuid)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select app.org_has_role(p_org, array['organizer_owner']::app_role[])
$function$;

create or replace function app.is_org_admin_of(p_org uuid)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select app.org_has_role(p_org, array['organizer_owner','organizer_admin']::app_role[])
      or app.is_platform_admin()
$function$;

create or replace function app.is_org_manager(p_org uuid)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select app.org_has_role(p_org, array['organizer_owner','organizer_admin','organizer_staff']::app_role[])
      or app.is_platform_admin()
$function$;

create or replace function app.is_org_finance_viewer(p_org uuid)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select app.org_has_role(p_org, array['organizer_owner','finance']::app_role[])
      or app.is_platform_admin()
$function$;

create or replace function app.is_event_staff_of(p_event uuid, p_roles app_role[])
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select exists (
    select 1 from public.event_staff es
    where es.event_id = p_event and es.user_id = app.uid()
      and es.active is true and (p_roles is null or es.role = any (p_roles))
  )
$function$;

do $$
declare fn text;
begin
  foreach fn in array array[
    'app.uid()','app.is_platform_admin()','app.org_has_role(uuid, app_role[])',
    'app.is_org_member_of(uuid)','app.is_org_owner(uuid)','app.is_org_admin_of(uuid)',
    'app.is_org_manager(uuid)','app.is_org_finance_viewer(uuid)','app.is_event_staff_of(uuid, app_role[])'
  ] loop
    execute format('revoke execute on function %s from public', fn);
    execute format('grant execute on function %s to authenticated, anon', fn);
  end loop;
end $$;;
