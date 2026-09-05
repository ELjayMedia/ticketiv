-- TICK-395: Add DeltaPay to payment_provider_settings + ensure enum coverage.
--
-- The previous migration (20260818182500) added the provider enum constraint
-- but did not insert the deltapay row. This migration is idempotent and
-- ensures parity between paystack, momo and deltapay in the settings table.
--
-- Supported providers: paystack, manual, momo, deltapay
-- Flutterwave has been removed from application support.

-- Insert deltapay row (fail-closed: disabled, test mode)
insert into public.payment_provider_settings (provider, is_enabled, mode)
values ('deltapay', false, 'test')
on conflict (provider) do nothing;

-- Ensure paystack and momo rows exist (production parity)
insert into public.payment_provider_settings (provider, is_enabled, mode)
values ('paystack', true, 'test'), ('momo', true, 'test')
on conflict (provider) do nothing;

-- Ensure constraints are in place (idempotent re-application)
-- Remove flutterwave from valid provider allowlist
alter table public.payment_provider_settings
  drop constraint if exists payment_provider_settings_provider_check;

alter table public.payment_provider_settings
  add constraint payment_provider_settings_provider_check
  check (
    provider = any (
      array['paystack', 'manual', 'momo', 'deltapay']::text[]
    )
  );

alter table public.events
  drop constraint if exists events_payment_providers_known;

alter table public.events
  add constraint events_payment_providers_known
  check (
    payment_providers <@ array['paystack', 'manual', 'momo', 'deltapay']::text[]
  );

comment on column public.events.payment_providers is
  'Allowed payment providers for this event. Empty = all enabled providers (no lock). Enforced server-side in createPaymentAttempt + checkout.';
