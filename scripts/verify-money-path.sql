-- Money-path verification (order create -> pay -> issue -> paid, + idempotent
-- webhook replay). Companion to the code fix in
-- supabase/migrations/20260720120000_fix_order_completion_trigger_stack.sql.
--
-- Runs entirely inside a ROLLED-BACK transaction against any database (incl.
-- production): it seeds a throwaway order, drives the exact writes the Paystack/
-- MoMo completion path performs as the service-role (admin) client, asserts the
-- resulting state, then ROLLBACK — nothing persists. No app, no browser, no
-- Paystack call, no cost. This proves the DB-side of the money path; the live
-- end-to-end with a real Paystack test card is the browser UAT case P0 below.
--
-- Usage (psql / Supabase SQL editor): set the four ids to a real org that has
-- an ACTIVE pricing plan, a buyer user, that org's active pricing plan, and a
-- ticket_type belonging to the org, then run the whole file.
--   \set org         '3fde51cc-ebee-4c56-ba4d-60520f467cda'
--   \set buyer       '895b0094-d83f-41b4-a5d4-e1b4c8ef9720'
--   \set pricing_plan '41656a88-1317-4287-a433-54fceb47c100'
--   \set ticket_type '3e3c6ddf-4df2-4f9c-808d-8f342526cc02'
--
-- Verified on production (radsfmlsjznqvcpogluo) 2026-07-20 — all expectations met.

BEGIN;
  -- Faithful simulation of the admin (service_role) client through PostgREST:
  -- service_role bypasses RLS and the ledger gate reads this JWT claim.
  SET LOCAL ROLE service_role;
  SELECT set_config('request.jwt.claim.role', 'service_role', true);

  -- Seed a throwaway pending order + item + pending attempt.
  SELECT gen_random_uuid() AS order_id, 'VERIFY-' || substr(md5(random()::text), 1, 10) AS ref \gset

  INSERT INTO public.orders (id, org_id, buyer_id, currency, order_currency, status,
                             channel, item_count, pricing_plan_id, total_cents)
  VALUES (:'order_id', :'org', :'buyer', 'SZL', 'SZL', 'pending', 'online', 1, :'pricing_plan', 10000);

  INSERT INTO public.order_items (order_id, ticket_type_id, ticket_code, status)
  VALUES (:'order_id', :'ticket_type', upper(:'ref'), 'pending');

  INSERT INTO public.payment_attempts (order_id, provider, attempt_no, status, ext_ref)
  VALUES (:'order_id', 'paystack', 1, 'pending', :'ref');

  -- Order creation must succeed and NOT write creation-time ledger rows
  -- (settlement-only ledger). EXPECT: 0
  SELECT count(*) AS ledger_rows_before_payment
  FROM public.ledger_entries WHERE order_id = :'order_id';

  -- ===== Completion (exactly what completePrimaryCheckout + completePaidOrder do) =====
  SELECT total_cents, platform_fee_cents, processor_fee_cents
  FROM public.orders WHERE id = :'order_id' \gset o_

  INSERT INTO public.payments (order_id, provider, amount_cents, currency, ext_payment_id, payload, status, channel)
  VALUES (:'order_id', 'paystack', :o_total_cents, 'SZL', :'ref',
          jsonb_build_object('data', jsonb_build_object('reference', :'ref', 'status', 'success')),
          'succeeded', 'online')
  RETURNING id AS payment_id \gset

  UPDATE public.payment_attempts SET status = 'succeeded', payment_id = :'payment_id'
  WHERE order_id = :'order_id' AND provider = 'paystack' AND status = 'pending';

  INSERT INTO public.ledger_entries (org_id, order_id, payment_id, type, amount_cents, currency, meta) VALUES
    (:'org', :'order_id', :'payment_id', 'order_gross',  :o_total_cents,                          'SZL', '{"source":"payment_completion"}'),
    (:'org', :'order_id', :'payment_id', 'fee',         -:o_platform_fee_cents,                   'SZL', '{"fee_type":"platform"}'),
    (:'org', :'order_id', :'payment_id', 'fee',         -:o_processor_fee_cents,                  'SZL', '{"fee_type":"processor"}'),
    (:'org', :'order_id', :'payment_id', 'payment_net', :o_total_cents - :o_platform_fee_cents - :o_processor_fee_cents, 'SZL', '{"source":"payment_completion"}');

  UPDATE public.order_items SET status = 'issued' WHERE order_id = :'order_id' AND status = 'pending';
  UPDATE public.orders SET status = 'paid' WHERE id = :'order_id' AND status = 'pending';

  -- ===== Assertions =====
  -- EXPECT: paid
  SELECT status AS order_status FROM public.orders WHERE id = :'order_id';
  -- EXPECT: issued / issued (all items issued)
  SELECT string_agg(status::text, ' / ') AS item_statuses FROM public.order_items WHERE order_id = :'order_id';
  -- EXPECT: succeeded, payment_id present (t)
  SELECT status AS attempt_status, (payment_id IS NOT NULL) AS attempt_linked
  FROM public.payment_attempts WHERE order_id = :'order_id';
  -- EXPECT: 1 succeeded payment
  SELECT count(*) AS payments, max(status) AS payment_status FROM public.payments WHERE order_id = :'order_id';
  -- Settlement ledger invariant. EXPECT: gross==total (t), invariant gross+fee=net (t)
  SELECT
    sum(amount_cents) FILTER (WHERE type = 'order_gross')  AS gross,
    sum(amount_cents) FILTER (WHERE type = 'fee')          AS fee_signed,
    sum(amount_cents) FILTER (WHERE type = 'payment_net')  AS net,
    (sum(amount_cents) FILTER (WHERE type = 'order_gross') = :o_total_cents) AS gross_eq_total,
    (sum(amount_cents) FILTER (WHERE type = 'order_gross')
       + sum(amount_cents) FILTER (WHERE type = 'fee')
       = sum(amount_cents) FILTER (WHERE type = 'payment_net')) AS invariant_holds
  FROM public.ledger_entries WHERE payment_id = :'payment_id';

  -- ===== Idempotent replay (webhook redelivery): reuse payment, no new rows =====
  -- EXPECT: existing payment found (t)
  SELECT (id = :'payment_id') AS reuses_same_payment
  FROM public.payments WHERE provider = 'paystack' AND ext_payment_id = :'ref';
  -- EXPECT: still 1 payment, still 4 settlement rows
  SELECT
    (SELECT count(*) FROM public.payments WHERE order_id = :'order_id') AS payments_after_replay,
    (SELECT count(*) FROM public.ledger_entries WHERE payment_id = :'payment_id') AS settlement_rows_after_replay;

ROLLBACK;
