-- Operational alerting (control #3): reconciliation counts for the ops cron.
--
-- The ops-alerts cron (app/api/cron/ops-alerts) already alerts on payment
-- success-rate, webhook lag and health URLs. This function surfaces the rest of
-- the conditions documented in docs/OPERATIONS.md #3 as a single service-role
-- call, so the cron doesn't have to express multi-table joins through PostgREST.
-- It returns COUNTS of offending rows (0 = healthy) for:
--   * money/order integrity  — mirrors scripts/ops-reconciliation.sql #1-#6,#9-#11
--   * payout integrity       — over-draw (#7) + failed payouts
--   * stuck async work       — payment_outbox / notifications / dead-lettered jobs
--
-- SECURITY DEFINER (runs as owner, bypassing RLS to see all orgs) and
-- service-role only — the cron calls it with the admin client. Revoked from
-- anon/authenticated so a browser can't probe platform-wide integrity.

create or replace function public.fn_ops_reconciliation_counts()
returns jsonb
language sql
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select jsonb_build_object(
    -- #1 succeeded payment but its order is not paid (completion stalled)
    'succeeded_payment_order_not_paid', (
      select count(*) from public.payments p
      join public.orders o on o.id = p.order_id
      where p.status = 'succeeded' and o.status <> 'paid'),

    -- #2 paid order with no settlement ledger (money moved, no ledger)
    'paid_order_no_settlement_ledger', (
      select count(*) from public.orders o
      where o.status = 'paid'
        and not exists (
          select 1 from public.ledger_entries le
          where le.order_id = o.id and le.payment_id is not null and le.type = 'order_gross')),

    -- #3 settlement ledger invariant broken (gross + fee <> net) per payment
    'settlement_ledger_invariant_broken', (
      select count(*) from (
        select payment_id
        from public.ledger_entries
        where payment_id is not null
        group by payment_id
        having coalesce(sum(amount_cents) filter (where type = 'order_gross'), 0)
             + coalesce(sum(amount_cents) filter (where type = 'fee'), 0)
            <> coalesce(sum(amount_cents) filter (where type = 'payment_net'), 0)
      ) broken),

    -- #4 paid order with items still pending (tickets not issued)
    'paid_order_items_pending', (
      select count(distinct o.id) from public.orders o
      join public.order_items oi on oi.order_id = o.id
      where o.status = 'paid' and oi.status = 'pending'),

    -- #5 duplicate succeeded payments for one order (double charge / complete)
    'duplicate_succeeded_payments', (
      select count(*) from (
        select order_id from public.payments where status = 'succeeded'
        group by order_id having count(*) > 1
      ) dup),

    -- #6 processed refund with no refund ledger row
    'processed_refund_no_ledger', (
      select count(*) from public.refunds r
      where r.status = 'processed'
        and not exists (
          select 1 from public.ledger_entries le
          where le.payment_id = r.payment_id and le.type = 'refund')),

    -- #9 pending order older than 2h that already has a succeeded payment
    'pending_order_with_succeeded_payment', (
      select count(distinct o.id) from public.orders o
      join public.payments p on p.order_id = o.id
      where o.status = 'pending' and p.status = 'succeeded'
        and o.created_at < now() - interval '2 hours'),

    -- #10 issued/checked-in ticket on an order that is not paid
    'issued_ticket_on_unpaid_order', (
      select count(*) from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.status in ('issued', 'transferred', 'checked_in') and o.status <> 'paid'),

    -- #11 creation-time ledger pollution (must be 0)
    'creation_time_ledger_pollution', (
      select count(*) from public.ledger_entries
      where payment_id is null and type in ('order_gross', 'fee')),

    -- #7 orgs whose committed payouts exceed settled-net minus refunds (over-draw)
    'payout_overdraw_orgs', (
      with settled as (
        select org_id,
               coalesce(sum(amount_cents) filter (where type = 'payment_net'), 0) as net,
               coalesce(sum(amount_cents) filter (where type = 'refund'), 0)      as refunds
        from public.ledger_entries group by org_id),
      committed as (
        select org_id,
               coalesce(sum(amount_cents) filter (where status in ('requested', 'processing', 'paid')), 0) as payouts
        from public.payouts group by org_id)
      select count(*) from settled s join committed c on c.org_id = s.org_id
      where c.payouts > (s.net - s.refunds)),

    -- failed payouts awaiting attention
    'failed_payouts', (
      select count(*) from public.payouts where status = 'failed'),

    -- payment outbox rows overdue and still unprocessed (payment finalization stuck)
    'stuck_payment_outbox', (
      select count(*) from public.payment_outbox
      where status = 'pending'
        and coalesce(available_at, created_at) < now() - interval '15 minutes'),

    -- notifications stuck pending/failed well past their scheduled time
    'stuck_notifications', (
      select count(*) from public.notifications
      where status in ('pending', 'failed')
        and coalesce(scheduled_at, created_at) < now() - interval '30 minutes'),

    -- background jobs that exhausted their retries (dead-lettered)
    'deadletter_jobs', (
      select count(*) from public.jobs
      where max_attempts > 0 and attempts >= max_attempts)
  );
$function$;

-- Supabase's default privileges grant EXECUTE to anon/authenticated directly
-- (not via PUBLIC), so revoke from those roles explicitly.
revoke execute on function public.fn_ops_reconciliation_counts() from public, anon, authenticated;
grant execute on function public.fn_ops_reconciliation_counts() to service_role;
