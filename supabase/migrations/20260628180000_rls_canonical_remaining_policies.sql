-- TICK-278 (S13) Batch 4a — rewrite the last policies that still name a legacy
-- helper onto the canonical app.* family, so the legacy helpers can be dropped
-- in Batch 4b.
--
-- Tables: scans, transfers, waitlists, jobs, venues ({dashboard_user}),
-- ticket_types ({dashboard_user}).
--
-- Self-ownership policies elsewhere already use the InitPlan-friendly
-- (select auth.uid()) = user_id form (the CLAUDE.md-recommended pattern) and are
-- left as-is — they name no helper and do not block the drop.
--
-- The {dashboard_user} policies are rewritten onto app.* as well; the app.* RLS
-- predicate family is granted EXECUTE to dashboard_user so those policies evaluate.

begin;

-- Let the Studio role evaluate the canonical predicates used below.
grant execute on function
  app.uid(), app.is_platform_admin(), app.org_has_role(uuid, app_role[]),
  app.is_org_member_of(uuid), app.is_org_owner(uuid), app.is_org_admin_of(uuid),
  app.is_org_manager(uuid), app.is_org_finance_viewer(uuid),
  app.is_event_staff_of(uuid, app_role[])
to dashboard_user;

-- ── scans ────────────────────────────────────────────────────────────────────
drop policy if exists scans_insert_consolidated_authenticated on public.scans;
create policy scans_insert on public.scans
  for insert to authenticated
  with check (
    app.is_event_staff_of(event_id, array['organizer_admin','organizer_staff','scanner','organizer_scanner']::app_role[])
    or exists (select 1 from public.events e where e.id = scans.event_id and app.is_org_admin_of(e.org_id))
  );

drop policy if exists scans_select_consolidated on public.scans;
create policy scans_select on public.scans
  for select to authenticated
  using (
    app.is_event_staff_of(event_id, null::app_role[])
    or exists (select 1 from public.events e where e.id = scans.event_id and app.is_org_member_of(e.org_id))
  );

-- ── transfers ────────────────────────────────────────────────────────────────
drop policy if exists transfers_select_consolidated_authenticated on public.transfers;
create policy transfers_select on public.transfers
  for select to authenticated
  using (
    (from_user_id = app.uid()) or (to_user_id = app.uid())
    or exists (select 1 from public.order_items oi join public.orders o on oi.order_id = o.id
               where oi.id = transfers.order_item_id and app.is_org_admin_of(o.org_id))
    or exists (select 1 from public.order_items oi
               join public.ticket_types tt on tt.id = oi.ticket_type_id
               join public.events e on e.id = tt.event_id
               where oi.id = transfers.order_item_id
                 and app.is_event_staff_of(e.id, array['organizer_admin','organizer_staff']::app_role[]))
  );

-- ── waitlists ────────────────────────────────────────────────────────────────
drop policy if exists waitlists_select on public.waitlists;
create policy waitlists_select on public.waitlists
  for select to authenticated
  using (
    (user_id = app.uid())
    or exists (select 1 from public.events e where e.id = waitlists.event_id and app.is_event_staff_of(e.id, array['organizer_admin','organizer_staff']::app_role[]))
  );

drop policy if exists waitlists_insert on public.waitlists;
create policy waitlists_insert on public.waitlists
  for insert to authenticated
  with check (
    (status = 'active')
    or ((app.uid() is not null) and (
      (user_id = app.uid())
      or exists (select 1 from public.events e where e.id = waitlists.event_id and app.is_event_staff_of(e.id, array['organizer_admin','organizer_staff']::app_role[]))
    ))
  );

drop policy if exists waitlists_update on public.waitlists;
create policy waitlists_update on public.waitlists
  for update to authenticated
  using (
    (user_id = app.uid())
    or exists (select 1 from public.events e where e.id = waitlists.event_id and app.is_event_staff_of(e.id, array['organizer_admin','organizer_staff']::app_role[]))
  )
  with check (
    (user_id = app.uid())
    or exists (select 1 from public.events e where e.id = waitlists.event_id and app.is_event_staff_of(e.id, array['organizer_admin','organizer_staff']::app_role[]))
  );

drop policy if exists waitlists_delete on public.waitlists;
create policy waitlists_delete on public.waitlists
  for delete to authenticated
  using (
    (user_id = app.uid())
    or exists (select 1 from public.events e where e.id = waitlists.event_id and app.is_event_staff_of(e.id, array['organizer_admin','organizer_staff']::app_role[]))
  );

-- ── jobs ─────────────────────────────────────────────────────────────────────
drop policy if exists jobs_org_read on public.jobs;
create policy jobs_org_read on public.jobs
  for select to authenticated
  using (exists (select 1 from public.org_members m where m.user_id = app.uid()));

-- ── venues ({dashboard_user}) ────────────────────────────────────────────────
drop policy if exists venues_dashboard_user_select on public.venues;
create policy venues_dashboard_user_select on public.venues
  for select to dashboard_user
  using (
    app.is_org_manager(org_id)
    or exists (select 1 from public.events e where e.venue_id = venues.id and fn_event_is_public_now(e.id))
  );

-- ── ticket_types ({dashboard_user}) ──────────────────────────────────────────
drop policy if exists dashboard_user_update_ticket_types on public.ticket_types;
create policy dashboard_user_update_ticket_types on public.ticket_types
  for update to dashboard_user
  using (exists (select 1 from public.events e where e.id = ticket_types.event_id and app.is_org_manager(e.org_id)))
  with check (exists (select 1 from public.events e where e.id = ticket_types.event_id and app.is_org_manager(e.org_id)));

commit;
