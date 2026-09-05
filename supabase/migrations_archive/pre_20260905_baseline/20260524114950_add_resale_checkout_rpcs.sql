-- Resale checkout RPCs
--
-- Design:
-- 1. fn_create_resale_checkout_order(listing_id) creates a pending reseller-channel order
--    and pending payment row for the authenticated buyer.
-- 2. fn_complete_resale_after_payment(listing_id, payment_id) completes the resale only
--    after a succeeded payment exists for that buyer order.
--
-- The completion function is intentionally idempotent-guarded by locking the listing row
-- and requiring status = active.

create or replace function public.fn_create_resale_checkout_order(p_listing_id uuid)
returns table (
  order_id uuid,
  payment_id uuid,
  listing_id uuid,
  total_cents integer,
  currency text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer_id uuid := auth.uid();
  v_listing public.resale_listings%rowtype;
  v_source_item public.order_items%rowtype;
  v_source_order public.orders%rowtype;
  v_total_cents integer;
  v_order_id uuid;
  v_payment_id uuid;
begin
  if v_buyer_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select * into v_listing
  from public.resale_listings
  where id = p_listing_id
  for update;

  if not found then
    raise exception 'listing not found' using errcode = 'P0002';
  end if;

  if v_listing.status <> 'active' then
    raise exception 'listing is not active' using errcode = 'P0001';
  end if;

  if v_listing.listing_expires_at is not null and v_listing.listing_expires_at <= now() then
    update public.resale_listings
    set status = 'expired', updated_at = now()
    where id = v_listing.id and status = 'active';
    raise exception 'listing has expired' using errcode = 'P0001';
  end if;

  if v_listing.seller_id = v_buyer_id then
    raise exception 'seller cannot buy their own listing' using errcode = 'P0001';
  end if;

  select * into v_source_item
  from public.order_items
  where id = v_listing.order_item_id
  for update;

  if not found then
    raise exception 'source ticket not found' using errcode = 'P0002';
  end if;

  if v_source_item.status <> 'issued' then
    raise exception 'source ticket is not eligible for resale' using errcode = 'P0001';
  end if;

  if v_source_item.checked_in_at is not null or v_source_item.revoked_at is not null or v_source_item.refunded_at is not null then
    raise exception 'source ticket is no longer eligible for resale' using errcode = 'P0001';
  end if;

  select * into v_source_order
  from public.orders
  where id = v_source_item.order_id;

  if not found then
    raise exception 'source order not found' using errcode = 'P0002';
  end if;

  v_total_cents := coalesce(v_listing.price_cents, 0) + coalesce(v_listing.transfer_fee_cents, 0);

  insert into public.orders (
    org_id,
    buyer_id,
    total_cents,
    currency,
    status,
    channel,
    subtotal_cents,
    item_count,
    order_price_cents,
    order_currency,
    buyer_email
  ) values (
    v_listing.org_id,
    v_buyer_id,
    v_total_cents,
    v_listing.currency,
    'pending',
    'reseller',
    v_listing.price_cents,
    1,
    v_listing.price_cents,
    v_listing.currency,
    (select email from auth.users where id = v_buyer_id)
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
    v_listing.currency,
    'pending',
    'reseller',
    jsonb_build_object('kind', 'resale_checkout', 'listing_id', v_listing.id)
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
    jsonb_build_object('kind', 'resale_checkout', 'listing_id', v_listing.id)
  );

  return query select v_order_id, v_payment_id, v_listing.id, v_total_cents, v_listing.currency;
end;
$$;

create or replace function public.fn_complete_resale_after_payment(p_listing_id uuid, p_payment_id uuid)
returns table (
  listing_id uuid,
  transfer_id uuid,
  buyer_order_id uuid,
  buyer_order_item_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer_id uuid := auth.uid();
  v_listing public.resale_listings%rowtype;
  v_source_item public.order_items%rowtype;
  v_payment public.payments%rowtype;
  v_buyer_order public.orders%rowtype;
  v_transfer_id uuid;
  v_new_item_id uuid;
begin
  if v_buyer_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select * into v_listing
  from public.resale_listings
  where id = p_listing_id
  for update;

  if not found then
    raise exception 'listing not found' using errcode = 'P0002';
  end if;

  if v_listing.status <> 'active' then
    raise exception 'listing is not active' using errcode = 'P0001';
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

  if v_payment.payload ->> 'kind' is distinct from 'resale_checkout'
     or (v_payment.payload ->> 'listing_id')::uuid is distinct from v_listing.id then
    raise exception 'payment is not linked to this resale listing' using errcode = 'P0001';
  end if;

  select * into v_buyer_order
  from public.orders
  where id = v_payment.order_id
  for update;

  if not found then
    raise exception 'buyer order not found' using errcode = 'P0002';
  end if;

  if v_buyer_order.buyer_id <> v_buyer_id then
    raise exception 'payment order does not belong to buyer' using errcode = 'P0001';
  end if;

  select * into v_source_item
  from public.order_items
  where id = v_listing.order_item_id
  for update;

  if not found then
    raise exception 'source ticket not found' using errcode = 'P0002';
  end if;

  if v_source_item.status <> 'issued' then
    raise exception 'source ticket is not eligible for transfer' using errcode = 'P0001';
  end if;

  if v_source_item.checked_in_at is not null or v_source_item.revoked_at is not null or v_source_item.refunded_at is not null then
    raise exception 'source ticket is no longer eligible for transfer' using errcode = 'P0001';
  end if;

  insert into public.transfers (
    order_item_id,
    from_user_id,
    to_user_id,
    status,
    metadata
  ) values (
    v_source_item.id,
    v_listing.seller_id,
    v_buyer_id,
    'completed',
    jsonb_build_object('kind', 'paid_resale', 'listing_id', v_listing.id, 'payment_id', v_payment.id)
  ) returning id into v_transfer_id;

  -- Transfer ownership by moving the ticket into a buyer-owned reseller order.
  -- The same ticket_code remains unique and valid; ownership follows the new order.
  update public.order_items
  set order_id = v_buyer_order.id,
      status = 'issued',
      transferred_from_order_item_id = v_source_item.id,
      updated_at = now()
  where id = v_source_item.id
  returning id into v_new_item_id;

  update public.orders
  set status = 'paid'
  where id = v_buyer_order.id;

  update public.payment_attempts
  set status = 'succeeded'
  where payment_id = v_payment.id;

  update public.resale_listings
  set status = 'sold',
      transfer_id = v_transfer_id,
      updated_at = now()
  where id = v_listing.id;

  insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
  values
    (v_buyer_id, 'resale_purchase_completed', jsonb_build_object('listingId', v_listing.id, 'transferId', v_transfer_id, 'ticketId', v_new_item_id), 'pending', 'in_app', 'resale_purchase_completed:' || v_listing.id::text || ':' || v_buyer_id::text),
    (v_listing.seller_id, 'resale_listing_sold', jsonb_build_object('listingId', v_listing.id, 'transferId', v_transfer_id, 'ticketId', v_new_item_id), 'pending', 'in_app', 'resale_listing_sold:' || v_listing.id::text || ':' || v_listing.seller_id::text)
  on conflict do nothing;

  return query select v_listing.id, v_transfer_id, v_buyer_order.id, v_new_item_id;
end;
$$;

grant execute on function public.fn_create_resale_checkout_order(uuid) to authenticated;
grant execute on function public.fn_complete_resale_after_payment(uuid, uuid) to authenticated;
;
