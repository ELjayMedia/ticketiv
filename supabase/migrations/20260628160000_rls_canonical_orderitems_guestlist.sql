-- TICK-278 (S13) Batch 2c — order_items & guestlist RLS onto canonical app.* helpers.
--
-- Tables: order_items, guestlist_entries, guestlist_fulfillments.
--
-- Tiers: order_items mirror orders (Batch 1) — buyer/ticket-owner self OR org
-- manager OR event staff; guestlist is event-staff operated with creator self-access.
--
-- Latent-bug fixes (intentional):
--   *** guestlist_fulfillments DELETE contained "... OR true OR ..." — i.e. ANY
--       caller (including anon) could delete fulfillment rows. Replaced with
--       event admin/staff via the linked guestlist entry, and narrowed from
--       {public} to {authenticated}. ***
--   - order_items reads dropped the blanket "any org member" path (app.role_in_
--     membership NULL) -> org manager, matching the Batch 1 orders tightening.
--   - uid predicates (fn_current_user_id / app.current_user_id / auth.uid)
--     canonicalized to app.uid().
--
-- Left untouched (event-permission helpers): app.can_manage_guestlist_entry,
-- app.can_update_guestlist_entry.

begin;

-- ── order_items ──────────────────────────────────────────────────────────────
drop policy if exists order_items_select_consolidated_authenticated on public.order_items;
create policy order_items_select_authenticated on public.order_items
  for select to authenticated
  using (
    (current_owner_id = app.uid())
    or exists (select 1 from public.orders o where o.id = order_items.order_id and (o.buyer_id = app.uid() or app.is_org_manager(o.org_id)))
    or exists (select 1 from public.ticket_types tt join public.events e on e.id = tt.event_id
               where tt.id = order_items.ticket_type_id and app.is_event_staff_of(e.id, null::app_role[]))
  );

drop policy if exists order_items_select_consolidated_anon on public.order_items;
create policy order_items_select_anon on public.order_items
  for select to anon
  using (exists (select 1 from public.orders o where o.id = order_items.order_id and o.buyer_id = app.uid()));

drop policy if exists order_items_update_status on public.order_items;
create policy order_items_update_status on public.order_items
  for update to authenticated
  using (
    exists (select 1 from public.ticket_types tt join public.events e on e.id = tt.event_id
            where tt.id = order_items.ticket_type_id
              and app.is_event_staff_of(e.id, array['organizer_admin','organizer_staff','scanner']::app_role[]))
    or exists (select 1 from public.orders o where o.id = order_items.order_id and o.buyer_id = app.uid())
  )
  with check (
    exists (select 1 from public.ticket_types tt join public.events e on e.id = tt.event_id
            where tt.id = order_items.ticket_type_id
              and app.is_event_staff_of(e.id, array['organizer_admin','organizer_staff','scanner']::app_role[]))
    or exists (select 1 from public.orders o where o.id = order_items.order_id and o.buyer_id = app.uid())
  );

-- ── guestlist_entries ────────────────────────────────────────────────────────
drop policy if exists guestlist_entries_select_restrict on public.guestlist_entries;
create policy guestlist_entries_select on public.guestlist_entries
  for select to authenticated
  using ((created_by = app.uid()) or app.is_event_staff_of(event_id, null::app_role[]));

drop policy if exists guestlist_entries_delete_restrict on public.guestlist_entries;
create policy guestlist_entries_delete on public.guestlist_entries
  for delete to authenticated
  using (
    app.can_manage_guestlist_entry(event_id)
    or (created_by = app.uid())
    or exists (select 1 from public.events e where e.id = guestlist_entries.event_id and app.is_org_admin_of(e.org_id))
  );

drop policy if exists guestlist_entries_update on public.guestlist_entries;
create policy guestlist_entries_update on public.guestlist_entries
  for update to authenticated
  using (app.can_update_guestlist_entry(app.uid(), event_id, created_by))
  with check (app.can_update_guestlist_entry(app.uid(), event_id, created_by));

-- ── guestlist_fulfillments ───────────────────────────────────────────────────
drop policy if exists guestlist_fulfillments_select_consolidated on public.guestlist_fulfillments;
create policy guestlist_fulfillments_select on public.guestlist_fulfillments
  for select to authenticated
  using (exists (
    select 1 from public.guestlist_entries ge
    where ge.id = guestlist_fulfillments.guestlist_entry_id
      and ((ge.created_by = app.uid()) or app.is_event_staff_of(ge.event_id, null::app_role[]))
  ));

drop policy if exists guestlist_fulfillments_staff_insert on public.guestlist_fulfillments;
create policy guestlist_fulfillments_insert on public.guestlist_fulfillments
  for insert to authenticated
  with check (exists (
    select 1 from public.guestlist_entries ge
    where ge.id = guestlist_fulfillments.guestlist_entry_id
      and app.is_event_staff_of(ge.event_id, null::app_role[])
  ));

-- FIX: was {public} DELETE with an "OR true" clause (anyone could delete).
drop policy if exists guestlist_fulfill_delete_public_consolidated on public.guestlist_fulfillments;
create policy guestlist_fulfillments_delete on public.guestlist_fulfillments
  for delete to authenticated
  using (exists (
    select 1 from public.guestlist_entries ge
    join public.events e on e.id = ge.event_id
    where ge.id = guestlist_fulfillments.guestlist_entry_id
      and (app.is_event_staff_of(ge.event_id, array['organizer_admin','organizer_staff']::app_role[])
           or app.is_org_admin_of(e.org_id))
  ));

commit;
