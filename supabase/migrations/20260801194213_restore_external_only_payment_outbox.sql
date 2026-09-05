-- TICK-357: payment_outbox carries only post-commit external effects. The
-- in-app payment_succeeded notification is already inserted transactionally
-- into public.notifications and has no outbox worker handler.

delete from public.payment_outbox where topic <> 'ticket_delivery';

alter table public.payment_outbox
  drop constraint if exists payment_outbox_topic_check;

alter table public.payment_outbox
  add constraint payment_outbox_topic_check
  check (topic = 'ticket_delivery');

create or replace function public.fn_complete_order_payment(
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
  v_order    public.orders%rowtype;
  v_payment  public.payments%rowtype;
  v_platform integer;
  v_gross    integer;
  v_net      integer;
  v_issued   integer := 0;
begin
  if p_order_id is null then
    raise exception 'order_id_required' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_ext_payment_id), '') = '' then
    raise exception 'provider_reference_required' using errcode = 'P0001';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;

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

  if p_amount_cents is not null and p_amount_cents <> v_order.total_cents then
    raise exception 'amount_mismatch_expected_%_got_%', v_order.total_cents, p_amount_cents using errcode = 'P0001';
  end if;
  if p_currency is not null and upper(p_currency) <> upper(v_order.currency) then
    raise exception 'currency_mismatch_expected_%_got_%', v_order.currency, p_currency using errcode = 'P0001';
  end if;

  insert into public.payments (order_id, provider, amount_cents, currency, ext_payment_id, payload, status, channel)
  values (v_order.id, p_provider, v_order.total_cents, v_order.currency,
          p_ext_payment_id, coalesce(p_payload, '{}'::jsonb), 'succeeded', 'online')
  on conflict (provider, ext_payment_id) where ext_payment_id is not null
  do update set status = 'succeeded', payload = excluded.payload
  returning * into v_payment;

  if v_payment.order_id <> v_order.id then
    raise exception 'payment_reference_belongs_to_order_%', v_payment.order_id using errcode = 'P0001';
  end if;

  update public.payment_attempts pa
  set status = 'succeeded', payment_id = v_payment.id
  where pa.order_id = v_order.id and pa.provider = p_provider and pa.status = 'pending';

  -- Settlement has one organizer deduction. The processor cost remains on the
  -- order snapshot for Paystack reconciliation and never reduces payment_net.
  if not exists (select 1 from public.ledger_entries le where le.payment_id = v_payment.id) then
    v_gross    := v_order.total_cents;
    v_platform := coalesce(v_order.platform_fee_cents, 0);
    v_net      := coalesce(v_order.organizer_net_cents, v_gross - v_platform);

    insert into public.ledger_entries (org_id, order_id, payment_id, type, amount_cents, currency, meta)
    values (v_order.org_id, v_order.id, v_payment.id, 'order_gross', v_gross, v_order.currency,
            jsonb_build_object('source', 'payment_completion'));

    if v_platform > 0 then
      insert into public.ledger_entries (org_id, order_id, payment_id, type, amount_cents, currency, meta)
      values (v_order.org_id, v_order.id, v_payment.id, 'fee', -v_platform, v_order.currency,
              jsonb_build_object('fee_type', 'platform'));
    end if;

    insert into public.ledger_entries (org_id, order_id, payment_id, type, amount_cents, currency, meta)
    values (v_order.org_id, v_order.id, v_payment.id, 'payment_net', v_net, v_order.currency,
            jsonb_build_object('source', 'payment_completion'));
  end if;

  update public.order_items oi set status = 'issued'
  where oi.order_id = v_order.id and oi.status = 'pending';
  get diagnostics v_issued = row_count;

  update public.orders o set status = 'paid' where o.id = v_order.id;

  if v_order.buyer_id is not null then
    insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
    values (v_order.buyer_id, 'payment_succeeded',
            jsonb_build_object('orderId', v_order.id, 'paymentId', v_payment.id,
                               'amountCents', v_order.total_cents, 'currency', v_order.currency),
            'pending', 'in_app', 'payment_succeeded:' || v_payment.id::text)
    on conflict do nothing;
  end if;

  insert into public.payment_outbox as ob (order_id, payment_id, topic, payload)
  values (v_order.id, v_payment.id, 'ticket_delivery',
          jsonb_build_object('orderId', v_order.id))
  on conflict (order_id, topic) do nothing;

  return query select v_order.id, v_payment.id, false, v_issued;
end;
$function$;

revoke execute on function public.fn_complete_order_payment(uuid, text, text, integer, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.fn_complete_order_payment(uuid, text, text, integer, text, jsonb)
  to service_role;

comment on function public.fn_complete_order_payment(uuid, text, text, integer, text, jsonb) is
  'Atomically completes a verified payment. Settlement deducts one platform commission; payment_outbox carries only external ticket delivery.';
;
