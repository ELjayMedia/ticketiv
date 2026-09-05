-- TICK-340: persist finance reconciliation discrepancies so a detector finding
-- becomes an owned operational issue instead of disappearing after an alert run.
--
-- This is deliberately outside the checkout/payment transaction path. A
-- service-role refresh scans the six existing payment-integrity conditions,
-- upserts stable issue keys, and auto-resolves issues once the condition clears.

create table if not exists public.finance_reconciliation_issues (
  id uuid primary key default gen_random_uuid(),
  detector_key text not null,
  entity_key text not null,
  org_id uuid references public.organizations(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  refund_id uuid references public.refunds(id) on delete set null,
  severity text not null default 'critical'
    check (severity in ('warning', 'critical')),
  status text not null default 'open'
    check (status in ('open', 'acknowledged', 'resolved', 'ignored')),
  title text not null,
  details jsonb not null default '{}'::jsonb,
  runbook_key text not null default 'docs/OPERATIONS.md#money-reconciliation',
  owner_user_id uuid references auth.users(id) on delete set null,
  first_detected_at timestamptz not null default now(),
  last_detected_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (detector_key, entity_key)
);

comment on table public.finance_reconciliation_issues is
  'Persistent operator queue for finance/payment reconciliation anomalies. Refreshed by service-role detectors; acknowledged/resolved through a guarded RPC.';

create index if not exists idx_finance_reconciliation_issues_status
  on public.finance_reconciliation_issues (status, severity, last_detected_at desc);
create index if not exists idx_finance_reconciliation_issues_org_status
  on public.finance_reconciliation_issues (org_id, status, last_detected_at desc);

alter table public.finance_reconciliation_issues enable row level security;

revoke all on table public.finance_reconciliation_issues from public, anon, authenticated;
grant select on table public.finance_reconciliation_issues to authenticated;
grant all on table public.finance_reconciliation_issues to service_role;

create policy finance_reconciliation_issues_read
on public.finance_reconciliation_issues
for select
to authenticated
using (
  app.is_platform_admin()
  or (org_id is not null and app.is_org_finance_viewer(org_id))
);

create or replace view public.v_finance_reconciliation_queue
with (security_invoker = true)
as
select
  id,
  detector_key,
  entity_key,
  org_id,
  order_id,
  payment_id,
  refund_id,
  severity,
  status,
  title,
  details,
  runbook_key,
  owner_user_id,
  first_detected_at,
  last_detected_at,
  acknowledged_at,
  resolved_at,
  extract(epoch from (now() - first_detected_at))::bigint as age_seconds
from public.finance_reconciliation_issues;

revoke all on table public.v_finance_reconciliation_queue from public, anon;
grant select on table public.v_finance_reconciliation_queue to authenticated, service_role;

create or replace function public.fn_refresh_finance_reconciliation_issues()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_started timestamptz := clock_timestamp();
  v_detected integer := 0;
  v_resolved integer := 0;
  v_open integer := 0;
  v_critical integer := 0;
begin
  insert into public.finance_reconciliation_issues as fri (
    detector_key, entity_key, org_id, order_id, severity, title, details,
    first_detected_at, last_detected_at, updated_at
  )
  select
    'paid_order_without_succeeded_payment', o.id::text, o.org_id, o.id, 'critical',
    'Paid order has no succeeded payment',
    jsonb_build_object('order_status', o.status, 'total_cents', o.total_cents, 'currency', o.currency, 'created_at', o.created_at),
    v_started, v_started, v_started
  from public.orders o
  where o.status = 'paid'
    and not exists (select 1 from public.payments p where p.order_id = o.id and p.status = 'succeeded')
  on conflict (detector_key, entity_key) do update
  set org_id = excluded.org_id, order_id = excluded.order_id, severity = excluded.severity,
      title = excluded.title, details = excluded.details, last_detected_at = v_started,
      updated_at = v_started,
      status = case when fri.status = 'resolved' then 'open' else fri.status end,
      resolved_at = case when fri.status = 'resolved' then null else fri.resolved_at end;
  get diagnostics v_detected = row_count;

  insert into public.finance_reconciliation_issues as fri (
    detector_key, entity_key, org_id, order_id, payment_id, severity, title, details,
    first_detected_at, last_detected_at, updated_at
  )
  select
    'succeeded_payment_without_paid_order', p.id::text, o.org_id, o.id, p.id, 'critical',
    'Succeeded payment is attached to a non-paid order',
    jsonb_build_object('payment_status', p.status, 'order_status', o.status, 'provider', p.provider,
      'provider_reference', p.ext_payment_id, 'amount_cents', p.amount_cents, 'currency', p.currency),
    v_started, v_started, v_started
  from public.payments p join public.orders o on o.id = p.order_id
  where p.status = 'succeeded' and o.status <> 'paid'
  on conflict (detector_key, entity_key) do update
  set org_id = excluded.org_id, order_id = excluded.order_id, payment_id = excluded.payment_id,
      severity = excluded.severity, title = excluded.title, details = excluded.details,
      last_detected_at = v_started, updated_at = v_started,
      status = case when fri.status = 'resolved' then 'open' else fri.status end,
      resolved_at = case when fri.status = 'resolved' then null else fri.resolved_at end;
  get diagnostics v_open = row_count; v_detected := v_detected + v_open;

  insert into public.finance_reconciliation_issues as fri (
    detector_key, entity_key, org_id, order_id, payment_id, severity, title, details,
    first_detected_at, last_detected_at, updated_at
  )
  select
    'payment_amount_mismatch', p.id::text, o.org_id, o.id, p.id, 'critical',
    'Succeeded payment does not match the order amount or currency',
    jsonb_build_object('order_total_cents', o.total_cents, 'order_currency', o.currency,
      'payment_amount_cents', p.amount_cents, 'payment_currency', p.currency,
      'provider', p.provider, 'provider_reference', p.ext_payment_id),
    v_started, v_started, v_started
  from public.payments p join public.orders o on o.id = p.order_id
  where p.status = 'succeeded'
    and (p.amount_cents <> o.total_cents or upper(coalesce(p.currency, '')) <> upper(coalesce(o.currency, '')))
  on conflict (detector_key, entity_key) do update
  set org_id = excluded.org_id, order_id = excluded.order_id, payment_id = excluded.payment_id,
      severity = excluded.severity, title = excluded.title, details = excluded.details,
      last_detected_at = v_started, updated_at = v_started,
      status = case when fri.status = 'resolved' then 'open' else fri.status end,
      resolved_at = case when fri.status = 'resolved' then null else fri.resolved_at end;
  get diagnostics v_open = row_count; v_detected := v_detected + v_open;

  insert into public.finance_reconciliation_issues as fri (
    detector_key, entity_key, severity, title, details,
    first_detected_at, last_detected_at, updated_at
  )
  select
    'duplicate_provider_reference', d.provider || ':' || d.ext_payment_id, 'critical',
    'Provider payment reference is duplicated',
    jsonb_build_object('provider', d.provider, 'provider_reference', d.ext_payment_id,
      'payment_ids', d.payment_ids, 'order_ids', d.order_ids, 'duplicate_count', d.duplicate_count),
    v_started, v_started, v_started
  from (
    select provider, ext_payment_id,
      jsonb_agg(id order by created_at) as payment_ids,
      jsonb_agg(order_id order by created_at) as order_ids,
      count(*) as duplicate_count
    from public.payments
    where ext_payment_id is not null and btrim(ext_payment_id) <> ''
    group by provider, ext_payment_id
    having count(*) > 1
  ) d
  on conflict (detector_key, entity_key) do update
  set severity = excluded.severity, title = excluded.title, details = excluded.details,
      last_detected_at = v_started, updated_at = v_started,
      status = case when fri.status = 'resolved' then 'open' else fri.status end,
      resolved_at = case when fri.status = 'resolved' then null else fri.resolved_at end;
  get diagnostics v_open = row_count; v_detected := v_detected + v_open;

  insert into public.finance_reconciliation_issues as fri (
    detector_key, entity_key, org_id, order_id, severity, title, details,
    first_detected_at, last_detected_at, updated_at
  )
  select
    'payment_ledger_without_payment', le.id::text, le.org_id, le.order_id, 'critical',
    'Payment ledger row is missing its payment link',
    jsonb_build_object('ledger_entry_id', le.id, 'ledger_type', le.type,
      'amount_cents', le.amount_cents, 'currency', le.currency, 'occurred_at', le.occurred_at),
    v_started, v_started, v_started
  from public.ledger_entries le
  where le.payment_id is null and le.type in ('order_gross', 'fee', 'payment_net')
  on conflict (detector_key, entity_key) do update
  set org_id = excluded.org_id, order_id = excluded.order_id, severity = excluded.severity,
      title = excluded.title, details = excluded.details, last_detected_at = v_started,
      updated_at = v_started,
      status = case when fri.status = 'resolved' then 'open' else fri.status end,
      resolved_at = case when fri.status = 'resolved' then null else fri.resolved_at end;
  get diagnostics v_open = row_count; v_detected := v_detected + v_open;

  insert into public.finance_reconciliation_issues as fri (
    detector_key, entity_key, org_id, order_id, payment_id, severity, title, details,
    first_detected_at, last_detected_at, updated_at
  )
  select
    'payment_attempt_link_mismatch', pa.id::text, o.org_id, pa.order_id, pa.payment_id, 'critical',
    'Succeeded payment attempt is not linked to its matching payment',
    jsonb_build_object('payment_attempt_id', pa.id, 'attempt_provider', pa.provider,
      'attempt_reference', pa.ext_ref, 'attempt_payment_id', pa.payment_id,
      'linked_payment_status', p.status, 'linked_payment_provider', p.provider,
      'linked_payment_reference', p.ext_payment_id),
    v_started, v_started, v_started
  from public.payment_attempts pa
  left join public.payments p on p.id = pa.payment_id
  left join public.orders o on o.id = pa.order_id
  where pa.status = 'succeeded'
    and (pa.payment_id is null or p.id is null or p.status <> 'succeeded'
      or p.order_id is distinct from pa.order_id or p.provider is distinct from pa.provider
      or (pa.ext_ref is not null and p.ext_payment_id is distinct from pa.ext_ref))
  on conflict (detector_key, entity_key) do update
  set org_id = excluded.org_id, order_id = excluded.order_id, payment_id = excluded.payment_id,
      severity = excluded.severity, title = excluded.title, details = excluded.details,
      last_detected_at = v_started, updated_at = v_started,
      status = case when fri.status = 'resolved' then 'open' else fri.status end,
      resolved_at = case when fri.status = 'resolved' then null else fri.resolved_at end;
  get diagnostics v_open = row_count; v_detected := v_detected + v_open;

  update public.finance_reconciliation_issues
  set status = 'resolved', resolved_at = v_started, updated_at = v_started
  where detector_key in (
    'paid_order_without_succeeded_payment', 'succeeded_payment_without_paid_order',
    'payment_amount_mismatch', 'duplicate_provider_reference',
    'payment_ledger_without_payment', 'payment_attempt_link_mismatch'
  )
    and status in ('open', 'acknowledged')
    and last_detected_at < v_started;
  get diagnostics v_resolved = row_count;

  select count(*)::integer,
         count(*) filter (where severity = 'critical')::integer
  into v_open, v_critical
  from public.finance_reconciliation_issues
  where status in ('open', 'acknowledged');

  return jsonb_build_object('refreshed_at', v_started, 'detected_this_run', v_detected,
    'auto_resolved_this_run', v_resolved, 'open_issues', v_open, 'critical_open_issues', v_critical);
end;
$function$;

revoke execute on function public.fn_refresh_finance_reconciliation_issues() from public, anon, authenticated;
grant execute on function public.fn_refresh_finance_reconciliation_issues() to service_role;

create or replace function public.fn_update_finance_reconciliation_issue(p_issue_id uuid, p_new_status text)
returns public.finance_reconciliation_issues
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_issue public.finance_reconciliation_issues%rowtype;
  v_actor uuid := auth.uid();
begin
  if p_new_status not in ('open', 'acknowledged', 'resolved', 'ignored') then
    raise exception 'invalid_reconciliation_status' using errcode = '22023';
  end if;

  select * into v_issue from public.finance_reconciliation_issues where id = p_issue_id for update;
  if not found then raise exception 'reconciliation_issue_not_found' using errcode = 'P0002'; end if;

  if not (app.is_platform_admin() or (v_issue.org_id is not null and app.is_org_finance_viewer(v_issue.org_id))) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  update public.finance_reconciliation_issues
  set status = p_new_status,
      owner_user_id = case when p_new_status in ('acknowledged', 'resolved', 'ignored') then coalesce(owner_user_id, v_actor) else owner_user_id end,
      acknowledged_at = case when p_new_status = 'acknowledged' then coalesce(acknowledged_at, now()) when p_new_status = 'open' then null else acknowledged_at end,
      resolved_at = case when p_new_status in ('resolved', 'ignored') then now() when p_new_status = 'open' then null else resolved_at end,
      updated_at = now()
  where id = p_issue_id
  returning * into v_issue;

  return v_issue;
end;
$function$;

revoke execute on function public.fn_update_finance_reconciliation_issue(uuid, text) from public, anon;
grant execute on function public.fn_update_finance_reconciliation_issue(uuid, text) to authenticated, service_role;;
