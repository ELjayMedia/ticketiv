create unique index if not exists refunds_active_request_key_unique
  on public.refunds ((provider_payload ->> 'request_key'))
  where provider_payload ? 'request_key'
    and status in ('requested'::public.refund_status, 'processing'::public.refund_status, 'processed'::public.refund_status);;
