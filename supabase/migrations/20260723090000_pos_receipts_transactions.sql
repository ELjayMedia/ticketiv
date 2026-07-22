-- TICK-348: printable POS receipts and live shift transaction feed.

create or replace function public.fn_pos_receipt(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
declare
  v_actor uuid := auth.uid();
  v_order public.orders;
  v_shift public.pos_shifts;
  v_event record;
  v_payment record;
  v_items jsonb;
  v_buyer_name text;
begin
  perform app.require_claimed_account();

  select * into v_order
  from public.orders
  where id = p_order_id and channel = 'pos';

  if not found or v_order.pos_shift_id is null then
    raise exception 'pos_receipt_not_found' using errcode = 'P0002';
  end if;

  select * into v_shift
  from public.pos_shifts
  where id = v_order.pos_shift_id;

  if not (
    v_shift.cashier_user_id = v_actor
    or app.is_org_manager(v_order.org_id)
    or app.is_org_finance_viewer(v_order.org_id)
    or app.is_platform_admin()
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select e.id, e.title, e.starts_at, e.tz, e.city
    into v_event
  from public.order_items oi
  join public.ticket_types tt on tt.id = oi.ticket_type_id
  join public.events e on e.id = tt.event_id
  where oi.order_id = p_order_id
  limit 1;

  select p.provider, p.amount_cents, p.currency, p.created_at
    into v_payment
  from public.payments p
  where p.order_id = p_order_id and p.status = 'succeeded'
  order by p.created_at desc nulls last
  limit 1;

  select coalesce(jsonb_agg(line order by line->>'ticket_name'), '[]'::jsonb)
    into v_items
  from (
    select jsonb_build_object(
      'ticket_type_id', tt.id,
      'ticket_name', tt.name,
      'quantity', count(*),
      'unit_price_cents', tt.price_cents,
      'line_total_cents', tt.price_cents * count(*),
      'ticket_codes', jsonb_agg(oi.ticket_code order by oi.created_at)
    ) as line
    from public.order_items oi
    join public.ticket_types tt on tt.id = oi.ticket_type_id
    where oi.order_id = p_order_id
    group by tt.id, tt.name, tt.price_cents
  ) grouped;

  select nullif(max(oi.holder_name), '') into v_buyer_name
  from public.order_items oi
  where oi.order_id = p_order_id;

  return jsonb_build_object(
    'receipt_reference', 'TIV-' || upper(substr(replace(v_order.id::text, '-', ''), 1, 10)),
    'order_id', v_order.id,
    'order_created_at', v_order.created_at,
    'org_id', v_order.org_id,
    'shift_id', v_order.pos_shift_id,
    'cashier_user_id', v_order.cashier_user_id,
    'event', jsonb_build_object(
      'id', v_event.id,
      'title', v_event.title,
      'starts_at', v_event.starts_at,
      'timezone', v_event.tz,
      'city', v_event.city
    ),
    'buyer', jsonb_build_object(
      'name', v_buyer_name,
      'email', coalesce(v_order.buyer_email, v_order.email),
      'phone', coalesce(v_order.buyer_phone, v_order.phone)
    ),
    'payment', jsonb_build_object(
      'method', v_payment.provider,
      'amount_cents', coalesce(v_payment.amount_cents, v_order.total_cents),
      'currency', coalesce(v_payment.currency, v_order.currency),
      'paid_at', coalesce(v_payment.created_at, v_order.created_at)
    ),
    'items', v_items,
    'item_count', coalesce(v_order.item_count, jsonb_array_length(v_items)),
    'subtotal_cents', coalesce(v_order.subtotal_cents, v_order.total_cents),
    'platform_fee_cents', coalesce(v_order.platform_fee_cents, 0),
    'processor_fee_cents', coalesce(v_order.processor_fee_cents, 0),
    'total_cents', v_order.total_cents,
    'currency', v_order.currency
  );
end;
$$;

revoke all on function public.fn_pos_receipt(uuid) from public, anon;
grant execute on function public.fn_pos_receipt(uuid) to authenticated, service_role;

create or replace function public.fn_pos_shift_transactions(
  p_shift_id uuid,
  p_limit integer default 25
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
declare
  v_shift public.pos_shifts;
  v_limit integer := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_rows jsonb;
begin
  perform app.require_claimed_account();

  select * into v_shift from public.pos_shifts where id = p_shift_id;
  if not found then
    raise exception 'pos_shift_not_found' using errcode = 'P0002';
  end if;

  if not (
    v_shift.cashier_user_id = auth.uid()
    or app.is_org_manager(v_shift.org_id)
    or app.is_org_finance_viewer(v_shift.org_id)
    or app.is_platform_admin()
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(row_data order by row_data->>'created_at' desc), '[]'::jsonb)
    into v_rows
  from (
    select jsonb_build_object(
      'order_id', o.id,
      'receipt_reference', 'TIV-' || upper(substr(replace(o.id::text, '-', ''), 1, 10)),
      'created_at', o.created_at,
      'total_cents', o.total_cents,
      'currency', o.currency,
      'item_count', coalesce(o.item_count, 0),
      'buyer_name', (
        select nullif(max(oi.holder_name), '') from public.order_items oi where oi.order_id = o.id
      ),
      'payment_method', p.provider
    ) as row_data
    from public.orders o
    join lateral (
      select provider
      from public.payments
      where order_id = o.id and status = 'succeeded'
      order by created_at desc nulls last
      limit 1
    ) p on true
    where o.pos_shift_id = p_shift_id and o.channel = 'pos'
    order by o.created_at desc
    limit v_limit
  ) rows;

  return v_rows;
end;
$$;

revoke all on function public.fn_pos_shift_transactions(uuid, integer) from public, anon;
grant execute on function public.fn_pos_shift_transactions(uuid, integer) to authenticated, service_role;

comment on function public.fn_pos_receipt(uuid) is 'Returns an authorization-scoped printable receipt payload for a POS order.';
comment on function public.fn_pos_shift_transactions(uuid, integer) is 'Returns recent successful POS transactions for an authorized shift viewer.';
