-- Waitlist checkout RPCs
--
-- This first RPC creates a pending checkout order/payment for an active waitlist offer.
-- It intentionally does not issue order_items. Ticket issuance should happen only after
-- a linked payment is marked succeeded by the payment provider.

create or replace function public.fn_create_waitlist_checkout_order(p_waitlist_id uuid)
returns table (
  order_id uuid,
  payment_id uuid,
  waitlist_id uuid,
  total_cents integer,
  currency text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer_id uuid := auth.uid();
  v_waitlist public.waitlists%rowtype;
  v_ticket_type public.ticket_types%rowtype;
  v_total_cents integer;
  v_order_id uuid;
  v_payment_id uuid;
begin
  if v_buyer_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select * into v_waitlist
  from public.waitlists
  where id = p_waitlist_id
  for update;

  if not found then
    raise exception 'waitlist offer not found' using errcode = 'P0002';
  end if;

  if v_waitlist.user_id <> v_buyer_id then
    raise exception 'waitlist offer does not belong to buyer' using errcode = 'P0001';
  end if;

  if lower(v_waitlist.status) not in ('offered', 'offer_available', 'notified') then
    raise exception 'waitlist offer is not available for checkout' using errcode = 'P0001';
  end if;

  if v_waitlist.offer_expires_at is null or v_waitlist.offer_expires_at <= now() then
    update public.waitlists
    set status = 'expired'
    where id = v_waitlist.id
      and lower(status) in ('offered', 'offer_available', 'notified');
    raise exception 'waitlist offer has expired' using errcode = 'P0001';
  end if;

  if v_waitlist.ticket_type_id is null then
    raise exception 'waitlist offer has no ticket type' using errcode = 'P0001';
  end if;

  select * into v_ticket_type
  from public.ticket_types
  where id = v_waitlist.ticket_type_id
  for update;

  if not found then
    raise exception 'ticket type not found' using errcode = 'P0002';
  end if;

  if v_ticket_type.event_id <> v_waitlist.event_id then
    raise exception 'ticket type does not match waitlist event' using errcode = 'P0001';
  end if;

  v_total_cents := coalesce(v_ticket_type.price_cents, 0) * greatest(1, coalesce(v_waitlist.quantity_requested, 1));

  insert into public.orders (
    org_id,
    buyer_id,
    total_cents,
    currency,
    status,
    channel,
    email,
    subtotal_cents,
    item_count,
    order_price_cents,
    order_currency,
    buyer_email
  ) values (
    (select org_id from public.events where id = v_waitlist.event_id),
    v_buyer_id,
    v_total_cents,
    v_ticket_type.currency,
    'pending',
    'online',
    coalesce(v_waitlist.email, (select email from auth.users where id = v_buyer_id)),
    v_total_cents,
    greatest(1, coalesce(v_waitlist.quantity_requested, 1)),
    v_total_cents,
    v_ticket_type.currency,
    coalesce(v_waitlist.email, (select email from auth.users where id = v_buyer_id))
  ) returning id into v_order_id;

  insert into public.payments (
    order_id,
    provider,
    amount_cents,
    currency,
    status,
    channel,
    payload
  ) values (
    v_order_id,
    'manual',
    v_total_cents,
    v_ticket_type.currency,
    'pending',
    'online',
    jsonb_build_object('kind', 'waitlist_checkout', 'waitlist_id', v_waitlist.id)
  ) returning id into v_payment_id;

  insert into public.payment_attempts (
    order_id,
    payment_id,
    provider,
    attempt_no,
    status,
    payload
  ) values (
    v_order_id,
    v_payment_id,
    'manual',
    1,
    'pending',
    jsonb_build_object('kind', 'waitlist_checkout', 'waitlist_id', v_waitlist.id)
  );

  update public.waitlists
  set status = 'checkout_pending'
  where id = v_waitlist.id;

  return query select v_order_id, v_payment_id, v_waitlist.id, v_total_cents, v_ticket_type.currency;
end;
$$;

create or replace function public.fn_complete_waitlist_after_payment(p_waitlist_id uuid, p_payment_id uuid)
returns table (
  waitlist_id uuid,
  order_id uuid,
  issued_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer_id uuid := auth.uid();
  v_waitlist public.waitlists%rowtype;
  v_ticket_type public.ticket_types%rowtype;
  v_payment public.payments%rowtype;
  v_order public.orders%rowtype;
  v_quantity integer;
  v_i integer;
  v_issued_count integer := 0;
begin
  if v_buyer_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select * into v_waitlist
  from public.waitlists
  where id = p_waitlist_id
  for update;

  if not found then
    raise exception 'waitlist offer not found' using errcode = 'P0002';
  end if;

  if v_waitlist.user_id <> v_buyer_id then
    raise exception 'waitlist offer does not belong to buyer' using errcode = 'P0001';
  end if;

  if lower(v_waitlist.status) not in ('checkout_pending', 'offered', 'offer_available', 'notified') then
    raise exception 'waitlist offer is not eligible for completion' using errcode = 'P0001';
  end if;

  select * into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'payment not found' using errcode = 'P0002';
  end if;

  if v_payment.status <> 'succeeded' then
    raise exception 'payment has not succeeded' using errcode = 'P0001';
  end if;

  if v_payment.payload ->> 'kind' is distinct from 'waitlist_checkout'
     or (v_payment.payload ->> 'waitlist_id')::uuid is distinct from v_waitlist.id then
    raise exception 'payment is not linked to this waitlist offer' using errcode = 'P0001';
  end if;

  select * into v_order
  from public.orders
  where id = v_payment.order_id
  for update;

  if not found then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  if v_order.buyer_id <> v_buyer_id then
    raise exception 'payment order does not belong to buyer' using errcode = 'P0001';
  end if;

  if v_waitlist.ticket_type_id is null then
    raise exception 'waitlist offer has no ticket type' using errcode = 'P0001';
  end if;

  select * into v_ticket_type
  from public.ticket_types
  where id = v_waitlist.ticket_type_id;

  if not found then
    raise exception 'ticket type not found' using errcode = 'P0002';
  end if;

  v_quantity := greatest(1, coalesce(v_waitlist.quantity_requested, 1));

  -- Idempotency guard: if this order already has issued items, do not issue duplicates.
  select count(*)::integer into v_issued_count
  from public.order_items
  where order_id = v_order.id
    and ticket_type_id = v_ticket_type.id;

  if v_issued_count = 0 then
    for v_i in 1..v_quantity loop
      insert into public.order_items (
        order_id,
        ticket_type_id,
        ticket_code,
        status,
        name,
        holder_name,
        holder_email
      ) values (
        v_order.id,
        v_ticket_type.id,
        upper(replace(gen_random_uuid()::text, '-', '')),
        'issued',
        v_ticket_type.name,
        trim(coalesce(v_waitlist.first_name, '') || ' ' || coalesce(v_waitlist.last_name, '')),
        coalesce(v_waitlist.email, v_order.buyer_email)
      );
      v_issued_count := v_issued_count + 1;
    end loop;
  end if;

  update public.orders
  set status = 'paid'
  where id = v_order.id;

  update public.payment_attempts
  set status = 'succeeded'
  where payment_id = v_payment.id;

  update public.waitlists
  set status = 'fulfilled'
  where id = v_waitlist.id;

  insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
  values (
    v_buyer_id,
    'waitlist_offer_fulfilled',
    jsonb_build_object('waitlistId', v_waitlist.id, 'orderId', v_order.id, 'eventId', v_waitlist.event_id),
    'pending',
    'in_app',
    'waitlist_offer_fulfilled:' || v_waitlist.id::text || ':' || v_buyer_id::text
  )
  on conflict do nothing;

  return query select v_waitlist.id, v_order.id, v_issued_count;
end;
$$;

revoke execute on function public.fn_create_waitlist_checkout_order(uuid) from public;
revoke execute on function public.fn_create_waitlist_checkout_order(uuid) from anon;
grant execute on function public.fn_create_waitlist_checkout_order(uuid) to authenticated;

revoke execute on function public.fn_complete_waitlist_after_payment(uuid, uuid) from public;
revoke execute on function public.fn_complete_waitlist_after_payment(uuid, uuid) from anon;
grant execute on function public.fn_complete_waitlist_after_payment(uuid, uuid) to authenticated;
;
