-- TICK-342: Shared Supabase UAT fixture cleanup.
--
-- Ticketiv currently runs development, UAT and production against one
-- Supabase project, so UAT records are production records. This routine only
-- scopes rows that carry an explicit run marker. It is a dry-run by default.
--
-- Mark a UAT run with a lowercase id such as:
--   uat-20260727-money
--
-- Put that exact marker into fixture names/slugs/descriptions, buyer emails
-- (for example buyer+uat-20260727-money@ticketiv.app), ticket codes, Paystack
-- test references, scan notes/gates, webhook payloads, or JSON metadata.
--
-- Dry run:
--   SET ticketiv.uat_run_id = 'uat-20260727-money';
--   SET ticketiv.uat_apply = 'false';
--   \i scripts/cleanup-uat-fixtures.sql
--
-- Apply after evidence is recorded:
--   SET ticketiv.uat_run_id = 'uat-20260727-money';
--   SET ticketiv.uat_apply = 'true';
--   SET ticketiv.uat_allow_money_delete = 'true'; -- required for payments,
--                                                -- refunds, payouts, ledger
--   \i scripts/cleanup-uat-fixtures.sql
--
-- Optional:
--   SET ticketiv.uat_include_audit = 'true'; -- deletes audit rows containing
--                                           -- the marker; otherwise audit
--                                           -- rows are preserved/detached.
--   SET ticketiv.uat_max_rows = '500';      -- apply guard; default 500.
--
-- This script does not delete auth.users or profiles. Use the product account
-- deletion path for throwaway tester accounts after UAT evidence is captured.
--
-- SCOPE — this script is NOT the only UAT cleanup path:
--   * THIS script handles UAT runs that carry an explicit `uat-...` run marker
--     in their data (the convention documented above). It matches on that
--     marker, so unmarked fixtures are invisible to it.
--   * public.fn_teardown_uat_fixtures() handles the original seeded fixture set
--     created by public.fn_seed_uat_fixtures() — the two `da7a0000-...` orgs and
--     their events/orders/payments/ledger. Those rows carry no run marker, so
--     this script cannot reach them; use the teardown function instead.
-- Reach for whichever matches how the data was created. See docs/OPERATIONS.md #6.

BEGIN;

DROP TABLE IF EXISTS _uat_cleanup_config;
DROP TABLE IF EXISTS _uat_cleanup_candidates;
DROP TABLE IF EXISTS _uat_cleanup_deleted;
DROP TABLE IF EXISTS _uat_orgs;
DROP TABLE IF EXISTS _uat_events;
DROP TABLE IF EXISTS _uat_venues;
DROP TABLE IF EXISTS _uat_artists;
DROP TABLE IF EXISTS _uat_ticket_types;
DROP TABLE IF EXISTS _uat_price_rules;
DROP TABLE IF EXISTS _uat_price_rule_redemptions;
DROP TABLE IF EXISTS _uat_orders;
DROP TABLE IF EXISTS _uat_order_items;
DROP TABLE IF EXISTS _uat_payment_attempts;
DROP TABLE IF EXISTS _uat_payments;
DROP TABLE IF EXISTS _uat_refunds;
DROP TABLE IF EXISTS _uat_payouts;
DROP TABLE IF EXISTS _uat_payout_accounts;
DROP TABLE IF EXISTS _uat_ledger_entries;
DROP TABLE IF EXISTS _uat_devices;
DROP TABLE IF EXISTS _uat_device_sessions;
DROP TABLE IF EXISTS _uat_scans;
DROP TABLE IF EXISTS _uat_guestlist_entries;
DROP TABLE IF EXISTS _uat_waitlists;
DROP TABLE IF EXISTS _uat_resale_listings;
DROP TABLE IF EXISTS _uat_transfers;
DROP TABLE IF EXISTS _uat_notifications;
DROP TABLE IF EXISTS _uat_webhook_endpoints;
DROP TABLE IF EXISTS _uat_webhook_deliveries;
DROP TABLE IF EXISTS _uat_webhooks;

CREATE TEMP TABLE _uat_cleanup_config AS
SELECT
  lower(nullif(trim(current_setting('ticketiv.uat_run_id', true)), '')) AS run_id,
  lower(coalesce(nullif(trim(current_setting('ticketiv.uat_apply', true)), ''), 'false'))
    IN ('1', 'true', 't', 'yes', 'y', 'on') AS apply_cleanup,
  lower(coalesce(nullif(trim(current_setting('ticketiv.uat_allow_money_delete', true)), ''), 'false'))
    IN ('1', 'true', 't', 'yes', 'y', 'on') AS allow_money_delete,
  lower(coalesce(nullif(trim(current_setting('ticketiv.uat_include_audit', true)), ''), 'false'))
    IN ('1', 'true', 't', 'yes', 'y', 'on') AS include_audit,
  coalesce(nullif(trim(current_setting('ticketiv.uat_max_rows', true)), '')::integer, 500) AS max_rows;

DO $$
DECLARE
  v_run_id text;
  v_max_rows integer;
BEGIN
  SELECT run_id, max_rows INTO v_run_id, v_max_rows FROM _uat_cleanup_config;

  IF v_run_id IS NULL OR v_run_id !~ '^uat-[a-z0-9][a-z0-9-]{2,80}$' THEN
    RAISE EXCEPTION
      'Set ticketiv.uat_run_id to a specific lowercase marker like uat-20260727-money before running cleanup.';
  END IF;

  IF v_max_rows < 1 THEN
    RAISE EXCEPTION 'ticketiv.uat_max_rows must be at least 1.';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION pg_temp.uat_is_marked(value text, marker text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT value IS NOT NULL AND position(marker IN lower(value)) > 0;
$$;

CREATE TEMP TABLE _uat_orgs(id uuid PRIMARY KEY);
CREATE TEMP TABLE _uat_events(id uuid PRIMARY KEY);
CREATE TEMP TABLE _uat_venues(id uuid PRIMARY KEY);
CREATE TEMP TABLE _uat_artists(id uuid PRIMARY KEY);
CREATE TEMP TABLE _uat_ticket_types(id uuid PRIMARY KEY);
CREATE TEMP TABLE _uat_price_rules(id uuid PRIMARY KEY);
CREATE TEMP TABLE _uat_price_rule_redemptions(id uuid PRIMARY KEY);
CREATE TEMP TABLE _uat_orders(id uuid PRIMARY KEY);
CREATE TEMP TABLE _uat_order_items(id uuid PRIMARY KEY);
CREATE TEMP TABLE _uat_payment_attempts(id uuid PRIMARY KEY);
CREATE TEMP TABLE _uat_payments(id uuid PRIMARY KEY);
CREATE TEMP TABLE _uat_refunds(id uuid PRIMARY KEY);
CREATE TEMP TABLE _uat_payouts(id uuid PRIMARY KEY);
CREATE TEMP TABLE _uat_payout_accounts(id uuid PRIMARY KEY);
CREATE TEMP TABLE _uat_ledger_entries(id uuid PRIMARY KEY);
CREATE TEMP TABLE _uat_devices(id uuid PRIMARY KEY);
CREATE TEMP TABLE _uat_device_sessions(id uuid PRIMARY KEY);
CREATE TEMP TABLE _uat_scans(id uuid PRIMARY KEY);
CREATE TEMP TABLE _uat_guestlist_entries(id uuid PRIMARY KEY);
CREATE TEMP TABLE _uat_waitlists(id uuid PRIMARY KEY);
CREATE TEMP TABLE _uat_resale_listings(id uuid PRIMARY KEY);
CREATE TEMP TABLE _uat_transfers(id uuid PRIMARY KEY);
CREATE TEMP TABLE _uat_notifications(id uuid PRIMARY KEY);
CREATE TEMP TABLE _uat_webhook_endpoints(id uuid PRIMARY KEY);
CREATE TEMP TABLE _uat_webhook_deliveries(id uuid PRIMARY KEY);
CREATE TEMP TABLE _uat_webhooks(id uuid PRIMARY KEY);

INSERT INTO _uat_orgs
SELECT o.id
FROM public.organizations o, _uat_cleanup_config c
WHERE pg_temp.uat_is_marked(o.slug, c.run_id)
   OR pg_temp.uat_is_marked(o.name, c.run_id)
   OR pg_temp.uat_is_marked(o.bio, c.run_id)
ON CONFLICT DO NOTHING;

INSERT INTO _uat_events
SELECT e.id
FROM public.events e, _uat_cleanup_config c
WHERE e.org_id IN (SELECT id FROM _uat_orgs)
   OR pg_temp.uat_is_marked(e.slug, c.run_id)
   OR pg_temp.uat_is_marked(e.title, c.run_id)
   OR pg_temp.uat_is_marked(e.description, c.run_id)
   OR pg_temp.uat_is_marked(e.confirmation_message, c.run_id)
   OR pg_temp.uat_is_marked(e.category, c.run_id)
   OR pg_temp.uat_is_marked(e.city, c.run_id)
ON CONFLICT DO NOTHING;

INSERT INTO _uat_venues
SELECT v.id
FROM public.venues v, _uat_cleanup_config c
WHERE v.org_id IN (SELECT id FROM _uat_orgs)
   OR pg_temp.uat_is_marked(v.slug, c.run_id)
   OR pg_temp.uat_is_marked(v.name, c.run_id)
   OR pg_temp.uat_is_marked(v.address, c.run_id)
   OR pg_temp.uat_is_marked(v.city, c.run_id)
ON CONFLICT DO NOTHING;

INSERT INTO _uat_artists
SELECT a.id
FROM public.artists a, _uat_cleanup_config c
WHERE a.org_id IN (SELECT id FROM _uat_orgs)
   OR pg_temp.uat_is_marked(a.slug, c.run_id)
   OR pg_temp.uat_is_marked(a.name, c.run_id)
   OR pg_temp.uat_is_marked(a.bio, c.run_id)
ON CONFLICT DO NOTHING;

INSERT INTO _uat_ticket_types
SELECT tt.id
FROM public.ticket_types tt, _uat_cleanup_config c
WHERE tt.event_id IN (SELECT id FROM _uat_events)
   OR pg_temp.uat_is_marked(tt.name, c.run_id)
   OR pg_temp.uat_is_marked(tt.sales_pause_reason, c.run_id)
ON CONFLICT DO NOTHING;

INSERT INTO _uat_price_rules
SELECT pr.id
FROM public.price_rules pr, _uat_cleanup_config c
WHERE pr.org_id IN (SELECT id FROM _uat_orgs)
   OR pr.event_id IN (SELECT id FROM _uat_events)
   OR pr.ticket_type_id IN (SELECT id FROM _uat_ticket_types)
   OR pg_temp.uat_is_marked(pr.code, c.run_id)
ON CONFLICT DO NOTHING;

INSERT INTO _uat_order_items
SELECT oi.id
FROM public.order_items oi, _uat_cleanup_config c
WHERE oi.ticket_type_id IN (SELECT id FROM _uat_ticket_types)
   OR pg_temp.uat_is_marked(oi.ticket_code, c.run_id)
   OR pg_temp.uat_is_marked(oi.name, c.run_id)
   OR pg_temp.uat_is_marked(oi.holder_name, c.run_id)
   OR pg_temp.uat_is_marked(oi.holder_email, c.run_id)
   OR pg_temp.uat_is_marked(oi.holder_phone, c.run_id)
ON CONFLICT DO NOTHING;

INSERT INTO _uat_orders
SELECT o.id
FROM public.orders o, _uat_cleanup_config c
WHERE o.org_id IN (SELECT id FROM _uat_orgs)
   OR pg_temp.uat_is_marked(o.email, c.run_id)
   OR pg_temp.uat_is_marked(o.phone, c.run_id)
   OR pg_temp.uat_is_marked(o.buyer_email, c.run_id)
   OR pg_temp.uat_is_marked(o.buyer_phone, c.run_id)
   OR pg_temp.uat_is_marked(o.pricing_plan_snapshot::text, c.run_id)
   OR EXISTS (
        SELECT 1 FROM public.order_items oi
        WHERE oi.order_id = o.id
          AND oi.id IN (SELECT id FROM _uat_order_items)
      )
ON CONFLICT DO NOTHING;

INSERT INTO _uat_payment_attempts
SELECT pa.id
FROM public.payment_attempts pa, _uat_cleanup_config c
WHERE pa.order_id IN (SELECT id FROM _uat_orders)
   OR pg_temp.uat_is_marked(pa.ext_ref, c.run_id)
   OR pg_temp.uat_is_marked(pa.payload::text, c.run_id)
ON CONFLICT DO NOTHING;

INSERT INTO _uat_payments
SELECT p.id
FROM public.payments p, _uat_cleanup_config c
WHERE p.order_id IN (SELECT id FROM _uat_orders)
   OR pg_temp.uat_is_marked(p.ext_payment_id, c.run_id)
   OR pg_temp.uat_is_marked(p.payload::text, c.run_id)
ON CONFLICT DO NOTHING;

INSERT INTO _uat_orders
SELECT order_id FROM public.payment_attempts
WHERE id IN (SELECT id FROM _uat_payment_attempts)
ON CONFLICT DO NOTHING;

INSERT INTO _uat_orders
SELECT order_id FROM public.payments
WHERE id IN (SELECT id FROM _uat_payments)
ON CONFLICT DO NOTHING;

INSERT INTO _uat_order_items
SELECT id FROM public.order_items
WHERE order_id IN (SELECT id FROM _uat_orders)
ON CONFLICT DO NOTHING;

INSERT INTO _uat_payment_attempts
SELECT id FROM public.payment_attempts
WHERE order_id IN (SELECT id FROM _uat_orders)
   OR payment_id IN (SELECT id FROM _uat_payments)
ON CONFLICT DO NOTHING;

INSERT INTO _uat_payments
SELECT id FROM public.payments
WHERE order_id IN (SELECT id FROM _uat_orders)
ON CONFLICT DO NOTHING;

INSERT INTO _uat_refunds
SELECT r.id
FROM public.refunds r, _uat_cleanup_config c
WHERE r.payment_id IN (SELECT id FROM _uat_payments)
   OR pg_temp.uat_is_marked(r.provider_ref, c.run_id)
   OR pg_temp.uat_is_marked(r.provider_payload::text, c.run_id)
ON CONFLICT DO NOTHING;

INSERT INTO _uat_payouts
SELECT p.id
FROM public.payouts p, _uat_cleanup_config c
WHERE p.org_id IN (SELECT id FROM _uat_orgs)
   OR pg_temp.uat_is_marked(p.destination_ref, c.run_id)
ON CONFLICT DO NOTHING;

INSERT INTO _uat_payout_accounts
SELECT pa.id
FROM public.payout_accounts pa
WHERE pa.org_id IN (SELECT id FROM _uat_orgs)
ON CONFLICT DO NOTHING;

INSERT INTO _uat_ledger_entries
SELECT le.id
FROM public.ledger_entries le, _uat_cleanup_config c
WHERE le.org_id IN (SELECT id FROM _uat_orgs)
   OR le.event_id IN (SELECT id FROM _uat_events)
   OR le.order_id IN (SELECT id FROM _uat_orders)
   OR le.payment_id IN (SELECT id FROM _uat_payments)
   OR le.refund_id IN (SELECT id FROM _uat_refunds)
   OR le.payout_id IN (SELECT id FROM _uat_payouts)
   OR pg_temp.uat_is_marked(le.meta::text, c.run_id)
ON CONFLICT DO NOTHING;

INSERT INTO _uat_devices
SELECT d.id
FROM public.devices d, _uat_cleanup_config c
WHERE d.org_id IN (SELECT id FROM _uat_orgs)
   OR d.event_id IN (SELECT id FROM _uat_events)
   OR pg_temp.uat_is_marked(d.label, c.run_id)
ON CONFLICT DO NOTHING;

INSERT INTO _uat_device_sessions
SELECT ds.id
FROM public.device_sessions ds
WHERE ds.device_id IN (SELECT id FROM _uat_devices)
ON CONFLICT DO NOTHING;

INSERT INTO _uat_scans
SELECT s.id
FROM public.scans s, _uat_cleanup_config c
WHERE s.event_id IN (SELECT id FROM _uat_events)
   OR s.order_item_id IN (SELECT id FROM _uat_order_items)
   OR s.device_id IN (SELECT id FROM _uat_devices)
   OR s.device_session_id IN (SELECT id FROM _uat_device_sessions)
   OR pg_temp.uat_is_marked(s.ticket_code, c.run_id)
   OR pg_temp.uat_is_marked(s.gate, c.run_id)
   OR pg_temp.uat_is_marked(s.notes, c.run_id)
   OR pg_temp.uat_is_marked(s.request_hash, c.run_id)
ON CONFLICT DO NOTHING;

INSERT INTO _uat_guestlist_entries
SELECT ge.id
FROM public.guestlist_entries ge, _uat_cleanup_config c
WHERE ge.event_id IN (SELECT id FROM _uat_events)
   OR ge.ticket_type_id IN (SELECT id FROM _uat_ticket_types)
   OR pg_temp.uat_is_marked(ge.full_name, c.run_id)
   OR pg_temp.uat_is_marked(ge.email, c.run_id)
   OR pg_temp.uat_is_marked(ge.phone, c.run_id)
   OR pg_temp.uat_is_marked(ge.notes, c.run_id)
ON CONFLICT DO NOTHING;

INSERT INTO _uat_waitlists
SELECT w.id
FROM public.waitlists w, _uat_cleanup_config c
WHERE w.event_id IN (SELECT id FROM _uat_events)
   OR w.ticket_type_id IN (SELECT id FROM _uat_ticket_types)
   OR pg_temp.uat_is_marked(w.email, c.run_id)
   OR pg_temp.uat_is_marked(w.first_name, c.run_id)
   OR pg_temp.uat_is_marked(w.last_name, c.run_id)
ON CONFLICT DO NOTHING;

INSERT INTO _uat_resale_listings
SELECT rl.id
FROM public.resale_listings rl, _uat_cleanup_config c
WHERE rl.org_id IN (SELECT id FROM _uat_orgs)
   OR rl.order_item_id IN (SELECT id FROM _uat_order_items)
   OR pg_temp.uat_is_marked(rl.metadata::text, c.run_id)
ON CONFLICT DO NOTHING;

INSERT INTO _uat_transfers
SELECT t.id
FROM public.transfers t, _uat_cleanup_config c
WHERE t.order_item_id IN (SELECT id FROM _uat_order_items)
   OR pg_temp.uat_is_marked(t.metadata::text, c.run_id)
ON CONFLICT DO NOTHING;

INSERT INTO _uat_notifications
SELECT n.id
FROM public.notifications n, _uat_cleanup_config c
WHERE pg_temp.uat_is_marked(n.type, c.run_id)
   OR pg_temp.uat_is_marked(n.payload::text, c.run_id)
   OR pg_temp.uat_is_marked(n.status, c.run_id)
   OR pg_temp.uat_is_marked(n.last_error, c.run_id)
   OR pg_temp.uat_is_marked(n.channel, c.run_id)
   OR pg_temp.uat_is_marked(n.dedupe_key, c.run_id)
ON CONFLICT DO NOTHING;

INSERT INTO _uat_webhook_endpoints
SELECT we.id
FROM public.webhook_endpoints we, _uat_cleanup_config c
WHERE we.org_id IN (SELECT id FROM _uat_orgs)
   OR pg_temp.uat_is_marked(we.url, c.run_id)
   OR pg_temp.uat_is_marked(we.description, c.run_id)
ON CONFLICT DO NOTHING;

INSERT INTO _uat_webhook_deliveries
SELECT wd.id
FROM public.webhook_deliveries wd, _uat_cleanup_config c
WHERE wd.endpoint_id IN (SELECT id FROM _uat_webhook_endpoints)
   OR pg_temp.uat_is_marked(wd.event_type, c.run_id)
   OR pg_temp.uat_is_marked(wd.payload::text, c.run_id)
   OR pg_temp.uat_is_marked(wd.response_body, c.run_id)
ON CONFLICT DO NOTHING;

INSERT INTO _uat_webhooks
SELECT wh.id
FROM public.webhooks wh, _uat_cleanup_config c
WHERE pg_temp.uat_is_marked(wh.provider_event_id, c.run_id)
   OR pg_temp.uat_is_marked(wh.signature, c.run_id)
   OR pg_temp.uat_is_marked(wh.payload::text, c.run_id)
ON CONFLICT DO NOTHING;

INSERT INTO _uat_price_rule_redemptions
SELECT prr.id
FROM public.price_rule_redemptions prr
WHERE prr.price_rule_id IN (SELECT id FROM _uat_price_rules)
   OR prr.order_id IN (SELECT id FROM _uat_orders)
ON CONFLICT DO NOTHING;

CREATE TEMP TABLE _uat_cleanup_candidates AS
SELECT * FROM (
  VALUES
    ('organizations',          (SELECT count(*) FROM _uat_orgs)),
    ('events',                 (SELECT count(*) FROM _uat_events)),
    ('venues',                 (SELECT count(*) FROM _uat_venues)),
    ('artists',                (SELECT count(*) FROM _uat_artists)),
    ('ticket_types',           (SELECT count(*) FROM _uat_ticket_types)),
    ('price_rules',            (SELECT count(*) FROM _uat_price_rules)),
    ('price_rule_redemptions', (SELECT count(*) FROM _uat_price_rule_redemptions)),
    ('orders',                 (SELECT count(*) FROM _uat_orders)),
    ('order_items',            (SELECT count(*) FROM _uat_order_items)),
    ('payment_attempts',       (SELECT count(*) FROM _uat_payment_attempts)),
    ('payments',               (SELECT count(*) FROM _uat_payments)),
    ('refunds',                (SELECT count(*) FROM _uat_refunds)),
    ('payouts',                (SELECT count(*) FROM _uat_payouts)),
    ('payout_accounts',        (SELECT count(*) FROM _uat_payout_accounts)),
    ('ledger_entries',         (SELECT count(*) FROM _uat_ledger_entries)),
    ('devices',                (SELECT count(*) FROM _uat_devices)),
    ('device_sessions',        (SELECT count(*) FROM _uat_device_sessions)),
    ('scans',                  (SELECT count(*) FROM _uat_scans)),
    ('guestlist_entries',      (SELECT count(*) FROM _uat_guestlist_entries)),
    ('waitlists',              (SELECT count(*) FROM _uat_waitlists)),
    ('resale_listings',        (SELECT count(*) FROM _uat_resale_listings)),
    ('transfers',              (SELECT count(*) FROM _uat_transfers)),
    ('notifications',          (SELECT count(*) FROM _uat_notifications)),
    ('webhook_endpoints',      (SELECT count(*) FROM _uat_webhook_endpoints)),
    ('webhook_deliveries',     (SELECT count(*) FROM _uat_webhook_deliveries)),
    ('webhooks',               (SELECT count(*) FROM _uat_webhooks))
) AS counts(table_name, candidate_rows);

DO $$
DECLARE
  v_apply boolean;
  v_allow_money boolean;
  v_max_rows integer;
  v_total_rows bigint;
  v_money_rows bigint;
BEGIN
  SELECT apply_cleanup, allow_money_delete, max_rows
    INTO v_apply, v_allow_money, v_max_rows
  FROM _uat_cleanup_config;

  SELECT coalesce(sum(candidate_rows), 0)
    INTO v_total_rows
  FROM _uat_cleanup_candidates;

  IF v_apply AND v_total_rows > v_max_rows THEN
    RAISE EXCEPTION
      'Refusing to delete % candidate rows; raise ticketiv.uat_max_rows after reviewing the dry-run report.',
      v_total_rows;
  END IF;

  SELECT
    (SELECT count(*) FROM _uat_payments) +
    (SELECT count(*) FROM _uat_refunds) +
    (SELECT count(*) FROM _uat_payouts) +
    (SELECT count(*) FROM _uat_ledger_entries)
    INTO v_money_rows;

  IF v_apply AND NOT v_allow_money AND v_money_rows > 0 THEN
    RAISE EXCEPTION
      'Refusing to delete % money-path rows. Set ticketiv.uat_allow_money_delete=true only after UAT evidence is recorded.',
      v_money_rows;
  END IF;
END
$$;

SELECT
  c.run_id,
  c.apply_cleanup,
  c.allow_money_delete,
  c.include_audit,
  r.table_name,
  r.candidate_rows
FROM _uat_cleanup_config c
CROSS JOIN _uat_cleanup_candidates r
WHERE r.candidate_rows > 0
ORDER BY r.table_name;

CREATE TEMP TABLE _uat_cleanup_deleted(table_name text PRIMARY KEY, rows_deleted bigint NOT NULL);

WITH changed AS (
  UPDATE public.audit_log al
     SET org_id = NULL
   WHERE (SELECT apply_cleanup FROM _uat_cleanup_config)
     AND al.org_id IN (SELECT id FROM _uat_orgs)
  RETURNING 1
)
INSERT INTO _uat_cleanup_deleted VALUES ('audit_log_detached', (SELECT count(*) FROM changed));

WITH deleted AS (
  DELETE FROM public.audit_log al
   WHERE (SELECT apply_cleanup AND include_audit FROM _uat_cleanup_config)
     AND (
       pg_temp.uat_is_marked(al.record_id, (SELECT run_id FROM _uat_cleanup_config))
       OR pg_temp.uat_is_marked(al.table_name, (SELECT run_id FROM _uat_cleanup_config))
       OR pg_temp.uat_is_marked(al.changes::text, (SELECT run_id FROM _uat_cleanup_config))
     )
  RETURNING 1
)
INSERT INTO _uat_cleanup_deleted VALUES ('audit_log_deleted', (SELECT count(*) FROM deleted));

WITH deleted AS (
  DELETE FROM public.app_audit_log aal
   WHERE (SELECT apply_cleanup AND include_audit FROM _uat_cleanup_config)
     AND pg_temp.uat_is_marked(aal.row_data::text, (SELECT run_id FROM _uat_cleanup_config))
  RETURNING 1
)
INSERT INTO _uat_cleanup_deleted VALUES ('app_audit_log', (SELECT count(*) FROM deleted));

WITH deleted AS (
  DELETE FROM public.notifications n
   WHERE (SELECT apply_cleanup FROM _uat_cleanup_config)
     AND n.id IN (SELECT id FROM _uat_notifications)
  RETURNING 1
)
INSERT INTO _uat_cleanup_deleted VALUES ('notifications', (SELECT count(*) FROM deleted));

WITH deleted AS (
  DELETE FROM public.webhook_deliveries wd
   WHERE (SELECT apply_cleanup FROM _uat_cleanup_config)
     AND wd.id IN (SELECT id FROM _uat_webhook_deliveries)
  RETURNING 1
)
INSERT INTO _uat_cleanup_deleted VALUES ('webhook_deliveries', (SELECT count(*) FROM deleted));

WITH deleted AS (
  DELETE FROM public.webhooks wh
   WHERE (SELECT apply_cleanup FROM _uat_cleanup_config)
     AND wh.id IN (SELECT id FROM _uat_webhooks)
  RETURNING 1
)
INSERT INTO _uat_cleanup_deleted VALUES ('webhooks', (SELECT count(*) FROM deleted));

WITH deleted AS (
  DELETE FROM public.price_rule_redemptions prr
   WHERE (SELECT apply_cleanup FROM _uat_cleanup_config)
     AND prr.id IN (SELECT id FROM _uat_price_rule_redemptions)
  RETURNING 1
)
INSERT INTO _uat_cleanup_deleted VALUES ('price_rule_redemptions', (SELECT count(*) FROM deleted));

WITH deleted AS (
  DELETE FROM public.refund_items ri
   WHERE (SELECT apply_cleanup FROM _uat_cleanup_config)
     AND ri.refund_id IN (SELECT id FROM _uat_refunds)
  RETURNING 1
)
INSERT INTO _uat_cleanup_deleted VALUES ('refund_items', (SELECT count(*) FROM deleted));

WITH deleted AS (
  DELETE FROM public.ledger_entries le
   WHERE (SELECT apply_cleanup FROM _uat_cleanup_config)
     AND le.id IN (SELECT id FROM _uat_ledger_entries)
  RETURNING 1
)
INSERT INTO _uat_cleanup_deleted VALUES ('ledger_entries', (SELECT count(*) FROM deleted));

WITH deleted AS (
  DELETE FROM public.refunds r
   WHERE (SELECT apply_cleanup FROM _uat_cleanup_config)
     AND r.id IN (SELECT id FROM _uat_refunds)
  RETURNING 1
)
INSERT INTO _uat_cleanup_deleted VALUES ('refunds', (SELECT count(*) FROM deleted));

WITH changed AS (
  UPDATE public.payment_attempts pa
     SET payment_id = NULL
   WHERE (SELECT apply_cleanup FROM _uat_cleanup_config)
     AND pa.payment_id IN (SELECT id FROM _uat_payments)
  RETURNING 1
)
INSERT INTO _uat_cleanup_deleted VALUES ('payment_attempts_unlinked', (SELECT count(*) FROM changed));

WITH deleted AS (
  DELETE FROM public.payment_attempts pa
   WHERE (SELECT apply_cleanup FROM _uat_cleanup_config)
     AND pa.id IN (SELECT id FROM _uat_payment_attempts)
  RETURNING 1
)
INSERT INTO _uat_cleanup_deleted VALUES ('payment_attempts', (SELECT count(*) FROM deleted));

WITH deleted AS (
  DELETE FROM public.payments p
   WHERE (SELECT apply_cleanup FROM _uat_cleanup_config)
     AND p.id IN (SELECT id FROM _uat_payments)
  RETURNING 1
)
INSERT INTO _uat_cleanup_deleted VALUES ('payments', (SELECT count(*) FROM deleted));

WITH deleted AS (
  DELETE FROM public.resale_listings rl
   WHERE (SELECT apply_cleanup FROM _uat_cleanup_config)
     AND rl.id IN (SELECT id FROM _uat_resale_listings)
  RETURNING 1
)
INSERT INTO _uat_cleanup_deleted VALUES ('resale_listings', (SELECT count(*) FROM deleted));

WITH deleted AS (
  DELETE FROM public.transfers t
   WHERE (SELECT apply_cleanup FROM _uat_cleanup_config)
     AND t.id IN (SELECT id FROM _uat_transfers)
  RETURNING 1
)
INSERT INTO _uat_cleanup_deleted VALUES ('transfers', (SELECT count(*) FROM deleted));

WITH deleted AS (
  DELETE FROM public.scans s
   WHERE (SELECT apply_cleanup FROM _uat_cleanup_config)
     AND s.id IN (SELECT id FROM _uat_scans)
  RETURNING 1
)
INSERT INTO _uat_cleanup_deleted VALUES ('scans', (SELECT count(*) FROM deleted));

WITH deleted AS (
  DELETE FROM public.guestlist_entries ge
   WHERE (SELECT apply_cleanup FROM _uat_cleanup_config)
     AND ge.id IN (SELECT id FROM _uat_guestlist_entries)
  RETURNING 1
)
INSERT INTO _uat_cleanup_deleted VALUES ('guestlist_entries', (SELECT count(*) FROM deleted));

WITH deleted AS (
  DELETE FROM public.waitlists w
   WHERE (SELECT apply_cleanup FROM _uat_cleanup_config)
     AND w.id IN (SELECT id FROM _uat_waitlists)
  RETURNING 1
)
INSERT INTO _uat_cleanup_deleted VALUES ('waitlists', (SELECT count(*) FROM deleted));

WITH deleted AS (
  DELETE FROM public.order_items oi
   WHERE (SELECT apply_cleanup FROM _uat_cleanup_config)
     AND oi.id IN (SELECT id FROM _uat_order_items)
  RETURNING 1
)
INSERT INTO _uat_cleanup_deleted VALUES ('order_items', (SELECT count(*) FROM deleted));

WITH deleted AS (
  DELETE FROM public.orders o
   WHERE (SELECT apply_cleanup FROM _uat_cleanup_config)
     AND o.id IN (SELECT id FROM _uat_orders)
  RETURNING 1
)
INSERT INTO _uat_cleanup_deleted VALUES ('orders', (SELECT count(*) FROM deleted));

WITH deleted AS (
  DELETE FROM public.price_rules pr
   WHERE (SELECT apply_cleanup FROM _uat_cleanup_config)
     AND pr.id IN (SELECT id FROM _uat_price_rules)
  RETURNING 1
)
INSERT INTO _uat_cleanup_deleted VALUES ('price_rules', (SELECT count(*) FROM deleted));

WITH deleted AS (
  DELETE FROM public.ticket_types tt
   WHERE (SELECT apply_cleanup FROM _uat_cleanup_config)
     AND tt.id IN (SELECT id FROM _uat_ticket_types)
  RETURNING 1
)
INSERT INTO _uat_cleanup_deleted VALUES ('ticket_types', (SELECT count(*) FROM deleted));

WITH deleted AS (
  DELETE FROM public.event_live_stats els
   WHERE (SELECT apply_cleanup FROM _uat_cleanup_config)
     AND els.event_id IN (SELECT id FROM _uat_events)
  RETURNING 1
)
INSERT INTO _uat_cleanup_deleted VALUES ('event_live_stats', (SELECT count(*) FROM deleted));

WITH deleted AS (
  DELETE FROM public.device_sessions ds
   WHERE (SELECT apply_cleanup FROM _uat_cleanup_config)
     AND ds.id IN (SELECT id FROM _uat_device_sessions)
  RETURNING 1
)
INSERT INTO _uat_cleanup_deleted VALUES ('device_sessions', (SELECT count(*) FROM deleted));

WITH deleted AS (
  DELETE FROM public.devices d
   WHERE (SELECT apply_cleanup FROM _uat_cleanup_config)
     AND d.id IN (SELECT id FROM _uat_devices)
  RETURNING 1
)
INSERT INTO _uat_cleanup_deleted VALUES ('devices', (SELECT count(*) FROM deleted));

WITH deleted AS (
  DELETE FROM public.webhook_endpoints we
   WHERE (SELECT apply_cleanup FROM _uat_cleanup_config)
     AND we.id IN (SELECT id FROM _uat_webhook_endpoints)
  RETURNING 1
)
INSERT INTO _uat_cleanup_deleted VALUES ('webhook_endpoints', (SELECT count(*) FROM deleted));

WITH deleted AS (
  DELETE FROM public.events e
   WHERE (SELECT apply_cleanup FROM _uat_cleanup_config)
     AND e.id IN (SELECT id FROM _uat_events)
  RETURNING 1
)
INSERT INTO _uat_cleanup_deleted VALUES ('events', (SELECT count(*) FROM deleted));

WITH deleted AS (
  DELETE FROM public.payouts p
   WHERE (SELECT apply_cleanup FROM _uat_cleanup_config)
     AND p.id IN (SELECT id FROM _uat_payouts)
  RETURNING 1
)
INSERT INTO _uat_cleanup_deleted VALUES ('payouts', (SELECT count(*) FROM deleted));

WITH deleted AS (
  DELETE FROM public.payout_accounts pa
   WHERE (SELECT apply_cleanup FROM _uat_cleanup_config)
     AND pa.id IN (SELECT id FROM _uat_payout_accounts)
  RETURNING 1
)
INSERT INTO _uat_cleanup_deleted VALUES ('payout_accounts', (SELECT count(*) FROM deleted));

WITH deleted AS (
  DELETE FROM public.venues v
   WHERE (SELECT apply_cleanup FROM _uat_cleanup_config)
     AND v.id IN (SELECT id FROM _uat_venues)
  RETURNING 1
)
INSERT INTO _uat_cleanup_deleted VALUES ('venues', (SELECT count(*) FROM deleted));

WITH deleted AS (
  DELETE FROM public.artists a
   WHERE (SELECT apply_cleanup FROM _uat_cleanup_config)
     AND a.id IN (SELECT id FROM _uat_artists)
  RETURNING 1
)
INSERT INTO _uat_cleanup_deleted VALUES ('artists', (SELECT count(*) FROM deleted));

WITH deleted AS (
  DELETE FROM public.organizations o
   WHERE (SELECT apply_cleanup FROM _uat_cleanup_config)
     AND o.id IN (SELECT id FROM _uat_orgs)
  RETURNING 1
)
INSERT INTO _uat_cleanup_deleted VALUES ('organizations', (SELECT count(*) FROM deleted));

SELECT
  c.run_id,
  c.apply_cleanup,
  d.table_name,
  d.rows_deleted
FROM _uat_cleanup_config c
CROSS JOIN _uat_cleanup_deleted d
WHERE d.rows_deleted > 0
ORDER BY d.table_name;

COMMIT;
