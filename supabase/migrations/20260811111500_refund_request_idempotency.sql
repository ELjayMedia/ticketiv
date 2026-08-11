-- TICK-352
-- Buyer refund requests carry a deterministic request_key in provider_payload.
-- Enforce one active/completed row per key so concurrent/retried submissions
-- cannot reserve or later refund the same selected tickets twice.

create unique index if not exists refunds_active_request_key_unique
  on public.refunds ((provider_payload ->> 'request_key'))
  where provider_payload ? 'request_key'
    and status in ('requested'::public.refund_status, 'processing'::public.refund_status, 'processed'::public.refund_status);
