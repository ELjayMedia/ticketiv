-- Scans retention (operational control #6, deferred piece).
--
-- `scans` grows unbounded — one row per scan attempt at the gate, including
-- invalid and duplicate attempts. It was deferred from the audit_log retention
-- work because it carries a delete-sensitive trigger, and that concern was real:
--
--   trg_recalc_event_live_stats_scans fires AFTER DELETE and recalculates
--   event_live_stats, whose checked_in_count / last_scan_at are derived by
--   COUNTING public.scans. Naively pruning old scans would therefore silently
--   reset historical attendance for past events to zero.
--
-- (The other three triggers on scans — validate_scan_and_checkin,
-- prevent_scans_on_refunded_items, validate_scan_org — are BEFORE INSERT only,
-- so they are irrelevant to archiving.)
--
-- The fix is to make archiving *stat-neutral* rather than to suppress the
-- trigger: archived scans keep counting toward the event's stats, so pruning
-- cannot change a number anyone reads. That is safer than disabling triggers
-- during the prune (stateful, and wrong if a later recalc runs) and honest
-- compared with freezing stats behind the archive.
--
-- Retention is operational, not financial: scans are gate telemetry, and the
-- durable record of who was admitted is order_items.status = 'checked_in'.

create table if not exists public.scans_archive (
  like public.scans including defaults including constraints including indexes
);
alter table public.scans_archive
  add column if not exists archived_at timestamptz not null default now();

alter table public.scans_archive enable row level security;
revoke all on public.scans_archive from anon, authenticated;

create index if not exists ix_scans_archive_event on public.scans_archive (event_id);

-- Count live + archived scans, so archiving never moves the number.
create or replace function public.fn_recalculate_event_live_stats(p_event_id uuid)
returns event_live_stats
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_stats public.event_live_stats;
begin
  if p_event_id is null then
    raise exception 'event id is required';
  end if;

  insert into public.event_live_stats as els (
    event_id,
    tickets_sold,
    tickets_available,
    gross_sales_cents,
    successful_payments,
    failed_payments,
    checked_in_count,
    last_order_at,
    last_scan_at,
    updated_at
  )
  select
    e.id,
    coalesce(issued.tickets_sold, 0)::integer as tickets_sold,
    greatest(
      coalesce(capacity.total_quota, 0) - coalesce(issued.tickets_sold, 0),
      0
    )::integer as tickets_available,
    coalesce(payments.gross_sales_cents, 0)::bigint as gross_sales_cents,
    coalesce(payments.successful_payments, 0)::integer as successful_payments,
    coalesce(payments.failed_payments, 0)::integer as failed_payments,
    coalesce(scans.checked_in_count, 0)::integer as checked_in_count,
    payments.last_order_at,
    scans.last_scan_at,
    now()
  from public.events e

  left join lateral (
    select coalesce(sum(greatest(tt.quota, 0)), 0)::integer as total_quota
    from public.ticket_types tt
    where tt.event_id = e.id
  ) capacity on true

  left join lateral (
    select count(*)::integer as tickets_sold
    from public.order_items oi
    join public.ticket_types tt on tt.id = oi.ticket_type_id
    join public.orders o on o.id = oi.order_id
    where tt.event_id = e.id
      and o.status::text = 'paid'
      and oi.status::text in ('issued', 'checked_in', 'transferred')
      and oi.revoked_at is null
      and oi.refunded_at is null
  ) issued on true

  left join lateral (
    select
      coalesce(
        sum(
          case
            when p.status::text = 'succeeded' then p.amount_cents
            else 0
          end
        ),
        0
      )::bigint as gross_sales_cents,
      count(*) filter (where p.status::text = 'succeeded')::integer as successful_payments,
      count(*) filter (where p.status::text = 'failed')::integer as failed_payments,
      max(o.created_at) filter (where p.status::text = 'succeeded') as last_order_at
    from public.orders o
    join public.payments p on p.order_id = o.id
    where exists (
      select 1
      from public.order_items oi
      join public.ticket_types tt on tt.id = oi.ticket_type_id
      where oi.order_id = o.id
        and tt.event_id = e.id
    )
  ) payments on true

  -- Live + archived scans. Archiving is therefore stat-neutral.
  left join lateral (
    select
      count(*) filter (where s.outcome = 'valid')::integer as checked_in_count,
      max(s.scanned_at) filter (where s.outcome = 'valid') as last_scan_at
    from (
      select sc.outcome, sc.scanned_at from public.scans sc where sc.event_id = e.id
      union all
      select sa.outcome, sa.scanned_at from public.scans_archive sa where sa.event_id = e.id
    ) s
  ) scans on true

  where e.id = p_event_id

  on conflict (event_id) do update set
    tickets_sold = excluded.tickets_sold,
    tickets_available = excluded.tickets_available,
    gross_sales_cents = excluded.gross_sales_cents,
    successful_payments = excluded.successful_payments,
    failed_payments = excluded.failed_payments,
    checked_in_count = excluded.checked_in_count,
    last_order_at = excluded.last_order_at,
    last_scan_at = excluded.last_scan_at,
    updated_at = now()

  returning * into v_stats;

  if not found then
    raise exception 'event % not found', p_event_id;
  end if;

  return v_stats;
end;
$function$;

-- Archive a batch of old scans and prune them in a single snapshot, so a crash
-- never deletes without archiving (same shape as fn_archive_audit_log).
--
-- Only scans for events that have already ended are eligible, so an in-flight
-- gate is never touched even if a long-running event has old scans.
create or replace function public.fn_archive_scans(
  p_retention interval default interval '12 months',
  p_batch_limit integer default 10000
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_cutoff timestamptz := now() - coalesce(p_retention, interval '12 months');
  v_batch integer := greatest(1, coalesce(p_batch_limit, 10000));
  v_pruned integer := 0;
begin
  with victims as (
    select s.id from public.scans s
    join public.events e on e.id = s.event_id
    where s.scanned_at < v_cutoff
      and coalesce(e.ends_at, e.starts_at) < now()
    order by s.scanned_at
    limit v_batch
  ),
  archived as (
    insert into public.scans_archive (
      id, event_id, order_item_id, ticket_code, outcome, scanned_at,
      device_id, device_session_id, gate, notes, request_hash, source_ip
    )
    select s.id, s.event_id, s.order_item_id, s.ticket_code, s.outcome, s.scanned_at,
           s.device_id, s.device_session_id, s.gate, s.notes, s.request_hash, s.source_ip
    from public.scans s join victims v on v.id = s.id
    on conflict (id) do nothing
  ),
  pruned as (
    delete from public.scans s using victims v where s.id = v.id
    returning s.id
  )
  select count(*) from pruned into v_pruned;

  return jsonb_build_object('cutoff', v_cutoff, 'batch_limit', v_batch, 'pruned', v_pruned);
end;
$function$;

revoke execute on function public.fn_archive_scans(interval, integer) from public, anon, authenticated;
grant execute on function public.fn_archive_scans(interval, integer) to service_role;

-- Daily, alongside the audit_log retention job.
do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'ticketiv-scans-retention',
      '45 3 * * *',
      $cron$select public.fn_archive_scans();$cron$
    );
  end if;
end;
$do$;
