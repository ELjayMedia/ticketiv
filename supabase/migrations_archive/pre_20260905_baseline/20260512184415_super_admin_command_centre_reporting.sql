create or replace view public.admin_command_centre_metrics as
select
  (select count(*) from public.organizations) as total_organizations,
  (select count(*) from public.events) as total_events,
  (select count(*) from public.events where status = 'published') as published_events,
  (select count(*) from public.events where status = 'draft') as draft_events,
  (select count(*) from public.events where status = 'published' and starts_at >= now()) as upcoming_events,
  (select count(*) from public.ticket_types) as ticket_types,
  (select count(*) from public.orders) as total_orders,
  (select count(*) from public.orders where status = 'paid') as paid_orders,
  (select coalesce(sum(total_cents), 0) from public.orders where status = 'paid') as gross_revenue_cents,
  (select coalesce(sum(platform_fee_cents), 0) from public.orders where status = 'paid') as platform_fee_cents,
  (select count(*) from public.payments where status = 'failed') as failed_payments,
  (select count(*) from public.payment_attempts where status = 'failed') as failed_payment_attempts,
  (select count(*) from public.payouts where status in ('requested', 'processing')) as pending_payouts,
  (select coalesce(sum(amount_cents), 0) from public.payouts where status in ('requested', 'processing')) as pending_payout_cents,
  (select count(*) from public.refunds where status in ('requested', 'processing')) as open_refunds,
  (select coalesce(sum(amount_cents), 0) from public.refunds where status in ('requested', 'processing')) as open_refund_cents,
  (select count(*) from public.order_items where status in ('issued', 'checked_in', 'transferred')) as tickets_issued,
  (select count(*) from public.order_items where checked_in_at is not null or status = 'checked_in') as tickets_checked_in,
  (select count(*) from public.scans where scanned_at >= now() - interval '24 hours') as scans_last_24h,
  (select count(*) from public.webhooks where processed_at is null) as unprocessed_webhooks,
  (select count(*) from public.jobs where last_error is not null and attempts >= max_attempts) as failed_jobs;

create or replace view public.admin_attention_queue as
select
  'pending_payout'::text as kind,
  p.id::text as record_id,
  'Payout needs review'::text as title,
  concat(p.currency, ' ', (p.amount_cents::numeric / 100)::text, ' payout is ', p.status::text) as detail,
  p.created_at as created_at,
  '/super-admin/payouts/' || p.id::text as href
from public.payouts p
where p.status in ('requested', 'processing')
union all
select
  'open_refund'::text as kind,
  r.id::text as record_id,
  'Refund needs review'::text as title,
  concat(r.currency, ' ', (r.amount_cents::numeric / 100)::text, ' refund is ', r.status::text) as detail,
  r.created_at as created_at,
  '/super-admin/refunds/' || r.id::text as href
from public.refunds r
where r.status in ('requested', 'processing')
union all
select
  'failed_payment'::text as kind,
  pa.id::text as record_id,
  'Payment attempt failed'::text as title,
  concat(pa.provider, ' attempt #', pa.attempt_no::text, ' failed') as detail,
  pa.created_at as created_at,
  '/super-admin/orders/' || pa.order_id::text as href
from public.payment_attempts pa
where pa.status = 'failed'
union all
select
  'failed_job'::text as kind,
  j.id::text as record_id,
  'Background job exhausted retries'::text as title,
  concat(j.kind, ': ', coalesce(j.last_error, 'unknown error')) as detail,
  j.created_at as created_at,
  '/super-admin/reliability' as href
from public.jobs j
where j.last_error is not null and j.attempts >= j.max_attempts;

create or replace view public.admin_recent_operations as
select
  'audit'::text as source,
  al.id::text as record_id,
  al.action::text as action,
  al.table_name::text as entity,
  al.record_id::text as entity_id,
  al.created_at as occurred_at
from public.audit_log al
union all
select
  'app_audit'::text as source,
  aal.id::text as record_id,
  aal.operation::text as action,
  concat(aal.schema_name, '.', aal.table_name) as entity,
  null::text as entity_id,
  aal.occurred_at as occurred_at
from public.app_audit_log aal;;
