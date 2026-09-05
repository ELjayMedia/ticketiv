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
