-- deltapay rail removed in code (PR #199). Drop it from the
-- payment_provider_settings provider check constraint so the column can no
-- longer hold 'deltapay'. Applied to the live DB on 2026-06-21.
DELETE FROM public.payment_provider_settings WHERE provider = 'deltapay';

ALTER TABLE public.payment_provider_settings
  DROP CONSTRAINT IF EXISTS payment_provider_settings_provider_check;

ALTER TABLE public.payment_provider_settings
  ADD CONSTRAINT payment_provider_settings_provider_check
  CHECK (provider = ANY (ARRAY['paystack'::text, 'flutterwave'::text, 'manual'::text]));
