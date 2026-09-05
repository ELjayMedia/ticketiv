-- TICK-278 (S13) Batch 1 — rewrite money-table RLS onto the canonical app.* helpers.
--
-- Tables: payouts, payout_accounts, ledger_entries, orders, payments, refunds,
-- pricing_plans, org_metrics_daily.
--
-- Goals for this batch:
--   1. Replace drifted predicates (dead auth.jwt()->>'org_id', fn_is_org_member,
--      app.is_org_member*, fn_current_user_id, raw auth.uid) with the app.* family.
--   2. Collapse stacked/overlapping permissive policies into one per (table, cmd).
--   3. Apply the approved authorization matrix (latent-bug fixes are intentional):
--        - ledger_entries  SELECT  -> finance viewer (was already finance viewer; canonicalized)
--        - orders          R/W     -> buyer OR org manager (drops blanket "any member")
--        - payments        SELECT  -> order buyer only (canonicalized uid)
--        - refunds         SELECT  -> finance viewer (tightened from "any member")
--        - refunds         DELETE  -> org admin (owner+admin)
--        - refunds         INSERT  -> initiated_by self/null (canonicalized)
--        - payouts         DELETE  -> org admin (FIX: fn_is_org_member excluded owners)
--        - payout_accounts write   -> org admin;  read -> org admin OR finance viewer
--                                     (FIX: dead jwt org_id predicate)
--        - pricing_plans   SELECT  -> any member; write -> org admin
--                                     (FIX: dead jwt + "any member can write")
--        - org_metrics     SELECT  -> any member; write -> org admin
--                                     (FIX: dead jwt predicate, was broken for everyone)
--
-- Mutations on these tables still flow through SECURITY DEFINER RPCs; these policies
-- are the read/guard floor, not the write path.

begin;

-- ── ledger_entries ─────────────────────────────────────────────────────────
drop policy if exists ledger_org_read on public.ledger_entries;
create policy ledger_entries_select on public.ledger_entries
  for select to authenticated
  using (app.is_org_finance_viewer(org_id));

-- ── orders ─────────────────────────────────────────────────────────────────
drop policy if exists orders_select_authenticated_merged on public.orders;
create policy orders_select on public.orders
  for select to authenticated
  using (buyer_id = app.uid() or app.is_org_manager(org_id));

drop policy if exists orders_update_authenticated_merged on public.orders;
create policy orders_update on public.orders
  for update to authenticated
  using (buyer_id = app.uid() or app.is_org_manager(org_id))
  with check (buyer_id = app.uid() or app.is_org_manager(org_id));

drop policy if exists consolidated_orders_delete_authenticated_v2 on public.orders;
create policy orders_delete on public.orders
  for delete to authenticated
  using (
    app.is_org_manager(org_id)
    or (buyer_id = app.uid() and status = 'pending'::order_status)
  );

drop policy if exists consolidated_orders_insert_authenticated_v2 on public.orders;
create policy orders_insert on public.orders
  for insert to authenticated
  with check (buyer_id = app.uid() or app.is_org_manager(org_id));

-- Guest (anon) checkout keeps its own self-insert path; canonicalize the uid.
drop policy if exists "buyer-insert-orders" on public.orders;
create policy orders_insert_guest on public.orders
  for insert to anon
  with check (buyer_id = app.uid());

-- ── payments ───────────────────────────────────────────────────────────────
drop policy if exists payments_select_authenticated_merged on public.payments;
create policy payments_select on public.payments
  for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = payments.order_id
        and o.buyer_id = app.uid()
    )
  );

-- ── refunds ────────────────────────────────────────────────────────────────
drop policy if exists refunds_select_authenticated_merged on public.refunds;
create policy refunds_select on public.refunds
  for select to authenticated
  using (
    exists (
      select 1 from public.payments py
      join public.orders o on o.id = py.order_id
      where py.id = refunds.payment_id
        and app.is_org_finance_viewer(o.org_id)
    )
  );

drop policy if exists refunds_delete_staff_or_admin on public.refunds;
create policy refunds_delete on public.refunds
  for delete to authenticated
  using (
    exists (
      select 1 from public.payments py
      join public.orders o on o.id = py.order_id
      where py.id = refunds.payment_id
        and app.is_org_admin_of(o.org_id)
    )
  );

drop policy if exists refunds_insert_initiator on public.refunds;
create policy refunds_insert on public.refunds
  for insert to authenticated
  with check (initiated_by is null or initiated_by = app.uid());

-- ── payouts ────────────────────────────────────────────────────────────────
-- FIX: fn_is_org_member(org_id) granted admin+staff but excluded owners.
drop policy if exists payouts_delete_authenticated on public.payouts;
create policy payouts_delete on public.payouts
  for delete to authenticated
  using (app.is_org_admin_of(org_id));

-- ── payout_accounts ────────────────────────────────────────────────────────
-- FIX: all three R/W policies used a dead auth.jwt()->>'org_id' predicate.
drop policy if exists payout_accounts_org_rw_select on public.payout_accounts;
create policy payout_accounts_select on public.payout_accounts
  for select to authenticated
  using (app.is_org_admin_of(org_id) or app.is_org_finance_viewer(org_id));

drop policy if exists payout_accounts_org_rw_insert on public.payout_accounts;
create policy payout_accounts_insert on public.payout_accounts
  for insert to authenticated
  with check (app.is_org_admin_of(org_id));

drop policy if exists payout_accounts_org_rw_update on public.payout_accounts;
create policy payout_accounts_update on public.payout_accounts
  for update to authenticated
  using (app.is_org_admin_of(org_id))
  with check (app.is_org_admin_of(org_id));

drop policy if exists payout_accounts_org_delete on public.payout_accounts;
create policy payout_accounts_delete on public.payout_accounts
  for delete to authenticated
  using (app.is_org_admin_of(org_id));

-- ── pricing_plans ──────────────────────────────────────────────────────────
-- FIX: dead jwt predicate + "any member can write". Reads = any member, writes = admin.
drop policy if exists pricing_plans_select_org on public.pricing_plans;
create policy pricing_plans_select on public.pricing_plans
  for select to authenticated
  using (app.is_org_member_of(org_id));

drop policy if exists pricing_plans_insert_org on public.pricing_plans;
create policy pricing_plans_insert on public.pricing_plans
  for insert to authenticated
  with check (app.is_org_admin_of(org_id));

drop policy if exists pricing_plans_update_org on public.pricing_plans;
create policy pricing_plans_update on public.pricing_plans
  for update to authenticated
  using (app.is_org_admin_of(org_id))
  with check (app.is_org_admin_of(org_id));

drop policy if exists pricing_plans_delete_org on public.pricing_plans;
create policy pricing_plans_delete on public.pricing_plans
  for delete to authenticated
  using (app.is_org_admin_of(org_id));

-- ── org_metrics_daily ──────────────────────────────────────────────────────
-- FIX: every policy used the dead jwt predicate (broken for all callers).
drop policy if exists org_read on public.org_metrics_daily;
create policy org_metrics_select on public.org_metrics_daily
  for select to authenticated
  using (app.is_org_member_of(org_id));

drop policy if exists org_insert on public.org_metrics_daily;
create policy org_metrics_insert on public.org_metrics_daily
  for insert to authenticated
  with check (app.is_org_admin_of(org_id));

drop policy if exists org_update on public.org_metrics_daily;
create policy org_metrics_update on public.org_metrics_daily
  for update to authenticated
  using (app.is_org_admin_of(org_id))
  with check (app.is_org_admin_of(org_id));

drop policy if exists org_metrics_delete_authenticated on public.org_metrics_daily;
create policy org_metrics_delete on public.org_metrics_daily
  for delete to authenticated
  using (app.is_org_admin_of(org_id));

commit;
