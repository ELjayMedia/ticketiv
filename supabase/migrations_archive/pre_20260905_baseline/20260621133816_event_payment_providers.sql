ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS payment_providers text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.events
  ADD CONSTRAINT events_payment_providers_known
  CHECK (payment_providers <@ ARRAY['paystack', 'flutterwave', 'manual', 'momo']::text[]);

COMMENT ON COLUMN public.events.payment_providers IS
  'Allowed payment providers for this event. Empty = all enabled providers (no lock). Enforced server-side in createPaymentAttempt + checkout.';;
