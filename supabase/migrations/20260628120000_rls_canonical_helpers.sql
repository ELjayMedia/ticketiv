-- TICK-278 (S13) Batch 0 — canonical RLS helper family (ADDITIVE; no policy changes).
--
-- Establishes one app.* family to replace the drifted set
-- (public.is_org_member / app.is_org_member / fn_is_org_member, the two
-- is_org_admin signatures, is_super_admin/is_global_admin, and three uid forms).
-- Later batches rewrite policies onto these, then drop the legacy helpers.
--
-- All SECURITY DEFINER + STABLE + pinned search_path so they evaluate correctly
-- regardless of the calling table's RLS (and avoid org_members policy recursion).
-- app.uid() reads the request JWT (auth.uid()) even under SECURITY DEFINER.

begin;

-- Current authenticated user (single accessor; wrap-friendly for InitPlan).
create or replace function app.uid()
returns uuid language sql stable set search_path to 'pg_catalog' as $function$
  select (select auth.uid())::uuid
$function$;

-- Platform (super) admin — replaces is_super_admin + is_global_admin.
create or replace function app.is_platform_admin()
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select exists (select 1 from public.admin_users au where au.user_id = app.uid())
$function$;

-- Role primitive: caller holds one of p_roles in p_org (null = any membership).
create or replace function app.org_has_role(p_org uuid, p_roles app_role[])
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select exists (
    select 1 from public.org_members m
    where m.org_id = p_org
      and m.user_id = app.uid()
      and (p_roles is null or m.role = any (p_roles))
  )
$function$;

-- Any membership (canonical "member").
create or replace function app.is_org_member_of(p_org uuid)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select app.org_has_role(p_org, null)
$function$;

-- Owner only (specific person; platform admin NOT included).
create or replace function app.is_org_owner(p_org uuid)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select app.org_has_role(p_org, array['organizer_owner']::app_role[])
$function$;

-- Owner/Admin (+ platform admin) — matches the intended public.is_org_admin(org).
create or replace function app.is_org_admin_of(p_org uuid)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select app.org_has_role(p_org, array['organizer_owner','organizer_admin']::app_role[])
      or app.is_platform_admin()
$function$;

-- Owner/Admin/Staff (+ platform admin) — true "can manage" (fixes fn_is_org_member
-- which excluded owners).
create or replace function app.is_org_manager(p_org uuid)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select app.org_has_role(p_org, array['organizer_owner','organizer_admin','organizer_staff']::app_role[])
      or app.is_platform_admin()
$function$;

-- Owner/Finance (+ platform admin) — money surfaces (mirrors public.is_org_finance_viewer).
create or replace function app.is_org_finance_viewer(p_org uuid)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select app.org_has_role(p_org, array['organizer_owner','finance']::app_role[])
      or app.is_platform_admin()
$function$;

-- Event staff (door/scanner) — caller has an active staff row on the event.
-- Named *_of to avoid colliding with the legacy app.is_event_staff signature.
create or replace function app.is_event_staff_of(p_event uuid, p_roles app_role[])
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select exists (
    select 1 from public.event_staff es
    where es.event_id = p_event
      and es.user_id = app.uid()
      and es.active is true
      and (p_roles is null or es.role = any (p_roles))
  )
$function$;

-- RLS predicate functions must be executable by the roles policies apply to.
do $$
declare fn text;
begin
  foreach fn in array array[
    'app.uid()',
    'app.is_platform_admin()',
    'app.org_has_role(uuid, app_role[])',
    'app.is_org_member_of(uuid)',
    'app.is_org_owner(uuid)',
    'app.is_org_admin_of(uuid)',
    'app.is_org_manager(uuid)',
    'app.is_org_finance_viewer(uuid)',
    'app.is_event_staff_of(uuid, app_role[])'
  ]
  loop
    execute format('revoke execute on function %s from public', fn);
    execute format('grant execute on function %s to authenticated, anon', fn);
  end loop;
end $$;

commit;
