create or replace view public.admin_workspace_operating_counts as
select
  'event-operations'::text as workspace_key,
  (select count(*) from public.events where status = 'draft') as needs_review_count,
  (select count(*) from public.events where status = 'published' and starts_at >= now()) as active_count,
  (select count(*) from public.events where status = 'archived') as closed_count
union all
select
  'organizer-operations'::text as workspace_key,
  (select count(*) from public.organizations) as needs_review_count,
  (select count(*) from public.org_members) as active_count,
  0::bigint as closed_count
union all
select
  'ticket-inventory'::text as workspace_key,
  (select count(*) from public.ticket_types where quota <= 0) as needs_review_count,
  (select count(*) from public.ticket_types where quota > 0) as active_count,
  (select count(*) from public.seat_holds where status in ('released', 'expired')) as closed_count
union all
select
  'sales-orders'::text as workspace_key,
  (select count(*) from public.orders where status in ('pending', 'failed')) as needs_review_count,
  (select count(*) from public.orders where status = 'paid') as active_count,
  (select count(*) from public.orders where status = 'refunded') as closed_count
union all
select
  'payments-finance'::text as workspace_key,
  (select count(*) from public.payment_attempts where status = 'failed') + (select count(*) from public.refunds where status in ('requested', 'processing')) as needs_review_count,
  (select count(*) from public.payments where status = 'succeeded') as active_count,
  (select count(*) from public.payouts where status in ('paid', 'cancelled', 'failed')) as closed_count
union all
select
  'access-control'::text as workspace_key,
  (select count(*) from public.scans where outcome <> 'valid') as needs_review_count,
  (select count(*) from public.devices where last_seen_at >= now() - interval '24 hours') as active_count,
  (select count(*) from public.device_sessions where ended_at is not null) as closed_count
union all
select
  'promotions-controls'::text as workspace_key,
  (select count(*) from public.price_rules where is_active = true and ends_at is not null and ends_at < now()) as needs_review_count,
  (select count(*) from public.feature_flags where enabled = true) + (select count(*) from public.price_rules where is_active = true) as active_count,
  (select count(*) from public.price_rules where is_active = false) as closed_count
union all
select
  'reliability-audit'::text as workspace_key,
  (select count(*) from public.webhooks where processed_at is null) + (select count(*) from public.jobs where last_error is not null and attempts >= max_attempts) as needs_review_count,
  (select count(*) from public.jobs where locked_at is not null) as active_count,
  (select count(*) from public.audit_log) + (select count(*) from public.app_audit_log) as closed_count
union all
select
  'platform-settings'::text as workspace_key,
  (select count(*) from public.admin_users) as needs_review_count,
  (select count(*) from public.pricing_plans where active = true) as active_count,
  (select count(*) from public.pricing_plans where active = false) as closed_count;;
