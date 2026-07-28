-- Rate-limit rollout (control #7): checkout / order creation.
--
-- Dated after main's latest migration (20260725220000) on purpose: these
-- rate-limit rollouts CREATE OR REPLACE functions that main's claimed-account
-- refactor (20260721190000 / 20260721210000) and later hardening also touch, so
-- they must apply LAST on a fresh replay to sit on top of the final bodies.
--
-- fn_create_inventory_protected_order is NOT part of the claimed-account
-- refactor (guest checkout is allowed), so it stays a single monolithic
-- function. Body reproduced verbatim from the deployed version; only the
-- fn_rate_limit guard is added, right after the four entry validations and
-- before any inventory/pricing work, so a rapid-fire caller is rejected before
-- touching the row locks. Complements the per-ticket per_user_limit / quota /
-- 10-minute holds. Limit: 10 per buyer per minute.

create or replace function public.fn_create_inventory_protected_order(p_event_id uuid, p_buyer_id uuid, p_buyer_email text, p_items jsonb, p_holder_name text DEFAULT NULL::text)
 returns TABLE(order_row jsonb, order_items jsonb)
 language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_order_id uuid; v_org_id uuid; v_currency text;
  v_subtotal_cents integer := 0; v_total_cents integer := 0; v_item_count integer := 0;
  v_ticket_type record; v_requested_qty integer; v_reserved_qty integer; v_existing_user_qty integer;
  v_channel_row record; v_hold_window interval := interval '10 minutes';
  v_order_row jsonb; v_order_items jsonb;
begin
  if p_event_id is null then raise exception 'event_id_required' using errcode = 'P0001'; end if;
  if p_buyer_id is null then raise exception 'buyer_id_required' using errcode = 'P0001'; end if;
  if p_buyer_email is null or length(trim(p_buyer_email)) = 0 then
    raise exception 'buyer_email_required' using errcode = 'P0001';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items_required' using errcode = 'P0001';
  end if;

  if not public.fn_rate_limit('checkout:' || p_buyer_id::text, 10, 60) then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  create temporary table if not exists pg_temp.checkout_items (
    ticket_type_id uuid primary key,
    quantity integer not null check (quantity > 0)
  ) on commit drop;
  truncate table pg_temp.checkout_items;

  insert into pg_temp.checkout_items(ticket_type_id, quantity)
  select (item->>'ticketTypeId')::uuid,
         greatest(1, floor(coalesce(nullif(item->>'quantity', '')::numeric, 1))::integer)
  from jsonb_array_elements(p_items) as item
  where item ? 'ticketTypeId'
  on conflict (ticket_type_id) do update
    set quantity = pg_temp.checkout_items.quantity + excluded.quantity;

  if not exists (select 1 from pg_temp.checkout_items) then
    raise exception 'items_required' using errcode = 'P0001';
  end if;

  perform 1 from public.ticket_types tt
  join pg_temp.checkout_items ci on ci.ticket_type_id = tt.id
  where tt.event_id = p_event_id order by tt.id for update of tt;

  if (select count(*) from pg_temp.checkout_items) <> (
    select count(*) from public.ticket_types tt
    join pg_temp.checkout_items ci on ci.ticket_type_id = tt.id
    where tt.event_id = p_event_id
  ) then
    raise exception 'ticket_type_not_found' using errcode = 'P0001';
  end if;

  for v_ticket_type in
    select tt.id, tt.event_id, tt.name, tt.price_cents, tt.currency, tt.quota, tt.per_user_limit,
           coalesce(tt.sales_status::text, 'on_sale') as sales_status,
           e.org_id, e.status as event_status, ci.quantity
    from public.ticket_types tt
    join public.events e on e.id = tt.event_id
    join pg_temp.checkout_items ci on ci.ticket_type_id = tt.id
    where tt.event_id = p_event_id order by tt.id
  loop
    v_requested_qty := v_ticket_type.quantity;
    if v_ticket_type.event_status <> 'published' then
      raise exception 'event_not_available' using errcode = 'P0001';
    end if;
    if v_ticket_type.sales_status <> 'on_sale' then
      raise exception 'ticket_type_not_on_sale:%', v_ticket_type.name using errcode = 'P0001';
    end if;

    select count(*)::integer into v_existing_user_qty
    from public.order_items oi join public.orders o on o.id = oi.order_id
    where oi.ticket_type_id = v_ticket_type.id and o.buyer_id = p_buyer_id
      and oi.status in ('pending','issued','transferred','checked_in')
      and (o.status = 'paid' or (o.status = 'pending' and (o.hold_expires_at is null or o.hold_expires_at > now())));

    if v_ticket_type.per_user_limit is not null and v_ticket_type.per_user_limit > 0
       and (v_existing_user_qty + v_requested_qty) > v_ticket_type.per_user_limit then
      raise exception 'per_user_limit_exceeded:%', v_ticket_type.name using errcode = 'P0001';
    end if;

    if exists (select 1 from public.ticket_type_channels c where c.ticket_type_id = v_ticket_type.id) then
      select c.quota, c.per_order_limit into v_channel_row
      from public.ticket_type_channels c
      where c.ticket_type_id = v_ticket_type.id and c.channel = 'online'::public.sales_channel;
      if not found then
        raise exception 'channel_not_available:%', v_ticket_type.name using errcode = 'P0001';
      end if;
      if v_channel_row.per_order_limit is not null and v_channel_row.per_order_limit > 0
         and v_requested_qty > v_channel_row.per_order_limit then
        raise exception 'channel_per_order_limit_exceeded:%', v_ticket_type.name using errcode = 'P0001';
      end if;
      if v_channel_row.quota is not null and v_channel_row.quota >= 0 then
        select count(*)::integer into v_reserved_qty
        from public.order_items oi join public.orders o on o.id = oi.order_id
        where oi.ticket_type_id = v_ticket_type.id and o.channel = 'online'::public.sales_channel
          and oi.status in ('pending','issued','transferred','checked_in')
          and (o.status = 'paid' or (o.status = 'pending' and (o.hold_expires_at is null or o.hold_expires_at > now())));
        if (v_reserved_qty + v_requested_qty) > v_channel_row.quota then
          raise exception 'channel_sold_out:%', v_ticket_type.name using errcode = 'P0001';
        end if;
      end if;
    end if;

    select count(*)::integer into v_reserved_qty
    from public.order_items oi join public.orders o on o.id = oi.order_id
    where oi.ticket_type_id = v_ticket_type.id
      and oi.status in ('pending','issued','transferred','checked_in')
      and (o.status = 'paid' or (o.status = 'pending' and (o.hold_expires_at is null or o.hold_expires_at > now())));

    if v_ticket_type.quota is not null and v_ticket_type.quota >= 0 and (v_reserved_qty + v_requested_qty) > v_ticket_type.quota then
      raise exception 'sold_out:%', v_ticket_type.name using errcode = 'P0001';
    end if;

    v_org_id := coalesce(v_org_id, v_ticket_type.org_id);
    v_currency := coalesce(v_currency, v_ticket_type.currency, 'SZL');
    v_subtotal_cents := v_subtotal_cents + (v_ticket_type.price_cents * v_requested_qty);
    v_item_count := v_item_count + v_requested_qty;
  end loop;

  v_total_cents := v_subtotal_cents;

  insert into public.orders (
    org_id, buyer_id, email, buyer_email, total_cents, subtotal_cents, item_count,
    platform_fee_cents, processor_fee_cents, currency, order_currency,
    order_price_cents, order_platform_fee_cents, order_processor_fee_cents,
    status, channel, hold_expires_at
  ) values (
    v_org_id, p_buyer_id, p_buyer_email, p_buyer_email, v_total_cents, v_subtotal_cents, v_item_count,
    0, 0, v_currency, v_currency, v_subtotal_cents, 0, 0, 'pending', 'online', now() + v_hold_window
  ) returning id into v_order_id;

  insert into public.order_items (order_id, ticket_type_id, ticket_code, status, holder_name, holder_email)
  select v_order_id, ci.ticket_type_id, gen_random_uuid()::text, 'pending',
         nullif(trim(coalesce(p_holder_name, '')), ''), p_buyer_email
  from pg_temp.checkout_items ci
  cross join lateral generate_series(1, ci.quantity);

  select to_jsonb(o.*) into v_order_row from public.orders o where o.id = v_order_id;
  select coalesce(jsonb_agg(to_jsonb(oi.*) order by oi.created_at, oi.id), '[]'::jsonb) into v_order_items
  from public.order_items oi where oi.order_id = v_order_id;

  return query select v_order_row, v_order_items;
end;
$function$;
