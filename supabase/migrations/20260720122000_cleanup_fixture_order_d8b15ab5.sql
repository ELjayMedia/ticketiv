-- Remove the corrupt test-fixture order surfaced during money-path verification.
--
-- Order d8b15ab5-8812-4c6f-89dc-b7c42fb19d07 (ticket_code TST-001) was a
-- hand-seeded fixture in an impossible state: status = 'pending' while its one
-- order_item was 'issued' AND carried a checked_in_at, yet there was no payment
-- and no payment_attempt. It also had a stale fee split (order column
-- processor_fee_cents = 200 computed on subtotal, vs a creation-time ledger
-- fee of 215 computed on subtotal+platform). It has no dependent rows
-- (verified: 0 scans, transfers, refund_items, resale_listings, adjustments,
-- payments or payment_attempts), so it can be removed cleanly. Leaving it would
-- surface as a false discrepancy in reconciliation and finance reporting.
--
-- The processor-fee basis divergence itself (app.recompute_order_totals vs
-- fn_apply_pricing_to_order) is a pricing decision tracked as a follow-up; the
-- creation-time ledger rows are removed by the settlement-only-ledger migration.

delete from public.ledger_entries where order_id = 'd8b15ab5-8812-4c6f-89dc-b7c42fb19d07';
delete from public.order_items   where order_id = 'd8b15ab5-8812-4c6f-89dc-b7c42fb19d07';
delete from public.orders        where id       = 'd8b15ab5-8812-4c6f-89dc-b7c42fb19d07';
