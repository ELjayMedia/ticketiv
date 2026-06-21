-- Staging seed for load tests (TICK-181). Idempotent. Apply to a Supabase
-- STAGING BRANCH only — never production.
--
-- Creates one org with an enabled (test-mode) Paystack provider, a venue, a
-- published event, and a ticket type, so loadtest/k6-checkout.js has stable
-- EVENT_ID / TICKET_TYPE_ID. Buyer + scanner tokens are minted separately via
-- Supabase Auth (see loadtest/README.md).
--
-- Fixed UUIDs so reruns are no-ops and the IDs are easy to plug into env vars.

INSERT INTO public.organizations (id, name, slug, default_currency)
VALUES ('11111111-1111-1111-1111-111111111111', 'Loadtest Org', 'loadtest-org', 'SZL')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.payment_provider_settings (provider, is_enabled, mode)
VALUES ('paystack', true, 'test')
ON CONFLICT (provider) DO UPDATE SET is_enabled = true, mode = 'test';

INSERT INTO public.venues (id, org_id, name, slug, city, tz)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
        'Loadtest Arena', 'loadtest-arena', 'Mbabane', 'Africa/Mbabane')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.events (id, org_id, venue_id, title, slug, status, visibility, starts_at, ends_at)
VALUES ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222', 'Loadtest Event', 'loadtest-event',
        'published', 'public', now() + interval '30 days', now() + interval '30 days 4 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ticket_types (id, event_id, name, price_cents, currency, quota)
VALUES ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333',
        'General Admission', 15000, 'SZL', 100000)
ON CONFLICT (id) DO NOTHING;

-- EVENT_ID       = 33333333-3333-3333-3333-333333333333
-- TICKET_TYPE_ID = 44444444-4444-4444-4444-444444444444
