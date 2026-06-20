-- TICK-178 — Webhook idempotency hardening.
--
-- The Paystack webhook route currently de-dupes with a check-then-insert on
-- (provider, provider_event_id), which is a TOCTOU race: two concurrent
-- redeliveries can both pass the SELECT and both insert + process. A unique
-- index makes the database the arbiter so the second insert fails fast and the
-- handler can treat it as a duplicate.
--
-- NULL provider_event_id rows are treated as distinct by Postgres (standard
-- nulls-distinct behaviour), so legacy/unkeyed webhooks are unaffected.

CREATE UNIQUE INDEX IF NOT EXISTS webhooks_provider_event_uidx
  ON public.webhooks (provider, provider_event_id)
  WHERE provider_event_id IS NOT NULL;
