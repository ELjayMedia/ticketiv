-- Event-level payment-provider lock (organizer feature).
--
-- ⚠️ NOT YET APPLIED. Per project policy, apply via the Supabase MCP
-- (apply_migration) / `supabase db push` only after sign-off.
--
-- Lets an organizer restrict an event to specific payment platforms. The
-- column holds the ALLOWED provider keys; an EMPTY array means "no lock —
-- accept every enabled provider" (the default), so existing events are
-- unaffected. Values are constrained to the known provider keys.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS payment_providers text[] NOT NULL DEFAULT '{}';

-- Only known providers may appear. Empty array satisfies <@ trivially.
ALTER TABLE public.events
  ADD CONSTRAINT events_payment_providers_known
  CHECK (payment_providers <@ ARRAY['paystack', 'flutterwave', 'manual', 'momo']::text[]);

COMMENT ON COLUMN public.events.payment_providers IS
  'Allowed payment providers for this event. Empty = all enabled providers (no lock). Enforced server-side in createPaymentAttempt + checkout.';
