-- TICK-259 + TICK-258. Full rationale in
-- supabase/migrations/20260725210000_fix_refund_execution_and_chargeback_clawback.sql

create or replace function public.handle_refund_processed()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_org   uuid;
  v_order uuid;
  v_buyer uuid;
  v_items jsonb;
  oi      record;
begin
  if tg_op = 'UPDATE' then
    if old.status = 'processed' or new.status <> 'processed' then return new; end if;
  elsif tg_op = 'INSERT' then
    if new.status <> 'processed' then return new; end if;
  end if;

  select o.org_id, o.id, o.buyer_id
  into v_org, v_order, v_buyer
  from public.payments p
  join public.orders o on o.id = p.order_id
  where p.id = new.payment_id;

  if v_org is null then
    raise exception 'refund_payment_has_no_order:%', new.payment_id using errcode = 'P0002';
  end if;

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

  update public.order_items oi
  set status = 'revoked'
  where oi.order_id = v_order.id
    and oi.status in ('pending', 'issued', 'transferred');
  get diagnostics v_revoked = row_count;

  update public.orders set status = 'refunded' where id = v_order.id;

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

revoke execute on function public.fn_record_chargeback(uuid, text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.fn_record_chargeback(uuid, text, integer, jsonb) to service_role;

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
    v_new := replace(v_def, 'filter (where type = ''refund'')',
                            'filter (where type in (''refund'', ''reversal''))');
    if v_new <> v_def then
      execute v_new;
    end if;
  end loop;
end $$;;
