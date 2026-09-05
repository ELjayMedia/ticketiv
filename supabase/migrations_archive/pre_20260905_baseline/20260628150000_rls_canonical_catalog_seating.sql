-- TICK-278 (S13) Batch 2b — catalog & seating RLS onto the canonical app.* helpers.
--
-- Tables: ticket_types, price_rules, price_rule_redemptions, seat_maps, seats,
-- seat_holds, seat_reservations, devices, device_sessions.
--
-- Canonical tiers (per approved matrix):
--   - internal config reads = org manager (owner+admin+staff), plus event-staff
--     (door/scanner) where present; public/anon published reads preserved.
--   - reservations are user-owned (self) with event-staff visibility.
--
-- Latent-bug fixes (intentional): fn_is_org_member / app.is_org_member(admin,staff)
-- excluded owners on devices, price_rules, seat_maps, seats, device_sessions,
-- price_rule_redemptions reads/writes -> manager (adds owner). uid predicates
-- (fn_current_user_id / auth.uid) canonicalized to app.uid().
--
-- price_rules DELETE: collapsed a 4-way OR (event-staff + membership + org-member
-- variants) to org manager via the row's org_id. Mutations otherwise flow through
-- SECURITY DEFINER RPCs.
--
-- Out of scope (left untouched): {dashboard_user} ticket_types policies, the
-- ticket_types anon public-sale policy, can_update_ticket_types_by_user (event
-- permission helper), and event-visibility helpers.

begin;

-- ── devices / device_sessions ────────────────────────────────────────────────
drop policy if exists devices_select_authenticated_merged on public.devices;
create policy devices_select on public.devices
  for select to authenticated
  using (app.is_org_manager(org_id));

drop policy if exists staff_read_device_sessions on public.device_sessions;
create policy device_sessions_select on public.device_sessions
  for select to authenticated
  using (exists (select 1 from public.devices d where d.id = device_sessions.device_id and app.is_org_manager(d.org_id)));

-- ── price_rules / price_rule_redemptions ─────────────────────────────────────
drop policy if exists staff_read_price_rules on public.price_rules;
create policy price_rules_select on public.price_rules
  for select to authenticated
  using (app.is_org_manager(org_id));

drop policy if exists price_rules_delete_consolidated on public.price_rules;
create policy price_rules_delete on public.price_rules
  for delete to authenticated
  using (app.is_org_manager(org_id));

drop policy if exists staff_read_redemptions on public.price_rule_redemptions;
create policy price_rule_redemptions_select on public.price_rule_redemptions
  for select to authenticated
  using (exists (select 1 from public.price_rules pr where pr.id = price_rule_redemptions.price_rule_id and app.is_org_manager(pr.org_id)));

-- ── ticket_types (only the authenticated read consolidates here) ──────────────
drop policy if exists ticket_types_read_consolidated on public.ticket_types;
create policy ticket_types_read_consolidated on public.ticket_types
  for select to authenticated
  using (
    app.is_event_public_now(event_id)
    or app.is_event_staff_of(event_id, null::app_role[])
    or exists (select 1 from public.events e where e.id = ticket_types.event_id and app.is_org_manager(e.org_id))
  );

-- ── seat_maps ────────────────────────────────────────────────────────────────
drop policy if exists seat_maps_select_consolidated_authenticated on public.seat_maps;
create policy seat_maps_select on public.seat_maps
  for select to authenticated
  using (exists (
    select 1 from public.events e
    where e.id = seat_maps.event_id
      and (app.is_org_manager(e.org_id) or app.is_event_staff_of(e.id, array['organizer_admin','organizer_staff']::app_role[]))
  ));

drop policy if exists seat_maps_update_authenticated on public.seat_maps;
create policy seat_maps_update on public.seat_maps
  for update to authenticated
  using (exists (
    select 1 from public.events e
    where e.id = seat_maps.event_id
      and (app.is_org_manager(e.org_id) or app.is_event_staff_of(e.id, array['organizer_admin','organizer_staff']::app_role[]))
  ))
  with check (exists (
    select 1 from public.events e
    where e.id = seat_maps.event_id
      and (app.is_org_manager(e.org_id) or app.is_event_staff_of(e.id, array['organizer_admin','organizer_staff']::app_role[]))
  ));

-- ── seats ────────────────────────────────────────────────────────────────────
drop policy if exists seats_read_authenticated_merged on public.seats;
create policy seats_select on public.seats
  for select to authenticated
  using (exists (
    select 1 from public.seat_maps sm join public.events e on e.id = sm.event_id
    where sm.id = seats.seat_map_id
      and (app.is_org_manager(e.org_id) or app.is_event_staff_of(e.id, array['organizer_admin','organizer_staff']::app_role[]))
  ));

drop policy if exists seats_update_authenticated on public.seats;
create policy seats_update on public.seats
  for update to authenticated
  using (exists (
    select 1 from public.seat_maps sm join public.events e on e.id = sm.event_id
    where sm.id = seats.seat_map_id
      and (app.is_org_manager(e.org_id) or app.is_event_staff_of(e.id, array['organizer_admin','organizer_staff']::app_role[]))
  ))
  with check (exists (
    select 1 from public.seat_maps sm join public.events e on e.id = sm.event_id
    where sm.id = seats.seat_map_id
      and (app.is_org_manager(e.org_id) or app.is_event_staff_of(e.id, array['organizer_admin','organizer_staff']::app_role[]))
  ));

-- ── seat_holds ───────────────────────────────────────────────────────────────
drop policy if exists seat_holds_delete_public_merged on public.seat_holds;
create policy seat_holds_delete on public.seat_holds
  for delete to public
  using (exists (select 1 from public.events e where e.id = seat_holds.event_id and app.is_org_manager(e.org_id)));

-- ── seat_reservations (user-owned + event-staff visibility) ───────────────────
drop policy if exists seat_reservations_delete on public.seat_reservations;
create policy seat_reservations_delete on public.seat_reservations
  for delete to authenticated
  using (user_id = app.uid());

drop policy if exists seat_reservations_rw_public_merged_insert on public.seat_reservations;
create policy seat_reservations_insert on public.seat_reservations
  for insert to authenticated
  with check (user_id = app.uid());

drop policy if exists seat_reservations_select_authenticated on public.seat_reservations;
create policy seat_reservations_select_authenticated on public.seat_reservations
  for select to authenticated
  using (
    user_id = app.uid()
    or exists (select 1 from public.events e where e.id = seat_reservations.event_id and app.is_event_staff_of(e.id, array['organizer_admin','organizer_staff']::app_role[]))
  );

drop policy if exists seat_reservations_select_public on public.seat_reservations;
create policy seat_reservations_select_anon on public.seat_reservations
  for select to anon
  using (
    user_id = app.uid()
    or exists (select 1 from public.events e where e.id = seat_reservations.event_id and app.is_event_staff_of(e.id, array['organizer_admin','organizer_staff']::app_role[]))
  );

drop policy if exists seat_reservations_update on public.seat_reservations;
create policy seat_reservations_update on public.seat_reservations
  for update to authenticated
  using (user_id = app.uid())
  with check (user_id = app.uid());

commit;
