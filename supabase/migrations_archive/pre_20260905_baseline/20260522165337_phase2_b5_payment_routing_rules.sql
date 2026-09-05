-- B5: Routing rules table for the super-admin Providers screen.
-- "if country=ZA AND currency=ZAR then provider=paystack, fallback=deltapay"
-- expressed declaratively, ordered by priority.

create table if not exists public.payment_routing_rules (
  id uuid primary key default gen_random_uuid(),
  priority integer not null default 100,
  country_code text,            -- ISO 3166-1 alpha-2, NULL = any
  currency text,                -- ISO 4217, NULL = any
  provider text not null,       -- primary provider key (paystack, deltapay, flutterwave, ...)
  fallback_provider text,       -- optional secondary
  is_active boolean not null default true,
  conditions jsonb not null default '{}'::jsonb,  -- arbitrary extra match (e.g. {min_amount_cents: 50000})
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payment_routing_rules_priority on public.payment_routing_rules(priority, is_active);
create index if not exists idx_payment_routing_rules_match on public.payment_routing_rules(country_code, currency) where is_active = true;

alter table public.payment_routing_rules enable row level security;

create policy payment_routing_rules_admin_read on public.payment_routing_rules
  for select using (public.is_super_admin());
create policy payment_routing_rules_admin_write on public.payment_routing_rules
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

create or replace function public.fn_payment_routing_rules_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end
$$;

drop trigger if exists trg_payment_routing_rules_touch on public.payment_routing_rules;
create trigger trg_payment_routing_rules_touch
  before update on public.payment_routing_rules
  for each row execute function public.fn_payment_routing_rules_touch_updated_at();

comment on table public.payment_routing_rules is
  'Declarative payment provider routing. Rules evaluated by priority ASC; first match wins.';
;
