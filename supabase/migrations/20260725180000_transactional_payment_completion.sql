-- TICK-333 — make payment completion a single transactional RPC with a
-- post-commit outbox.
--
-- ============================================================================
-- What was wrong
-- ============================================================================
--
-- completePrimaryCheckout() in lib/payments/paystack-webhook.ts performed the
-- whole completion as five separate round trips, each its own transaction:
--
--   1. insert into payments
--   2. update payment_attempts   -> succeeded
--   3. insert into ledger_entries
--   4. update order_items        -> issued      (via completePaidOrder)
--   5. update orders             -> paid        (via completePaidOrder)
--
-- A crash, timeout or lambda eviction between any two of those leaves the
-- money path in a state no code expects: a payment recorded with the order
-- still pending, a ledger written for an order that never got its tickets, or
-- items issued under an order still marked pending. Nothing reconciles it,
-- because each step's own guard reads as "already done" on retry.
--
-- The provider's retry does not fix this either. Step 4 issues items and step 5
-- flips the order, so a failure between them leaves items 'issued' while the
-- order stays 'pending' -- and the retry then throws at
-- "Order cannot be completed from status", because it only tolerates 'paid'.
--
-- Two smaller defects in the same path:
--
--   * ui_payments_provider_ext is a partial unique index on
--     (provider, ext_payment_id). getOrCreatePrimaryPayment does a
--     select-then-insert, so two concurrent deliveries of the same reference
--     race: the loser raises 23505, which nothing catches, so the webhook
--     500s and Paystack redelivers a payment that in fact already succeeded.
--
--   * ledger_entries carried TWO type CHECK constraints. Both must pass, and
--     the older one omits 'reversal', so a reversal row could never be
--     inserted -- silently blocking chargeback clawback (TICK-258).
--
-- ============================================================================
-- What this does
-- ============================================================================
--
-- fn_complete_order_payment() performs steps 1-5 in one transaction, so the
-- outcome is all of it or none of it. Side effects that must NOT sit inside
-- that transaction -- sending an email, calling a push provider -- are recorded
-- into payment_outbox in the same commit and drained afterwards. That is the
-- standard transactional-outbox shape: the intent to notify is as durable as
-- the payment itself, but a slow mail provider can never hold a database
-- transaction open or roll a completed payment back.
--
-- In-app notifications are deliberately NOT outboxed. public.notifications is
-- already a durable queue with its own status/attempts/dedupe_key columns, and
-- writing it inside the transaction is correct and matches what the resale and
-- waitlist completion RPCs already do.

-- ============================================================================
-- 1. Free up the 'reversal' ledger type
-- ============================================================================

alter table public.ledger_entries drop constraint if exists ledger_entries_type_check;

-- check_ledger_entries_type_allow_reversal already permits the full set and
-- stays as the single authority. Asserted rather than assumed:
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.ledger_entries'::regclass
      and conname = 'check_ledger_entries_type_allow_reversal'
  ) then
    raise exception 'check_ledger_entries_type_allow_reversal is missing; refusing to leave ledger_entries.type unconstrained';
  end if;
end $$;

-- ============================================================================
-- 2. Post-commit outbox
-- ============================================================================

create table if not exists public.payment_outbox (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  payment_id    uuid references public.payments(id) on delete set null,
  topic         text not null check (topic in ('ticket_delivery', 'payment_succeeded')),
  payload       jsonb not null default '{}'::jsonb,
  status        text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  attempts      integer not null default 0,
  last_error    text,
  available_at  timestamptz not null default now(),
  locked_at     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- One entry per order per topic. This is what makes a webhook redelivery
-- converge instead of sending a second copy of the same ticket email.
create unique index if not exists ui_payment_outbox_order_topic
  on public.payment_outbox (order_id, topic);

-- Drives the worker's claim query.
create index if not exists idx_payment_outbox_claimable
  on public.payment_outbox (status, available_at)
  where status in ('pending', 'processing');

alter table public.payment_outbox enable row level security;

-- No policy and no grant to anon/authenticated: this table is service-role
-- only. RLS is enabled so that a future accidental grant still denies by
-- default rather than exposing buyer email payloads.
revoke all on table public.payment_outbox from public, anon, authenticated;
grant select, insert, update on table public.payment_outbox to service_role;

drop trigger if exists trg_payment_outbox_updated_at on public.payment_outbox;
create trigger trg_payment_outbox_updated_at
  before update on public.payment_outbox
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 3. The one completion path
-- ============================================================================

-- Output columns are prefixed. An earlier revision named them order_id and
-- payment_id, which shadowed the identically-named table columns inside the
-- body and made both the ledger lookup and the outbox ON CONFLICT target
-- ambiguous at runtime (42702). Prefixing removes the whole class.
drop function if exists public.fn_complete_order_payment(uuid, text, text, integer, text, jsonb);

create function public.fn_complete_order_payment(
  p_order_id       uuid,
  p_provider       text,
  p_ext_payment_id text,
  p_amount_cents   integer default null,
  p_currency       text default null,
  p_payload        jsonb default '{}'::jsonb
)
returns table (
  completed_order_id   uuid,
  completed_payment_id uuid,
  already_completed    boolean,
  issued_item_count    integer
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_order     public.orders%rowtype;
  v_payment   public.payments%rowtype;
  v_platform  integer;
  v_processor integer;
  v_gross     integer;
  v_issued    integer := 0;
begin
  if p_order_id is null then
    raise exception 'order_id_required' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_ext_payment_id), '') = '' then
    raise exception 'provider_reference_required' using errcode = 'P0001';
  end if;

  -- Serialise concurrent deliveries for this order. Everything below runs
  -- under this lock, so a duplicate webhook waits here and then takes the
  -- already-completed branch rather than double-crediting.
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;

  -- Idempotent success. The provider redelivers freely; the caller turns this
  -- into a 2xx so retries stop.
  if v_order.status = 'paid' then
    select * into v_payment from public.payments p
    where p.order_id = v_order.id and p.status = 'succeeded'
    order by p.created_at desc limit 1;

    select count(*)::integer into v_issued
    from public.order_items oi where oi.order_id = v_order.id and oi.status = 'issued';

    return query select v_order.id, v_payment.id, true, v_issued;
    return;
  end if;

  if v_order.status <> 'pending' then
    raise exception 'order_not_payable_from_status_%', v_order.status using errcode = 'P0001';
  end if;

  -- Amount/currency are verified against the provider by the caller too, but
  -- this is the last check before money is recorded and the only one holding
  -- the order lock.
  if p_amount_cents is not null and p_amount_cents <> v_order.total_cents then
    raise exception 'amount_mismatch_expected_%_got_%', v_order.total_cents, p_amount_cents using errcode = 'P0001';
  end if;
  if p_currency is not null and upper(p_currency) <> upper(v_order.currency) then
    raise exception 'currency_mismatch_expected_%_got_%', v_order.currency, p_currency using errcode = 'P0001';
  end if;

  -- 1. Payment. ON CONFLICT resolves the concurrent-delivery race that
  -- ui_payments_provider_ext would otherwise surface as an unhandled 23505.
  insert into public.payments (order_id, provider, amount_cents, currency, ext_payment_id, payload, status, channel)
  values (v_order.id, p_provider, v_order.total_cents, v_order.currency,
          p_ext_payment_id, coalesce(p_payload, '{}'::jsonb), 'succeeded', 'online')
  on conflict (provider, ext_payment_id) where ext_payment_id is not null
  do update set status = 'succeeded', payload = excluded.payload
  returning * into v_payment;

  -- A reference already recorded against a different order means the caller
  -- matched the wrong order. Refuse rather than credit the wrong buyer.
  if v_payment.order_id <> v_order.id then
    raise exception 'payment_reference_belongs_to_order_%', v_payment.order_id using errcode = 'P0001';
  end if;

  -- 2. Attempt bookkeeping.
  update public.payment_attempts pa
  set status = 'succeeded', payment_id = v_payment.id
  where pa.order_id = v_order.id and pa.provider = p_provider and pa.status = 'pending';

  -- 3. Settlement ledger, keyed to the payment so a retry cannot double-count.
  -- Mirrors buildLedgerEntries() in lib/payments-math.ts:
  --   order_gross + sum(fee) === payment_net
  if not exists (select 1 from public.ledger_entries le where le.payment_id = v_payment.id) then
    v_gross     := v_order.total_cents;
    v_platform  := coalesce(v_order.platform_fee_cents, 0);
    v_processor := coalesce(v_order.processor_fee_cents, 0);

    insert into public.ledger_entries (org_id, order_id, payment_id, type, amount_cents, currency, meta)
    values (v_order.org_id, v_order.id, v_payment.id, 'order_gross', v_gross, v_order.currency,
            jsonb_build_object('source', 'payment_completion'));

    if v_platform > 0 then
      insert into public.ledger_entries (org_id, order_id, payment_id, type, amount_cents, currency, meta)
      values (v_order.org_id, v_order.id, v_payment.id, 'fee', -v_platform, v_order.currency,
              jsonb_build_object('fee_type', 'platform'));
    end if;
    if v_processor > 0 then
      insert into public.ledger_entries (org_id, order_id, payment_id, type, amount_cents, currency, meta)
      values (v_order.org_id, v_order.id, v_payment.id, 'fee', -v_processor, v_order.currency,
              jsonb_build_object('fee_type', 'processor'));
    end if;

    insert into public.ledger_entries (org_id, order_id, payment_id, type, amount_cents, currency, meta)
    values (v_order.org_id, v_order.id, v_payment.id, 'payment_net',
            v_gross - v_platform - v_processor, v_order.currency,
            jsonb_build_object('source', 'payment_completion'));
  end if;

  -- 4. Issue the tickets.
  update public.order_items oi set status = 'issued'
  where oi.order_id = v_order.id and oi.status = 'pending';
  get diagnostics v_issued = row_count;

  -- 5. Flip the order. Same transaction as the items, which is the pairing
  -- that used to be able to tear.
  update public.orders o set status = 'paid' where o.id = v_order.id;

  -- In-app notification: durable queue, correct to write inline. Requires the
  -- widened type constraint from 20260725190000 -- before that migration this
  -- insert violated check_notifications_type_channel and aborted the whole
  -- completion transaction.
  if v_order.buyer_id is not null then
    insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
    values (v_order.buyer_id, 'payment_succeeded',
            jsonb_build_object('orderId', v_order.id, 'paymentId', v_payment.id,
                               'amountCents', v_order.total_cents, 'currency', v_order.currency),
            'pending', 'in_app', 'payment_succeeded:' || v_payment.id::text)
    on conflict do nothing;
  end if;

  -- External side effects: recorded now, performed after commit.
  insert into public.payment_outbox as ob (order_id, payment_id, topic, payload)
  values
    (v_order.id, v_payment.id, 'ticket_delivery', jsonb_build_object('orderId', v_order.id)),
    (v_order.id, v_payment.id, 'payment_succeeded',
     jsonb_build_object('orderId', v_order.id, 'paymentId', v_payment.id, 'orgId', v_order.org_id,
                        'buyerId', v_order.buyer_id, 'amountCents', v_order.total_cents,
                        'currency', v_order.currency))
  on conflict (order_id, topic) do nothing;

  return query select v_order.id, v_payment.id, false, v_issued;
end;
$function$;

revoke execute on function public.fn_complete_order_payment(uuid, text, text, integer, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.fn_complete_order_payment(uuid, text, text, integer, text, jsonb)
  to service_role;

-- ============================================================================
-- 4. Outbox worker
-- ============================================================================

-- Claim with FOR UPDATE SKIP LOCKED so two workers (the completing request and
-- the retry sweeper) never take the same row.
create or replace function public.fn_claim_payment_outbox(p_limit integer default 20)
returns setof public.payment_outbox
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  return query
  with claimed as (
    select id from public.payment_outbox
    where status in ('pending', 'processing')
      and available_at <= now()
      and attempts < 8
    order by available_at
    limit greatest(coalesce(p_limit, 20), 1)
    for update skip locked
  )
  update public.payment_outbox o
  set status = 'processing', attempts = o.attempts + 1, locked_at = now()
  from claimed
  where o.id = claimed.id
  returning o.*;
end;
$function$;

revoke execute on function public.fn_claim_payment_outbox(integer) from public, anon, authenticated;
grant execute on function public.fn_claim_payment_outbox(integer) to service_role;

-- Resolve a claimed entry. Failures back off exponentially and are retried
-- until attempts hits 8, at which point the row stays 'failed' for a human.
create or replace function public.fn_resolve_payment_outbox(
  p_id    uuid,
  p_ok    boolean,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_attempts integer;
begin
  if p_ok then
    update public.payment_outbox
    set status = 'done', last_error = null, locked_at = null
    where id = p_id;
    return;
  end if;

  select attempts into v_attempts from public.payment_outbox where id = p_id;
  if not found then return; end if;

  update public.payment_outbox
  set status = case when v_attempts >= 8 then 'failed' else 'pending' end,
      last_error = left(coalesce(p_error, 'unknown error'), 2000),
      -- 1m, 2m, 4m ... capped at ~1h
      available_at = now() + least(power(2, greatest(v_attempts, 1))::integer, 64) * interval '1 minute',
      locked_at = null
  where id = p_id;
end;
$function$;

revoke execute on function public.fn_resolve_payment_outbox(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.fn_resolve_payment_outbox(uuid, boolean, text) to service_role;
