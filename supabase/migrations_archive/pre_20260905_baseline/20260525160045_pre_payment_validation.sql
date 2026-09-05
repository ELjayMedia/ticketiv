-- TICK-46: pre-payment validation hardening.

-- 1. Pending-order hold expiry
alter table public.orders
  add column if not exists hold_expires_at timestamptz;

create index if not exists idx_orders_pending_hold_expiry
  on public.orders (hold_expires_at)
  where status = 'pending';

-- 2. Replace fn_create_inventory_protected_order with a hardened version.
create or replace function public.fn_create_inventory_protected_order(
  p_event_id uuid,
  p_buyer_id uuid,
  p_buyer_email text,
  p_items jsonb,
  p_holder_name text default null
)
returns table(order_row jsonb, order_items jsonb)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_order_id uuid;
  v_org_id uuid;
  v_currency text;
  v_subtotal_cents integer := 0;
  v_total_cents integer := 0;
  v_item_count integer := 0;
  v_ticket_type record;
  v_requested_qty integer;
  v_reserved_qty integer;
  v_existing_user_qty integer;
  v_channel_row record;
  v_hold_window interval := interval '10 minutes';
  v_order_row jsonb;
  v_order_items jsonb;
begin
  if p_event_id is null then raise exception 'event_id_required' using errcode = 'P0001'; end if;
  if p_buyer_id is null then raise exception 'buyer_id_required' using errcode = 'P0001'; end if;
  if p_buyer_email is null or length(trim(p_buyer_email)) = 0 then
    raise exception 'buyer_email_required' using errcode = 'P0001';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items_required' using errcode = 'P0001';
  end if;

  create temporary table if not exists pg_temp.checkout_items (
    ticket_type_id uuid primary key,
    quantity integer not null check (quantity > 0)
  ) on commit drop;
  truncate table pg_temp.checkout_items;

  insert into pg_temp.checkout_items(ticket_type_id, quantity)
  select
    (item->>'ticketTypeId')::uuid,
    greatest(1, floor(coalesce(nullif(item->>'quantity', '')::numeric, 1))::integer)
  from jsonb_array_elements(p_items) as item
  where item ? 'ticketTypeId'
  on conflict (ticket_type_id) do update
    set quantity = pg_temp.checkout_items.quantity + excluded.quantity;

  if not exists (select 1 from pg_temp.checkout_items) then
    raise exception 'items_required' using errcode = 'P0001';
  end if;

  perform 1
  from public.ticket_types tt
  join pg_temp.checkout_items ci on ci.ticket_type_id = tt.id
  where tt.event_id = p_event_id
  order by tt.id
  for update of tt;

  if (select count(*) from pg_temp.checkout_items) <> (
    select count(*) from public.ticket_types tt
    join pg_temp.checkout_items ci on ci.ticket_type_id = tt.id
    where tt.event_id = p_event_id
  ) then
    raise exception 'ticket_type_not_found' using errcode = 'P0001';
  end if;

  for v_ticket_type in
    select
      tt.id, tt.event_id, tt.name, tt.price_cents, tt.currency,
      tt.quota, tt.per_user_limit,
      coalesce(tt.sales_status::text, 'on_sale') as sales_status,
      e.org_id, e.status as event_status, ci.quantity
    from public.ticket_types tt
    join public.events e on e.id = tt.event_id
    join pg_temp.checkout_items ci on ci.ticket_type_id = tt.id
    where tt.event_id = p_event_id
    order by tt.id
  loop
    v_requested_qty := v_ticket_type.quantity;

    if v_ticket_type.event_status <> 'published' then
      raise exception 'event_not_available' using errcode = 'P0001';
    end if;
    if v_ticket_type.sales_status <> 'on_sale' then
      raise exception 'ticket_type_not_on_sale:%', v_ticket_type.name using errcode = 'P0001';
    end if;

    select count(*)::integer into v_existing_user_qty
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.ticket_type_id = v_ticket_type.id
      and o.buyer_id = p_buyer_id
      and oi.status in ('pending', 'issued', 'transferred', 'checked_in')
      and (
        o.status = 'paid'
        or (o.status = 'pending' and (o.hold_expires_at is null or o.hold_expires_at > now()))
      );

    if v_ticket_type.per_user_limit is not null
       and v_ticket_type.per_user_limit > 0
       and (v_existing_user_qty + v_requested_qty) > v_ticket_type.per_user_limit then
      raise exception 'per_user_limit_exceeded:%', v_ticket_type.name using errcode = 'P0001';
    end if;

    if exists (select 1 from public.ticket_type_channels c where c.ticket_type_id = v_ticket_type.id) then
      select c.quota, c.per_order_limit into v_channel_row
      from public.ticket_type_channels c
      where c.ticket_type_id = v_ticket_type.id
        and c.channel = 'online'::public.sales_channel;

      if not found then
        raise exception 'channel_not_available:%', v_ticket_type.name using errcode = 'P0001';
      end if;

      if v_channel_row.per_order_limit is not null
         and v_channel_row.per_order_limit > 0
         and v_requested_qty > v_channel_row.per_order_limit then
        raise exception 'channel_per_order_limit_exceeded:%', v_ticket_type.name using errcode = 'P0001';
      end if;

      if v_channel_row.quota is not null and v_channel_row.quota >= 0 then
        select count(*)::integer into v_reserved_qty
        from public.order_items oi
        join public.orders o on o.id = oi.order_id
        where oi.ticket_type_id = v_ticket_type.id
          and o.channel = 'online'::public.sales_channel
          and oi.status in ('pending', 'issued', 'transferred', 'checked_in')
          and (
            o.status = 'paid'
            or (o.status = 'pending' and (o.hold_expires_at is null or o.hold_expires_at > now()))
          );
        if (v_reserved_qty + v_requested_qty) > v_channel_row.quota then
          raise exception 'channel_sold_out:%', v_ticket_type.name using errcode = 'P0001';
        end if;
      end if;
    end if;

    select count(*)::integer into v_reserved_qty
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.ticket_type_id = v_ticket_type.id
      and oi.status in ('pending', 'issued', 'transferred', 'checked_in')
      and (
        o.status = 'paid'
        or (o.status = 'pending' and (o.hold_expires_at is null or o.hold_expires_at > now()))
      );

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
    org_id, buyer_id, email, buyer_email,
    total_cents, subtotal_cents, item_count,
    platform_fee_cents, processor_fee_cents,
    currency, order_currency,
    order_price_cents, order_platform_fee_cents, order_processor_fee_cents,
    status, channel, hold_expires_at
  ) values (
    v_org_id, p_buyer_id, p_buyer_email, p_buyer_email,
    v_total_cents, v_subtotal_cents, v_item_count,
    0, 0,
    v_currency, v_currency,
    v_subtotal_cents, 0, 0,
    'pending', 'online', now() + v_hold_window
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id, ticket_type_id, ticket_code, status, holder_name, holder_email
  )
  select
    v_order_id,
    ci.ticket_type_id,
    gen_random_uuid()::text,
    'pending',
    nullif(trim(coalesce(p_holder_name, '')), ''),
    p_buyer_email
  from pg_temp.checkout_items ci
  cross join lateral generate_series(1, ci.quantity);

  select to_jsonb(o.*) into v_order_row
  from public.orders o where o.id = v_order_id;

  select coalesce(jsonb_agg(to_jsonb(oi.*) order by oi.created_at, oi.id), '[]'::jsonb)
    into v_order_items
  from public.order_items oi
  where oi.order_id = v_order_id;

  return query select v_order_row, v_order_items;
end;
$function$;

-- 3. fn_apply_pricing_to_order folds order_adjustments into the total.
create or replace function public.fn_apply_pricing_to_order(p_order_id uuid)
returns void
language plpgsql
set search_path = pg_catalog, public, extensions
as $function$
declare
  v_org_id uuid;
  v_currency text;
  v_plan public.pricing_plans%ROWTYPE;
  v_subtotal integer;
  v_adjustments integer;
  v_count integer;
  v_platform_pct_fee integer;
  v_platform_fixed_fee integer;
  v_platform_fee integer;
  v_processor_fee_base integer;
  v_processor_fee integer;
  v_total integer;
  v_now timestamptz := now();
begin
  select org_id, currency into v_org_id, v_currency
  from public.orders where id = p_order_id for update;

  if v_org_id is null then raise exception 'Order % not found', p_order_id; end if;

  select * into v_plan
  from public.pricing_plans
  where org_id = v_org_id and active = true
  order by effective_from desc
  limit 1;

  if not found then raise exception 'No active pricing plan for org %', v_org_id; end if;

  select coalesce(sum(tt.price_cents), 0), count(*)
    into v_subtotal, v_count
  from public.order_items oi
  join public.ticket_types tt on tt.id = oi.ticket_type_id
  where oi.order_id = p_order_id;

  select coalesce(sum(amount_cents), 0)
    into v_adjustments
  from public.order_adjustments
  where order_id = p_order_id;

  v_platform_pct_fee := round(v_subtotal * v_plan.platform_percent_bps / 10000.0);
  v_platform_fixed_fee := v_plan.platform_fixed_cents * v_count;
  v_platform_fee := v_platform_pct_fee + v_platform_fixed_fee;

  if v_plan.min_platform_fee_cents is not null and v_platform_fee < v_plan.min_platform_fee_cents then
    v_platform_fee := v_plan.min_platform_fee_cents;
  end if;
  if v_plan.max_platform_fee_cents is not null and v_platform_fee > v_plan.max_platform_fee_cents then
    v_platform_fee := v_plan.max_platform_fee_cents;
  end if;

  if v_plan.platform_fee_payer = 'buyer' then
    v_processor_fee_base := v_subtotal + v_adjustments + v_platform_fee;
  else
    v_processor_fee_base := v_subtotal + v_adjustments;
  end if;
  v_processor_fee := round(v_processor_fee_base * v_plan.processor_percent_bps / 10000.0) + v_plan.processor_fixed_cents;

  if v_plan.platform_fee_payer = 'buyer' and v_plan.processor_fee_payer = 'buyer' then
    v_total := v_subtotal + v_adjustments + v_platform_fee + v_processor_fee;
  elsif v_plan.platform_fee_payer = 'organizer' and v_plan.processor_fee_payer = 'organizer' then
    v_total := v_subtotal + v_adjustments;
  elsif v_plan.platform_fee_payer = 'buyer' and v_plan.processor_fee_payer = 'organizer' then
    v_total := v_subtotal + v_adjustments + v_platform_fee;
  elsif v_plan.platform_fee_payer = 'organizer' and v_plan.processor_fee_payer = 'buyer' then
    v_total := v_subtotal + v_adjustments + v_processor_fee;
  else
    v_total := v_subtotal + v_adjustments + v_platform_fee + v_processor_fee;
  end if;

  if v_total < 0 then v_total := 0; end if;

  update public.orders
  set subtotal_cents = v_subtotal,
      item_count = v_count,
      platform_fee_cents = v_platform_fee,
      processor_fee_cents = v_processor_fee,
      fees_paid_by = case
        when v_plan.platform_fee_payer = 'buyer' and v_plan.processor_fee_payer = 'buyer' then 'buyer'::fee_payer
        when v_plan.platform_fee_payer = 'organizer' and v_plan.processor_fee_payer = 'organizer' then 'organizer'::fee_payer
        else null
      end,
      pricing_plan_id = v_plan.id,
      total_cents = v_total,
      currency = coalesce(v_currency, v_plan.currency),
      totals_computed_at = v_now
  where id = p_order_id;

  delete from public.ledger_entries where order_id = p_order_id and type in ('order_gross', 'fee');
  insert into public.ledger_entries (org_id, order_id, type, amount_cents, currency, occurred_at, meta)
  values
    (v_org_id, p_order_id, 'order_gross', v_subtotal, v_currency, v_now, jsonb_build_object('detail', 'ticket subtotal')),
    (v_org_id, p_order_id, 'fee', v_platform_fee, v_currency, v_now,
       jsonb_build_object('kind', 'platform', 'percent_bps', v_plan.platform_percent_bps, 'fixed_cents', v_plan.platform_fixed_cents, 'items', v_count)),
    (v_org_id, p_order_id, 'fee', v_processor_fee, v_currency, v_now,
       jsonb_build_object('kind', 'processor', 'percent_bps', v_plan.processor_percent_bps, 'fixed_cents', v_plan.processor_fixed_cents, 'base', v_processor_fee_base));
end;
$function$;

create or replace function public.trg_reprice_order_after_adjustments()
returns trigger
language plpgsql
set search_path = pg_catalog, public, extensions
as $function$
begin
  perform public.fn_apply_pricing_to_order(coalesce(new.order_id, old.order_id));
  return null;
end;
$function$;

drop trigger if exists t_reprice_order_adjustments_ins on public.order_adjustments;
drop trigger if exists t_reprice_order_adjustments_upd on public.order_adjustments;
drop trigger if exists t_reprice_order_adjustments_del on public.order_adjustments;
create trigger t_reprice_order_adjustments_ins
  after insert on public.order_adjustments
  for each row execute function public.trg_reprice_order_after_adjustments();
create trigger t_reprice_order_adjustments_upd
  after update on public.order_adjustments
  for each row execute function public.trg_reprice_order_after_adjustments();
create trigger t_reprice_order_adjustments_del
  after delete on public.order_adjustments
  for each row execute function public.trg_reprice_order_after_adjustments();

-- 4. Promo code application
create or replace function public.fn_apply_promo_code_to_order(
  p_order_id uuid,
  p_code text,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_order public.orders%ROWTYPE;
  v_event_id uuid;
  v_subtotal integer := 0;
  v_rule public.price_rules%ROWTYPE;
  v_per_user_redemptions integer;
  v_total_redemptions integer;
  v_adjustment_cents integer;
  v_label text;
begin
  if p_code is null or length(trim(p_code)) = 0 then
    return jsonb_build_object('applied', false, 'reason', 'code_required');
  end if;
  if p_user_id is null then
    return jsonb_build_object('applied', false, 'reason', 'user_required');
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then return jsonb_build_object('applied', false, 'reason', 'order_not_found'); end if;
  if v_order.buyer_id <> p_user_id then return jsonb_build_object('applied', false, 'reason', 'order_not_owned'); end if;
  if v_order.status <> 'pending' then return jsonb_build_object('applied', false, 'reason', 'order_not_pending'); end if;

  select e.id, coalesce(sum(tt.price_cents), 0)
    into v_event_id, v_subtotal
  from public.order_items oi
  join public.ticket_types tt on tt.id = oi.ticket_type_id
  join public.events e on e.id = tt.event_id
  where oi.order_id = p_order_id
  group by e.id;

  if v_event_id is null then return jsonb_build_object('applied', false, 'reason', 'order_has_no_items'); end if;

  select * into v_rule
  from public.price_rules
  where org_id = v_order.org_id
    and lower(code) = lower(trim(p_code))
    and coalesce(is_active, true) = true
    and (event_id is null or event_id = v_event_id)
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
    and (channel is null or cardinality(channel) = 0 or v_order.channel = any(channel))
  order by created_at desc
  limit 1;

  if not found then return jsonb_build_object('applied', false, 'reason', 'code_invalid'); end if;

  if v_rule.max_redemptions is not null and v_rule.max_redemptions > 0 then
    select count(*)::integer into v_total_redemptions
    from public.price_rule_redemptions
    where price_rule_id = v_rule.id;
    if v_total_redemptions >= v_rule.max_redemptions then
      return jsonb_build_object('applied', false, 'reason', 'code_exhausted');
    end if;
  end if;

  if v_rule.per_user_limit is not null and v_rule.per_user_limit > 0 then
    select count(*)::integer into v_per_user_redemptions
    from public.price_rule_redemptions
    where price_rule_id = v_rule.id and user_id = p_user_id;
    if v_per_user_redemptions >= v_rule.per_user_limit then
      return jsonb_build_object('applied', false, 'reason', 'code_already_used');
    end if;
  end if;

  if exists (
    select 1 from public.order_adjustments
    where order_id = p_order_id and price_rule_id = v_rule.id
  ) then
    return jsonb_build_object('applied', false, 'reason', 'code_already_applied');
  end if;

  v_adjustment_cents := case v_rule.type
    when 'absolute_discount' then -1 * abs(v_rule.value_numeric)::integer
    when 'percent_discount'  then -1 * round(v_subtotal * (v_rule.value_numeric / 100.0))::integer
    when 'abs_fee'           then abs(v_rule.value_numeric)::integer
    when 'percent_fee'       then round(v_subtotal * (v_rule.value_numeric / 100.0))::integer
    when 'tax'               then round(v_subtotal * (v_rule.value_numeric / 100.0))::integer
    else 0
  end;

  if v_adjustment_cents = 0 then
    return jsonb_build_object('applied', false, 'reason', 'rule_has_no_effect');
  end if;

  v_label := upper(trim(p_code));

  insert into public.order_adjustments (
    order_id, price_rule_id, type, scope, amount_cents, label
  ) values (
    p_order_id, v_rule.id, v_rule.type, coalesce(v_rule.applies_to, 'item'), v_adjustment_cents, v_label
  );

  insert into public.price_rule_redemptions (price_rule_id, user_id, order_id, redeemed_at)
  values (v_rule.id, p_user_id, p_order_id, now());

  return jsonb_build_object(
    'applied', true,
    'rule_id', v_rule.id,
    'rule_type', v_rule.type,
    'adjustment_cents', v_adjustment_cents,
    'label', v_label
  );
end;
$function$;

revoke execute on function public.fn_apply_promo_code_to_order(uuid, text, uuid) from public, anon, authenticated;;
