-- TICK-278 (S13) Batch 4b — final: rewrite the event-permission helper bodies
-- onto the canonical app.* family, fix the last 3 stray policies, and DROP the
-- drifted legacy helper functions.
--
-- After Batches 1–4a no RLS policy referenced a drifted helper except via the
-- event-permission helpers below and three policies on app_audit_log / event_series.
-- This migration removes those last references and drops the legacy family.
--
-- Accessors kept (still used by RPCs / untouched policies): get_user_org,
-- get_user_orgs, current_user_org_ids, user_has_org_role.

begin;

-- 1) Rewrite event-permission helpers onto canonical app.* (idempotent).
create or replace function app.can_delete_event(event_id uuid)
returns boolean language sql stable security definer set search_path to 'app','public' as $function$
  select app.is_org_admin_of(org_id) from public.events where id = event_id;
$function$;

create or replace function app.can_manage_guestlist_entry(p_event uuid)
returns boolean language sql stable security definer set search_path to 'app','public' as $function$
  select app.is_event_staff_of(p_event, array['organizer_admin','organizer_staff']::app_role[])
    or exists (select 1 from public.events e where e.id = p_event and app.is_org_manager(e.org_id));
$function$;

create or replace function app.can_update_guestlist_entry(p_uid uuid, p_event_id uuid, p_created_by uuid)
returns boolean language sql stable security definer set search_path to 'app','public','pg_temp' as $function$
  select (p_uid is not null and p_uid = p_created_by)
    or app.is_event_staff_of(p_event_id, array['organizer_admin','organizer_staff']::app_role[])
    or exists (select 1 from public.events e where e.id = p_event_id and app.is_org_manager(e.org_id));
$function$;

create or replace function public.can_update_ticket_types_by_user(p_user uuid, p_event_id uuid)
returns boolean language sql stable security definer set search_path to 'pg_catalog','public','app' as $function$
  select exists (select 1 from public.events e where e.id = p_event_id and app.is_org_manager(e.org_id))
    or app.is_event_staff_of(p_event_id, array['organizer_admin','organizer_staff']::app_role[])
    or (((select auth.jwt()) ->> 'can_manage_ticket_types')::boolean is true);
$function$;

-- 2) Last stray policies referencing is_org_admin().
-- app_audit_log: is_org_admin(changed_by) passed a USER id as the org param
-- (dead branch); its only live effect was the platform-admin OR. Canonicalize.
drop policy if exists audit_log_select_combined on public.app_audit_log;
create policy audit_log_select_combined on public.app_audit_log
  for select to authenticated
  using (app.is_platform_admin() or ((row_data ->> 'org_id')::uuid = get_user_org()));

drop policy if exists event_series_org_admin_insert on public.event_series;
create policy event_series_org_admin_insert on public.event_series
  for insert to authenticated with check (app.is_org_admin_of(org_id));

drop policy if exists event_series_org_admin_update on public.event_series;
create policy event_series_org_admin_update on public.event_series
  for update to authenticated using (app.is_org_admin_of(org_id)) with check (app.is_org_admin_of(org_id));

drop policy if exists event_series_org_admin_delete on public.event_series;
create policy event_series_org_admin_delete on public.event_series
  for delete to authenticated using (app.is_org_admin_of(org_id));

drop policy if exists membership_invites_admin_select on public.membership_invites;
create policy membership_invites_admin_select on public.membership_invites
  for select to authenticated using (app.is_org_admin_of(org_id));

drop policy if exists transfers_delete_admin on public.transfers;
create policy transfers_delete_admin on public.transfers
  for delete to authenticated
  using (exists (select 1 from public.order_items oi join public.orders o on oi.order_id = o.id
                 where oi.id = transfers.order_item_id and app.is_org_admin_of(o.org_id)));

-- 3) Drop the drifted legacy helper family (all confirmed zero-reference).
drop function if exists public.fn_is_org_member(uuid);
drop function if exists app.is_org_member(uuid);
drop function if exists app.is_org_member(uuid, app_role[]);
drop function if exists app.is_org_member(uuid, text[]);
drop function if exists public.is_org_member(uuid, uuid);
drop function if exists app.is_org_member_roles(uuid, text[]);
drop function if exists app.is_org_member_text(uuid, text[]);
drop function if exists app.is_event_staff(uuid, app_role[]);
drop function if exists app.is_event_staff(uuid, text[]);
drop function if exists public.is_event_staff(uuid, uuid);
drop function if exists app.is_event_staff_roles(uuid, text[]);
drop function if exists app.is_event_staff_text(uuid, text[]);
drop function if exists app.is_event_staff_v2(uuid, app_role[]);
drop function if exists app.role_in_membership(uuid, uuid, text[]);
drop function if exists app.role_in_event_staff(uuid, uuid, text[]);
drop function if exists app.current_user_id();
drop function if exists public.fn_current_user_id();
drop function if exists public.current_user_uid();
drop function if exists public.is_super_admin(uuid);
drop function if exists public.is_global_admin(uuid);
drop function if exists public.is_org_admin(uuid);
drop function if exists public.is_org_admin(uuid, uuid);
drop function if exists public.is_admin();
drop function if exists public.is_order_item_org_member(uuid);
drop function if exists public.is_order_item_buyer(uuid);

commit;
