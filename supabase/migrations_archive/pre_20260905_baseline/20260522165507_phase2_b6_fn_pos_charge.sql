-- B6: Transactional POS charge wrapper. Wraps the existing
-- fn_create_inventory_protected_order with the immediate payment insert
-- so a crashed server can't leave an order without a payment row.

create or replace function public.fn_pos_charge(
  p_event_id uuid,
  p_items jsonb,
  p_payment_method text,
  p_buyer_name text default null,
  p_buyer_email text default null,
  p_buyer_phone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_org_id uuid;
  v_authorized boolean;
  v_created jsonb;
  v_order jsonb;
  v_order_id uuid;
  v_total int;
  v_currency text;
  v_is_comp boolean := lower(p_payment_method) = 'comp';
begin
  if v_caller is null then
    raise exception 'auth required';
  end if;

  if p_payment_method is null
     or lower(p_payment_method) not in ('cash', 'upi', 'card', 'comp')
  then
    raise exception 'invalid payment method: %', p_payment_method;
  end if;

  select org_id into v_org_id
  from public.events
  where id = p_event_id;

  if v_org_id is null then
    raise exception 'event not found';
  end if;

  -- Caller must be an org member with a POS-capable role. We trust
  -- user_has_org_role for the check (it lives in the existing RBAC layer).
  select public.user_has_org_role(
    v_org_id,
    array[
      'admin',
      'organizer',
      'organizer_owner',
      'organizer_admin',
      'organizer_staff',
      'pos'
    ]
  ) into v_authorized;

  if not coalesce(v_authorized, false) then
    raise exception 'not authorized to charge at box office';
  end if;

  -- Create the inventory-protected order. The caller (staff) is the
  -- buyer-of-record; holder name comes from p_buyer_name if supplied.
  select public.fn_create_inventory_protected_order(
    p_event_id  := p_event_id,
    p_buyer_id  := v_caller,
    p_buyer_email := coalesce(p_buyer_email, ''),
    p_items     := p_items,
    p_holder_name := p_buyer_name
  ) into v_created;

  v_order := v_created -> 'order_row';
  if v_order is null then
    raise exception 'order RPC returned no order';
  end if;

  v_order_id := (v_order ->> 'id')::uuid;
  v_total    := coalesce((v_order ->> 'total_cents')::int, 0);
  v_currency := coalesce(v_order ->> 'currency', 'SZL');

  -- Mark the channel + buyer contact directly on the order.
  update public.orders
     set channel = 'pos',
         buyer_email = coalesce(nullif(p_buyer_email, ''), buyer_email),
         buyer_phone = coalesce(nullif(p_buyer_phone, ''), buyer_phone)
   where id = v_order_id;

  -- Record the immediate at-the-door payment in one transaction.
  insert into public.payments(
    order_id, provider, amount_cents, currency, status, channel, payload
  )
  values (
    v_order_id,
    lower(p_payment_method),
    case when v_is_comp then 0 else v_total end,
    v_currency,
    'succeeded',
    'pos',
    jsonb_build_object(
      'source', 'pos',
      'buyer', jsonb_build_object('name', p_buyer_name, 'email', p_buyer_email, 'phone', p_buyer_phone),
      'method', lower(p_payment_method)
    )
  );

  return jsonb_build_object(
    'order_id', v_order_id,
    'total_cents', v_total,
    'currency', v_currency,
    'channel', 'pos',
    'payment_method', lower(p_payment_method),
    'order', v_order,
    'order_items', v_created -> 'order_items'
  );
end
$$;

revoke all on function public.fn_pos_charge(uuid, jsonb, text, text, text, text) from public;
grant execute on function public.fn_pos_charge(uuid, jsonb, text, text, text, text) to authenticated;

comment on function public.fn_pos_charge is
  'Transactional box-office charge: create inventory-protected order + mark channel=pos + insert succeeded payment, in a single transaction.';
;
