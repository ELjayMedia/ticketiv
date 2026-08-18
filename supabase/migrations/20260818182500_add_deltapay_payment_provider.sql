-- TICK-382: add DeltaPay as an allowed first-class payment provider.
--
-- This migration deliberately changes only provider configuration metadata.
-- It does not enable DeltaPay in production; application config still requires
-- DELTAPAY_PRODUCTION_ENABLED=true plus production credentials and the approved
-- DeltaPay production host before the rail is considered operational.

alter table public.payment_provider_settings
  drop constraint if exists payment_provider_settings_provider_check;

alter table public.payment_provider_settings
  add constraint payment_provider_settings_provider_check
  check (
    provider = any (
      array['paystack', 'flutterwave', 'manual', 'momo', 'deltapay']::text[]
    )
  );

alter table public.events
  drop constraint if exists events_payment_providers_known;

alter table public.events
  add constraint events_payment_providers_known
  check (
    payment_providers <@ array['paystack', 'flutterwave', 'manual', 'momo', 'deltapay']::text[]
  );

comment on column public.events.payment_providers is
  'Allowed payment providers for this event. Empty = all enabled providers (no lock). Enforced server-side in createPaymentAttempt + checkout.';
