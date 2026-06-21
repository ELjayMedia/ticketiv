-- TICK-181 — index hygiene: add the one missing FK index, drop provably
-- redundant duplicate indexes.
--
-- ⚠️ NOT YET APPLIED to the live DB. Per project policy, migrations are
-- applied via the Supabase MCP only after explicit sign-off. Review, then
-- apply with `apply_migration` (or `supabase db push`).
--
-- Scope is deliberately conservative. The performance advisor reports ~161
-- "unused" indexes, but idx_scan counters reset with the stats window and
-- read near-zero on a low-traffic / recently-reset database — dropping on
-- that signal alone risks removing indexes the production workload needs.
-- This migration therefore changes ONLY:
--   (a) the 1 genuinely missing FK index (clear, safe win), and
--   (b) 5 EXACT-duplicate indexes already covered by another index or a
--       PK/UNIQUE constraint of identical definition (safe to drop).
-- Broader unused-index pruning is deferred until query patterns are
-- validated against a representative production traffic window
-- (see docs/RUNBOOK.md → "Index review").

-- ---------------------------------------------------------------------
-- (a) Missing FK index. order_items.current_owner_id references
--     auth.users(id) but had no covering index, so owner-scoped lookups
--     and cascade checks did sequential scans.
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_order_items_current_owner_id
  ON public.order_items USING btree (current_owner_id);

-- ---------------------------------------------------------------------
-- (b) Redundant duplicate indexes — each is byte-identical in definition
--     to a PK/UNIQUE constraint index (or another index) on the same
--     table, so the planner can use the surviving one with no regression.
-- ---------------------------------------------------------------------

-- admin_users: duplicates admin_users_pkey (PRIMARY KEY (user_id)).
DROP INDEX IF EXISTS public.idx_admin_users_user;

-- order_items: duplicates order_items_ticket_code_key (UNIQUE (ticket_code)).
DROP INDEX IF EXISTS public.idx_items_ticket_code;

-- user_notification_preferences: duplicates the PK (user_id).
DROP INDEX IF EXISTS public.idx_user_notification_preferences_user_id;

-- pricing_plans: duplicates uq_pricing_plans_org_active
--   (UNIQUE (org_id) WHERE active = true). The unique partial index serves
--   the same active-plan lookups. The non-partial idx_pricing_plans_org_id
--   (full org_id) is a DIFFERENT index and is intentionally kept.
DROP INDEX IF EXISTS public.idx_pricing_plans_org;

-- webhooks: two identical UNIQUE partial indexes on
--   (provider, provider_event_id) WHERE provider_event_id IS NOT NULL.
--   webhooks_provider_event_uniq predates the TICK-178 hardening migration,
--   which added webhooks_provider_event_uidx without noticing the existing
--   one. Drop the TICK-178 duplicate; the original keeps enforcing the
--   idempotency constraint.
DROP INDEX IF EXISTS public.webhooks_provider_event_uidx;
