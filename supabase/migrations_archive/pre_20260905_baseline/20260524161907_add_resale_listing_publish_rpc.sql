-- Seller-side resale listing publish RPC
-- Creates an active resale listing only for an eligible ticket owned by the signed-in user.

create or replace function public.fn_publish_resale_listing(
  p_order_item_id uuid,
  p_price_cents integer,
  p_listing_hours integer default 24
)
returns table (
  listing_id uuid,
  order_item_id uuid,
  price_cents integer,
  currency text,
  listing_expires_at timestamptz,
  transfer_fee_cents integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller_id uuid := auth.uid();
  v_item public.order_items%rowtype;
  v_order public.orders%rowtype;
  v_ticket_type public.ticket_types%rowtype;
  v_existing_listing_id uuid;
  v_listing_id uuid;
  v_listing_hours integer;
  v_expires_at timestamptz;
  v_transfer_fee_cents integer;
begin
  if v_seller_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if p_price_cents is null or p_price_cents <= 0 then
    raise exception 'listing price must be greater than zero' using errcode = 'P0001';
  end if;

  if p_price_cents > 100000000 then
    raise exception 'listing price is too high' using errcode = 'P0001';
  end if;

  v_listing_hours := least(168, greatest(1, coalesce(p_listing_hours, 24)));
  v_expires_at := now() + make_interval(hours => v_listing_hours);
  v_transfer_fee_cents := greatest(0, round(p_price_cents * 0.05)::integer);

  select * into v_item
  from public.order_items
  where id = p_order_item_id
  for update;

  if not found then
    raise exception 'ticket not found' using errcode = 'P0002';
  end if;

  select * into v_order
  from public.orders
  where id = v_item.order_id
  for update;

  if not found then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  if v_order.buyer_id <> v_seller_id then
    raise exception 'ticket does not belong to seller' using errcode = 'P0001';
  end if;

  if v_item.status <> 'issued' then
    raise exception 'ticket is not eligible for resale' using errcode = 'P0001';
  end if;

  if v_item.checked_in_at is not null then
    raise exception 'checked-in ticket cannot be listed' using errcode = 'P0001';
  end if;

  if v_item.revoked_at is not null then
    raise exception 'revoked ticket cannot be listed' using errcode = 'P0001';
  end if;

  if v_item.refunded_at is not null then
    raise exception 'refunded ticket cannot be listed' using errcode = 'P0001';
  end if;

  -- If this item came from a prior transfer/resale, allow listing by its current owner,
  -- but block items that already have an incomplete transfer record.
  if exists (
    select 1
    from public.transfers t
    where t.order_item_id = v_item.id
      and t.status not in ('completed', 'cancelled', 'declined', 'expired')
  ) then
    raise exception 'ticket has a pending transfer' using errcode = 'P0001';
  end if;

  select rl.id into v_existing_listing_id
  from public.resale_listings rl
  where rl.order_item_id = v_item.id
    and rl.status in ('active', 'pending', 'checkout_pending')
  limit 1;

  if v_existing_listing_id is not null then
    raise exception 'ticket is already listed' using errcode = 'P0001';
  end if;

  select * into v_ticket_type
  from public.ticket_types
  where id = v_item.ticket_type_id;

  if not found then
    raise exception 'ticket type not found' using errcode = 'P0002';
  end if;

  insert into public.resale_listings (
    order_item_id,
    seller_id,
    org_id,
    price_cents,
    currency,
    status,
    listing_expires_at,
    transfer_fee_cents,
    metadata
  ) values (
    v_item.id,
    v_seller_id,
    v_order.org_id,
    p_price_cents,
    v_ticket_type.currency,
    'active',
    v_expires_at,
    v_transfer_fee_cents,
    jsonb_build_object(
      'publishedBy', v_seller_id,
      'publishedAt', now(),
      'listingHours', v_listing_hours
    )
  ) returning id into v_listing_id;

  insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
  values (
    v_seller_id,
    'resale_listing_created',
    jsonb_build_object('listingId', v_listing_id, 'ticketId', v_item.id, 'orderId', v_order.id),
    'pending',
    'in_app',
    'resale_listing_created:' || v_listing_id::text || ':' || v_seller_id::text
  )
  on conflict do nothing;

  return query select v_listing_id, v_item.id, p_price_cents, v_ticket_type.currency, v_expires_at, v_transfer_fee_cents;
end;
$$;

revoke execute on function public.fn_publish_resale_listing(uuid, integer, integer) from public;
revoke execute on function public.fn_publish_resale_listing(uuid, integer, integer) from anon;
grant execute on function public.fn_publish_resale_listing(uuid, integer, integer) to authenticated;
;
