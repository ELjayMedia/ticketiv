-- TICK-351: make pricing plans safely versionable.
--
-- Orders already pin their fee inputs in orders.pricing_plan_snapshot and
-- recompute_order_totals() reads that snapshot after the first calculation.
-- The remaining schema blocker for effective-dated fee configuration is the
-- legacy UNIQUE (org_id, active) constraint: it permits only one inactive row
-- per organization, so a second historical pricing-plan version cannot be kept.
--
-- Replace it with uniqueness that applies only to ACTIVE plans. Historical
-- inactive versions are intentionally unlimited and retain effective_from for
-- audit/reporting. Global plans (org_id IS NULL) get a separate guard because
-- PostgreSQL's normal unique semantics treat NULL values as distinct.

alter table public.pricing_plans
  drop constraint if exists pricing_plans_org_id_active_key;

create unique index if not exists pricing_plans_one_active_per_org_idx
  on public.pricing_plans (org_id)
  where active is true and org_id is not null;

create unique index if not exists pricing_plans_one_active_global_idx
  on public.pricing_plans ((1))
  where active is true and org_id is null;

create index if not exists pricing_plans_effective_history_idx
  on public.pricing_plans (org_id, effective_from desc, created_at desc);

comment on index public.pricing_plans_one_active_per_org_idx is
  'TICK-351: at most one active organization-specific pricing plan; inactive rows remain as immutable history.';

comment on index public.pricing_plans_one_active_global_idx is
  'TICK-351: at most one active global pricing plan (org_id is null).';

comment on index public.pricing_plans_effective_history_idx is
  'TICK-351: supports effective-dated pricing-plan history and audit/reporting lookups.';
