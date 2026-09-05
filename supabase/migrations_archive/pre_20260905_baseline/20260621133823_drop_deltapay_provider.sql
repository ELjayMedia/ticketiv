-- deltapay rail removed in code; drop it from the provider check constraint.
DELETE FROM public.payment_provider_settings WHERE provider = 'deltapay';

ALTER TABLE public.payment_provider_settings
  DROP CONSTRAINT IF EXISTS payment_provider_settings_provider_check;

ALTER TABLE public.payment_provider_settings
  ADD CONSTRAINT payment_provider_settings_provider_check
  CHECK (provider = ANY (ARRAY['paystack'::text, 'flutterwave'::text, 'manual'::text]));;
