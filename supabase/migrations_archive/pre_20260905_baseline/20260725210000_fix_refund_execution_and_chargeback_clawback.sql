-- TICK-259 (refund execution) + TICK-258 (chargeback clawback with ledger
-- reversal).
--
-- ============================================================================
-- TICK-259: the refund path did not execute at all
-- ============================================================================
--
-- handle_refund_processed() fires on public.refunds and reads six fields that
-- do not exist on that table:
--
--   NEW.payload, NEW.org_id, NEW.order_id, NEW.user_id, NEW.reason,
--   NEW.refund_for_payout_id
--
-- refunds actually has: id, payment_id, amount_cents, currency, type, status,
-- provider_ref, provider_payload, initiated_by, created_at, processed_at.
--
-- PL/pgSQL resolves record fields at runtime, so this never failed at deploy
-- time and never failed in CI. It fails the first time any refund reaches
-- 'processed'. Demonstrated against the live database in a rolled-back
-- transaction:
--
--   update public.refunds set status='processed' where id = ...
--   -> 42703: record "new" has no field "payload"
--
-- So no refund could ever be marked processed: no refund_items row, no ledger
-- entry, no notification, and the transition aborted. The trigger is rewritten
-- below against the real schema, deriving org/order/buyer from the payment.
--
-- The 'reversal' branch is dropped rather than repaired. It keyed off
-- NEW.refund_for_payout_id -- a column that does not exist and never has --
-- and its own comment called it a "payout clawback placeholder". Chargeback
-- clawback is implemented properly below instead.
--
-- ============================================================================
-- Ledger sign convention (verified, not assumed)
-- ============================================================================
--
-- fn_org_finance_summary computes:
--
--   v_refunds  := sum(amount_cents) filter (where type = 'refund')
--   v_available := greatest(0, v_settled_net - v_refunds - v_committed)
--
-- It SUBTRACTS the refund total, so refund rows are stored POSITIVE. Writing
-- them negative would add money back on every refund. Reversals follow the
-- same convention and the summary is widened to subtract them too -- without
-- that, a chargeback would take the money but leave the organiser's available
-- balance untouched, which is worse than not recording it.

-- ============================================================================
-- 1. Make refunds actually process
-- ============================================================================

create or replace function public.handle_refund_processed()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_org            uuid;
  v_order          uuid;
  v_buyer          uuid;
  v_payment_amount integer;
  v_items          jsonb;
  oi               record;
begin
  -- Only act on the transition INTO 'processed'.
  if tg_op = 'UPDATE' then
    if old.status = 'processed' or new.status <> 'processed' then return new; end if;
  elsif tg_op = 'INSERT' then
    if new.status <> 'processed' then return new; end if;
  end if;

  -- refunds carries only payment_id; everything else is derived.
  select o.org_id, o.id, o.buyer_id, p.amount_cents
  into v_org, v_order, v_buyer, v_payment_amount
  from public.payments p
  join public.orders o on o.id = p.order_id
  where p.id = new.payment_id;

  if v_org is null then
    raise exception 'refund_payment_has_no_order:%', new.payment_id using errcode = 'P0002';
  end if;

  -- Per-item detail, when the caller supplied it, lives in provider_payload.
  v_items := case
    when new.provider_payload ? 'items' and jsonb_typeof(new.provider_payload->'items') = 'array'
      then new.provider_payload->'items'
    else null
  end;

  if v_items is not null then
    for oi in
      select * from jsonb_to_recordset(v_items) as (order_item_id uuid, amount_cents int, currency text)
    loop
      insert into public.refund_items (refund_id, order_item_id, amount_cents, currency, user_id)
      values (new.id, oi.order_item_id, oi.amount_cents, coalesce(oi.currency, new.currency), v_buyer)
      on conflict do nothing;

      if oi.order_item_id is not null then
        update public.order_items
        set refunded_at = coalesce(refunded_at, now()), status = 'refunded'
        where id = oi.order_item_id;
      end if;

      insert into public.ledger_entries (org_id, order_id, payment_id, refund_id, type, amount_cents, currency, meta)
      values (v_org, v_order, new.payment_id, new.id, 'refund',
              oi.amount_cents, coalesce(oi.currency, new.currency),
              jsonb_build_object('order_item_id', oi.order_item_id));
    end loop;
  else
    insert into public.refund_items (refund_id, order_item_id, amount_cents, currency, user_id)
    values (new.id, null, coalesce(new.amount_cents, 0), new.currency, v_buyer)
    on conflict do nothing;

    insert into public.ledger_entries (org_id, order_id, payment_id, refund_id, type, amount_cents, currency, meta)
    values (v_org, v_order, new.payment_id, new.id, 'refund',
            coalesce(new.amount_cents, 0), new.currency,
            jsonb_build_object('source', 'refund_processed'));

    -- A refund with no per-item detail that covers the whole payment is a full
    -- refund, so every ticket on the order stops being valid. Without this the
    -- buyer keeps a scannable 'issued' ticket after getting their money back.
    -- Partial refunds are left alone deliberately: there is no way to tell
    -- which tickets they were for, and revoking the wrong one is worse than
    -- revoking none.
    if coalesce(new.amount_cents, 0) >= coalesce(v_payment_amount, 0) then
      update public.order_items
      set status = 'refunded', refunded_at = coalesce(refunded_at, now())
      where order_id = v_order
        and status in ('pending', 'issued', 'transferred');
    end if;
  end if;

  if v_buyer is not null then
    insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
    values (v_buyer, 'refund_alert',
            jsonb_build_object('refundId', new.id, 'orderId', v_order,
                               'amountCents', coalesce(new.amount_cents, 0), 'currency', new.currency),
            'pending', 'email', 'refund_alert:' || new.id::text)
    on conflict do nothing;
  end if;

  return new;
end;
$function$;

-- ============================================================================
-- 2. Chargeback clawback (TICK-258)
-- ============================================================================

-- A chargeback is the provider taking money back after we have already issued
-- tickets. It is not a refund we chose to make, so it gets its own ledger type
-- ('reversal') and revokes the tickets rather than refunding them.
--
-- service_role only: this is only ever reached from a verified provider
-- webhook, never from a browser.
create or replace function public.fn_record_chargeback(
  p_payment_id   uuid,
  p_provider_ref text default null,
  p_amount_cents integer default null,
  p_payload      jsonb default '{}'::jsonb
)
returns table (
  chargeback_payment_id uuid,
  chargeback_order_id   uuid,
  already_recorded      boolean,
  revoked_item_count    integer
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_payment public.payments%rowtype;
  v_order   public.orders%rowtype;
  v_amount  integer;
  v_revoked integer := 0;
begin
  if p_payment_id is null then
    raise exception 'payment_id_required' using errcode = 'P0001';
  end if;

  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'payment_not_found' using errcode = 'P0002';
  end if;

  select * into v_order from public.orders where id = v_payment.order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;

  -- Idempotent: providers redeliver dispute webhooks.
  if v_payment.status = 'chargeback' then
    select count(*)::integer into v_revoked
    from public.order_items oi where oi.order_id = v_order.id and oi.status = 'revoked';
    return query select v_payment.id, v_order.id, true, v_revoked;
    return;
  end if;

  v_amount := coalesce(p_amount_cents, v_payment.amount_cents);

  update public.payments
  set status = 'chargeback',
      payload = coalesce(payload, '{}'::jsonb) || jsonb_build_object('chargeback', coalesce(p_payload, '{}'::jsonb))
  where id = v_payment.id;

  -- The tickets are no longer paid for. Revoke rather than refund: 'refunded'
  -- means we returned the money deliberately, which is not what happened.
  update public.order_items oi
  set status = 'revoked'
  where oi.order_id = v_order.id
    and oi.status in ('pending', 'issued', 'transferred');
  get diagnostics v_revoked = row_count;

  update public.orders set status = 'refunded' where id = v_order.id;

  -- Positive, matching the refund convention: the finance summary subtracts it.
  insert into public.ledger_entries (org_id, order_id, payment_id, type, amount_cents, currency, meta)
  values (v_order.org_id, v_order.id, v_payment.id, 'reversal', v_amount, v_order.currency,
          jsonb_build_object('source', 'chargeback', 'provider_ref', p_provider_ref));

  if v_order.buyer_id is not null then
    insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
    values (v_order.buyer_id, 'refund_alert',
            jsonb_build_object('orderId', v_order.id, 'paymentId', v_payment.id,
                               'amountCents', v_amount, 'currency', v_order.currency,
                               'kind', 'chargeback'),
            'pending', 'email', 'chargeback:' || v_payment.id::text)
    on conflict do nothing;
  end if;

  return query select v_payment.id, v_order.id, false, v_revoked;
end;
$function$;

revoke execute on function public.fn_record_chargeback(uuid, text, integer, jsonb)
  from public, anon, authenticated;
grant execute on function public.fn_record_chargeback(uuid, text, integer, jsonb) to service_role;

-- ============================================================================
-- 3. Make the clawback actually reduce the organiser's balance
-- ============================================================================

-- fn_org_finance_summary subtracted only 'refund'. A 'reversal' row had no
-- effect on available balance, so a chargeback would take money from the
-- platform while the organiser could still withdraw against it.
do $$
declare
  v_def text;
  v_new text;
begin
  for v_def in
    select pg_get_functiondef(p.oid)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('fn_org_finance_summary', 'fn_org_finance_summary_unchecked')
  loop
    v_new := replace(
      v_def,
      'filter (where type = ''refund'')',
      'filter (where type in (''refund'', ''reversal''))'
    );
    if v_new <> v_def then
      execute v_new;
    end if;
  end loop;
end $$;
