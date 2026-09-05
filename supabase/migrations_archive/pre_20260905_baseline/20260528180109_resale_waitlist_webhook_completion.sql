create or replace function public.fn_complete_resale_after_payment_webhook(p_payment_id uuid)
returns table(listing_id uuid, transfer_id uuid, buyer_order_id uuid, buyer_order_item_id uuid, already_completed boolean)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_payment public.payments%rowtype;
  v_listing public.resale_listings%rowtype;
  v_listing_id uuid;
  v_buyer_id uuid;
  v_source_item public.order_items%rowtype;
  v_buyer_order public.orders%rowtype;
  v_transfer_id uuid;
  v_new_item_id uuid;
begin
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then raise exception 'payment not found' using errcode = 'P0002'; end if;
  if v_payment.status <> 'succeeded' then raise exception 'payment has not succeeded' using errcode = 'P0001'; end if;
  if v_payment.payload ->> 'kind' is distinct from 'resale_checkout' then raise exception 'payment is not a resale checkout' using errcode = 'P0001'; end if;

  v_listing_id := (v_payment.payload ->> 'listing_id')::uuid;

  select * into v_listing from public.resale_listings where id = v_listing_id for update;
  if not found then raise exception 'listing not found' using errcode = 'P0002'; end if;

  select * into v_buyer_order from public.orders where id = v_payment.order_id for update;
  if not found then raise exception 'buyer order not found' using errcode = 'P0002'; end if;
  v_buyer_id := v_buyer_order.buyer_id;

  if v_listing.status = 'sold' then
    select id into v_new_item_id from public.order_items
    where order_id = v_buyer_order.id and transferred_from_order_item_id = v_listing.order_item_id
    limit 1;
    return query select v_listing.id, v_listing.transfer_id, v_buyer_order.id, v_new_item_id, true;
    return;
  end if;

  if v_listing.status <> 'active' then raise exception 'listing is not active' using errcode = 'P0001'; end if;

  select * into v_source_item from public.order_items where id = v_listing.order_item_id for update;
  if not found then raise exception 'source ticket not found' using errcode = 'P0002'; end if;
  if v_source_item.status <> 'issued'
     or v_source_item.checked_in_at is not null
     or v_source_item.revoked_at is not null
     or v_source_item.refunded_at is not null then
    raise exception 'source ticket is no longer eligible for transfer' using errcode = 'P0001';
  end if;

  insert into public.transfers (order_item_id, from_user_id, to_user_id, status, metadata)
  values (
    v_source_item.id, v_listing.seller_id, v_buyer_id, 'completed',
    jsonb_build_object('kind', 'paid_resale', 'listing_id', v_listing.id, 'payment_id', v_payment.id, 'via', 'webhook')
  ) returning id into v_transfer_id;

  update public.order_items
  set order_id = v_buyer_order.id, status = 'issued', transferred_from_order_item_id = v_source_item.id, updated_at = now()
  where id = v_source_item.id
  returning id into v_new_item_id;

  update public.orders set status = 'paid' where id = v_buyer_order.id;
  update public.payment_attempts set status = 'succeeded' where payment_id = v_payment.id;
  update public.resale_listings set status = 'sold', transfer_id = v_transfer_id, updated_at = now() where id = v_listing.id;

  insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
  values
    (v_buyer_id, 'resale_purchase_completed', jsonb_build_object('listingId', v_listing.id, 'transferId', v_transfer_id, 'ticketId', v_new_item_id), 'pending', 'in_app', 'resale_purchase_completed:' || v_listing.id::text || ':' || v_buyer_id::text),
    (v_listing.seller_id, 'resale_listing_sold', jsonb_build_object('listingId', v_listing.id, 'transferId', v_transfer_id, 'ticketId', v_new_item_id), 'pending', 'in_app', 'resale_listing_sold:' || v_listing.id::text || ':' || v_listing.seller_id::text)
  on conflict do nothing;

  return query select v_listing.id, v_transfer_id, v_buyer_order.id, v_new_item_id, false;
end;
$function$;

revoke execute on function public.fn_complete_resale_after_payment_webhook(uuid) from public, anon, authenticated;

create or replace function public.fn_complete_waitlist_after_payment_webhook(p_payment_id uuid)
returns table(waitlist_id uuid, order_id uuid, issued_count integer, already_completed boolean)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_payment public.payments%rowtype;
  v_waitlist public.waitlists%rowtype;
  v_waitlist_id uuid;
  v_ticket_type public.ticket_types%rowtype;
  v_order public.orders%rowtype;
  v_quantity integer;
  v_i integer;
  v_issued_count integer := 0;
begin
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then raise exception 'payment not found' using errcode = 'P0002'; end if;
  if v_payment.status <> 'succeeded' then raise exception 'payment has not succeeded' using errcode = 'P0001'; end if;
  if v_payment.payload ->> 'kind' is distinct from 'waitlist_checkout' then raise exception 'payment is not a waitlist checkout' using errcode = 'P0001'; end if;

  v_waitlist_id := (v_payment.payload ->> 'waitlist_id')::uuid;

  select * into v_waitlist from public.waitlists where id = v_waitlist_id for update;
  if not found then raise exception 'waitlist offer not found' using errcode = 'P0002'; end if;

  select * into v_order from public.orders where id = v_payment.order_id for update;
  if not found then raise exception 'order not found' using errcode = 'P0002'; end if;

  if lower(v_waitlist.status) = 'fulfilled' then
    select count(*)::integer into v_issued_count from public.order_items where order_id = v_order.id;
    return query select v_waitlist.id, v_order.id, v_issued_count, true;
    return;
  end if;

  if v_waitlist.ticket_type_id is null then raise exception 'waitlist offer has no ticket type' using errcode = 'P0001'; end if;

  select * into v_ticket_type from public.ticket_types where id = v_waitlist.ticket_type_id;
  if not found then raise exception 'ticket type not found' using errcode = 'P0002'; end if;

  v_quantity := greatest(1, coalesce(v_waitlist.quantity_requested, 1));

  select count(*)::integer into v_issued_count
  from public.order_items where order_id = v_order.id and ticket_type_id = v_ticket_type.id;

  if v_issued_count = 0 then
    for v_i in 1..v_quantity loop
      insert into public.order_items (order_id, ticket_type_id, ticket_code, status, name, holder_name, holder_email)
      values (
        v_order.id, v_ticket_type.id, upper(replace(gen_random_uuid()::text, '-', '')), 'issued',
        v_ticket_type.name,
        trim(coalesce(v_waitlist.first_name, '') || ' ' || coalesce(v_waitlist.last_name, '')),
        coalesce(v_waitlist.email, v_order.buyer_email)
      );
      v_issued_count := v_issued_count + 1;
    end loop;
  end if;

  update public.orders set status = 'paid' where id = v_order.id;
  update public.payment_attempts set status = 'succeeded' where payment_id = v_payment.id;
  update public.waitlists set status = 'fulfilled' where id = v_waitlist.id;

  insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
  values (
    v_order.buyer_id, 'waitlist_offer_fulfilled',
    jsonb_build_object('waitlistId', v_waitlist.id, 'orderId', v_order.id, 'eventId', v_waitlist.event_id),
    'pending', 'in_app',
    'waitlist_offer_fulfilled:' || v_waitlist.id::text || ':' || v_order.buyer_id::text
  )
  on conflict do nothing;

  return query select v_waitlist.id, v_order.id, v_issued_count, false;
end;
$function$;

revoke execute on function public.fn_complete_waitlist_after_payment_webhook(uuid) from public, anon, authenticated;;
