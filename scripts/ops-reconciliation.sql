-- Money & data-integrity reconciliation.
--
-- READ-ONLY. Every query returns the OFFENDING rows; an empty result means that
-- check is healthy. Run against any environment (Supabase SQL editor / psql) as
-- a pre-real-money gate, a periodic finance reconciliation, or the source of the
-- alert conditions the ops-alerts cron does not yet cover (inconsistent order
-- states, payout over-draw, dead-letter webhooks). Complements
-- scripts/verify-money-path.sql (which proves the happy path end-to-end) and the
-- ops-alerts endpoint (payment success-rate / webhook lag / health).
--
-- Ledger conventions (settlement rows carry a payment_id):
--   order_gross = total charged   fee = negative deductions   payment_net = org net
--   invariant per payment:  sum(order_gross) + sum(fee) = sum(payment_net)

\echo '== 1. Succeeded payment but its order is not paid (completion stalled) =='
SELECT p.id AS payment_id, p.order_id, p.status AS payment_status, o.status AS order_status
FROM public.payments p JOIN public.orders o ON o.id = p.order_id
WHERE p.status = 'succeeded' AND o.status <> 'paid';

\echo '== 2. Paid order with NO settlement ledger (money moved, no ledger) =='
SELECT o.id AS order_id, o.org_id, o.total_cents
FROM public.orders o
WHERE o.status = 'paid'
  AND NOT EXISTS (
    SELECT 1 FROM public.ledger_entries le
    WHERE le.order_id = o.id AND le.payment_id IS NOT NULL AND le.type = 'order_gross');

\echo '== 3. Settlement ledger invariant broken (gross + fee <> net) per payment =='
SELECT payment_id,
       sum(amount_cents) FILTER (WHERE type='order_gross')  AS gross,
       sum(amount_cents) FILTER (WHERE type='fee')          AS fee_signed,
       sum(amount_cents) FILTER (WHERE type='payment_net')  AS net
FROM public.ledger_entries
WHERE payment_id IS NOT NULL
GROUP BY payment_id
HAVING coalesce(sum(amount_cents) FILTER (WHERE type='order_gross'),0)
     + coalesce(sum(amount_cents) FILTER (WHERE type='fee'),0)
    <> coalesce(sum(amount_cents) FILTER (WHERE type='payment_net'),0);

\echo '== 4. Paid order with items still pending (tickets not issued) =='
SELECT o.id AS order_id, count(*) AS pending_items
FROM public.orders o JOIN public.order_items oi ON oi.order_id = o.id
WHERE o.status = 'paid' AND oi.status = 'pending'
GROUP BY o.id;

\echo '== 5. Duplicate succeeded payments for one order (double charge / double complete) =='
SELECT order_id, count(*) AS succeeded_payments
FROM public.payments WHERE status = 'succeeded'
GROUP BY order_id HAVING count(*) > 1;

\echo '== 6. Processed refund with no refund ledger row =='
SELECT r.id AS refund_id, r.payment_id, r.amount_cents
FROM public.refunds r
WHERE r.status = 'processed'
  AND NOT EXISTS (
    SELECT 1 FROM public.ledger_entries le
    WHERE le.payment_id = r.payment_id AND le.type = 'refund');

\echo '== 7. Org has committed payouts exceeding settled-net minus refunds (over-draw) =='
WITH settled AS (
  SELECT org_id,
         coalesce(sum(amount_cents) FILTER (WHERE type='payment_net'),0) AS net,
         coalesce(sum(amount_cents) FILTER (WHERE type='refund'),0)      AS refunds
  FROM public.ledger_entries GROUP BY org_id),
committed AS (
  SELECT org_id, coalesce(sum(amount_cents) FILTER (WHERE status IN ('requested','processing','paid')),0) AS payouts
  FROM public.payouts GROUP BY org_id)
SELECT s.org_id, s.net, s.refunds, c.payouts,
       (s.net - s.refunds - c.payouts) AS available_after
FROM settled s JOIN committed c ON c.org_id = s.org_id
WHERE c.payouts > (s.net - s.refunds);

\echo '== 8. Dead-letter webhooks: received but never processed (stuck > 15 min) =='
SELECT id, provider, provider_event_id, received_at
FROM public.webhooks
WHERE processed_at IS NULL AND received_at < now() - interval '15 minutes'
ORDER BY received_at;

\echo '== 9. Pending order older than 2h that already has a succeeded payment =='
SELECT o.id AS order_id, o.created_at, p.id AS payment_id
FROM public.orders o JOIN public.payments p ON p.order_id = o.id
WHERE o.status = 'pending' AND p.status = 'succeeded'
  AND o.created_at < now() - interval '2 hours';

\echo '== 10. Checked-in / issued ticket on an order that is not paid =='
SELECT oi.id AS order_item_id, oi.order_id, oi.status AS item_status, o.status AS order_status
FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id
WHERE oi.status IN ('issued','transferred','checked_in') AND o.status <> 'paid';

\echo '== 11. Regression guard: creation-time ledger pollution (must be 0) =='
SELECT count(*) AS creation_time_ledger_rows
FROM public.ledger_entries
WHERE payment_id IS NULL AND type IN ('order_gross','fee');
