-- TICK-400: keep ordinary provider availability/test mode separate from
-- explicit approval to accept real customer money.

create table if not exists public.payment_provider_readiness (
  provider text primary key,
  production_ready boolean not null default false,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  evidence_refs jsonb not null default '[]'::jsonb,
  blocked_at timestamptz,
  blocked_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_provider_readiness_provider_check
    check (provider in ('paystack', 'momo', 'deltapay')),
  constraint payment_provider_readiness_evidence_array_check
    check (jsonb_typeof(evidence_refs) = 'array'),
  constraint payment_provider_readiness_approval_check
    check (
      production_ready = false
      or (approved_at is not null and approved_by is not null and jsonb_array_length(evidence_refs) > 0)
    ),
  constraint payment_provider_readiness_block_check
    check (blocked_at is null or blocked_reason is not null),
  constraint payment_provider_readiness_no_ready_blocked_check
    check (not (production_ready and blocked_at is not null))
);

alter table public.payment_provider_readiness enable row level security;

-- This is an operational control-plane table. It is never client-readable or
-- client-writable; the server/admin path uses the service role after performing
-- its own authorization checks.
revoke all on table public.payment_provider_readiness from public, anon, authenticated;
grant select, insert, update on table public.payment_provider_readiness to service_role;

insert into public.payment_provider_readiness (provider, production_ready, evidence_refs)
values
  ('paystack', false, '[]'::jsonb),
  ('momo', false, '[]'::jsonb),
  ('deltapay', false, '[]'::jsonb)
on conflict (provider) do nothing;

comment on table public.payment_provider_readiness is
  'TICK-400 fail-closed approval state for real-money provider activation; separate from payment_provider_settings.is_enabled/test availability.';
comment on column public.payment_provider_readiness.evidence_refs is
  'Non-secret operational references proving contracting/KYB/credentials/callback/UAT/privacy/settlement readiness. Never store credentials here.';
