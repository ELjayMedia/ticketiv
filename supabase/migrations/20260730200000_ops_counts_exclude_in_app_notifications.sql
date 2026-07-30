-- Ops alerting fix (control #3): stop counting in-app notifications as "stuck".
--
-- fn_ops_reconciliation_counts counted every notification left in
-- status in ('pending','failed') past a threshold. That is wrong for the
-- in_app channel: lib/notifications.ts `emitNotification` inserts in-app rows
-- with status = 'pending' and NOTHING ever transitions them — the in-app
-- lifecycle is tracked by read_at, not status. So every in-app notification
-- older than the threshold looked "stuck", and under real traffic the
-- stuck-async-work alert would fire permanently and train people to ignore it.
--
-- Only dispatched channels (email/sms/push) have a real delivery lifecycle:
-- lib/notifications/transactional.ts writes status sent/failed/skipped plus
-- sent_at via logAttempt. Those are the rows where 'pending' or 'failed' past
-- the threshold genuinely means delivery did not complete.
--
-- Body is otherwise identical to 20260728120000_ops_reconciliation_counts.

create or replace function public.fn_ops_reconciliation_counts()
returns jsonb
language sql
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select jsonb_build_object(
    'succeeded_payment_order_not_paid', (
      select count(*) from public.payments p
      join public.orders o on o.id = p.order_id
      where p.status = 'succeeded' and o.status <> 'paid'),

    'paid_order_no_settlement_ledger', (
      select count(*) from public.orders o
      where o.status = 'paid'
        and not exists (
          select 1 from public.ledger_entries le
          where le.order_id = o.id and le.payment_id is not null and le.type = 'order_gross')),

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

    'paid_order_items_pending', (
      select count(distinct o.id) from public.orders o
      join public.order_items oi on oi.order_id = o.id
      where o.status = 'paid' and oi.status = 'pending'),

    'duplicate_succeeded_payments', (
      select count(*) from (
        select order_id from public.payments where status = 'succeeded'
        group by order_id having count(*) > 1
      ) dup),

    'processed_refund_no_ledger', (
      select count(*) from public.refunds r
      where r.status = 'processed'
        and not exists (
          select 1 from public.ledger_entries le
          where le.payment_id = r.payment_id and le.type = 'refund')),

    'pending_order_with_succeeded_payment', (
      select count(distinct o.id) from public.orders o
      join public.payments p on p.order_id = o.id
      where o.status = 'pending' and p.status = 'succeeded'
        and o.created_at < now() - interval '2 hours'),

    'issued_ticket_on_unpaid_order', (
      select count(*) from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.status in ('issued', 'transferred', 'checked_in') and o.status <> 'paid'),

    'creation_time_ledger_pollution', (
      select count(*) from public.ledger_entries
      where payment_id is null and type in ('order_gross', 'fee')),

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

    'failed_payouts', (
      select count(*) from public.payouts where status = 'failed'),

    'stuck_payment_outbox', (
      select count(*) from public.payment_outbox
      where status = 'pending'
        and coalesce(available_at, created_at) < now() - interval '15 minutes'),

    -- Dispatched channels only — see the header note on in_app.
    'stuck_notifications', (
      select count(*) from public.notifications
      where coalesce(channel, 'in_app') <> 'in_app'
        and status in ('pending', 'failed')
        and coalesce(scheduled_at, created_at) < now() - interval '30 minutes'),

    'deadletter_jobs', (
      select count(*) from public.jobs
      where max_attempts > 0 and attempts >= max_attempts)
  );
$function$;

revoke execute on function public.fn_ops_reconciliation_counts() from public, anon, authenticated;
grant execute on function public.fn_ops_reconciliation_counts() to service_role;
