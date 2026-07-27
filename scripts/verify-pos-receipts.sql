-- TICK-348 POS receipt and live transaction authorization regression harness.
--
-- Run against staging or a dedicated UAT database with an elevated SQL role:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/verify-pos-receipts.sql
--
-- The harness builds two organizations, claimed users, a venue, a POS shift,
-- one successful POS order, and decoy orders inside a transaction. It
-- impersonates browser callers with request.jwt.claims + SET LOCAL ROLE
-- authenticated, then rolls everything back. No fixture data should persist.

begin;

do $$
declare
  v_org_a uuid;
  v_org_b uuid;
  v_cashier uuid := gen_random_uuid();
  v_manager uuid := gen_random_uuid();
  v_cross_org_manager uuid := gen_random_uuid();
  v_outsider uuid := gen_random_uuid();
  v_venue uuid;
  v_event uuid;
  v_ticket_type uuid;
  v_shift uuid;
  v_order uuid;
  v_pending_order uuid;
  v_online_order uuid;
  v_charge jsonb;
  v_receipt jsonb;
  v_transactions jsonb;
begin
  insert into public.organizations (name, slug)
  values ('Harness POS Org A', 'harness-pos-a-' || substr(gen_random_uuid()::text, 1, 8))
  returning id into v_org_a;

  insert into public.organizations (name, slug)
  values ('Harness POS Org B', 'harness-pos-b-' || substr(gen_random_uuid()::text, 1, 8))
  returning id into v_org_b;

  insert into auth.users (id, email, aud, role, instance_id)
  values
    (v_cashier, 'pos-cashier-' || substr(v_cashier::text, 1, 8) || '@example.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    (v_manager, 'pos-manager-' || substr(v_manager::text, 1, 8) || '@example.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    (v_cross_org_manager, 'pos-cross-' || substr(v_cross_org_manager::text, 1, 8) || '@example.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    (v_outsider, 'pos-outsider-' || substr(v_outsider::text, 1, 8) || '@example.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');

  insert into public.org_members (org_id, user_id, role)
  values
    (v_org_a, v_cashier, 'organizer_staff'::public.app_role),
    (v_org_a, v_manager, 'organizer_owner'::public.app_role),
    (v_org_b, v_cross_org_manager, 'organizer_owner'::public.app_role);

  insert into public.venues (org_id, name, slug, city)
  values (v_org_a, 'Harness POS Venue', 'harness-pos-venue-' || substr(gen_random_uuid()::text, 1, 8), 'Mbabane')
  returning id into v_venue;

  insert into public.events (org_id, venue_id, title, slug, status, starts_at)
  values (v_org_a, v_venue, 'Harness POS Receipt Event', 'harness-pos-receipt-' || substr(gen_random_uuid()::text, 1, 8), 'published', now() + interval '7 days')
  returning id into v_event;

  insert into public.ticket_types (event_id, name, price_cents, quota)
  values (v_event, 'General Admission', 10000, 100)
  returning id into v_ticket_type;

  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_cashier::text, 'role', 'authenticated', 'is_anonymous', false)::text,
    true
  );
  execute 'set local role authenticated';

  select (public.fn_open_pos_shift(v_org_a, null, null, 2500, 'receipt harness')).id
    into v_shift;

  v_charge := public.fn_pos_charge_with_shift(
    v_shift,
    v_event,
    jsonb_build_array(jsonb_build_object('ticketTypeId', v_ticket_type, 'quantity', 1)),
    'cash',
    'Receipt Buyer',
    'buyer@example.test',
    '+26876000000'
  );
  v_order := (v_charge ->> 'order_id')::uuid;

  execute 'reset role';

  -- Decoys: neither should appear in the shift transaction feed.
  insert into public.orders (
    org_id,
    total_cents,
    currency,
    status,
    subtotal_cents,
    channel,
    item_count,
    pos_shift_id,
    cashier_user_id
  )
  values (v_org_a, 5000, 'SZL', 'pending', 5000, 'pos', 1, v_shift, v_cashier)
  returning id into v_pending_order;

  insert into public.payments (order_id, provider, amount_cents, currency, ext_payment_id, status, channel)
  values (v_pending_order, 'cash', 5000, 'SZL', 'pos-pending-' || substr(gen_random_uuid()::text, 1, 10), 'pending', 'pos');

  insert into public.orders (
    org_id,
    total_cents,
    currency,
    status,
    subtotal_cents,
    channel,
    item_count,
    pos_shift_id,
    cashier_user_id
  )
  values (v_org_a, 7000, 'SZL', 'paid', 7000, 'online', 1, v_shift, v_cashier)
  returning id into v_online_order;

  insert into public.payments (order_id, provider, amount_cents, currency, ext_payment_id, status, channel)
  values (v_online_order, 'cash', 7000, 'SZL', 'online-decoy-' || substr(gen_random_uuid()::text, 1, 10), 'succeeded', 'online');

  ---------------------------------------------------------------- cashier can read
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_cashier::text, 'role', 'authenticated', 'is_anonymous', false)::text,
    true
  );
  execute 'set local role authenticated';

  v_receipt := public.fn_pos_receipt(v_order);

  if v_receipt ->> 'receipt_reference' not like 'TIV-%' then
    raise exception 'receipt reference is not customer-facing';
  end if;
  if (v_receipt ->> 'order_id')::uuid <> v_order then
    raise exception 'receipt returned the wrong order';
  end if;
  if v_receipt #>> '{buyer,name}' <> 'Receipt Buyer' then
    raise exception 'receipt did not include buyer details';
  end if;
  if jsonb_array_length(v_receipt -> 'items') <> 1 then
    raise exception 'receipt did not include one ticket line';
  end if;

  v_transactions := public.fn_pos_shift_transactions(v_shift, 10);
  if jsonb_array_length(v_transactions) <> 1 then
    raise exception 'shift transaction feed included pending or non-POS decoys: %', v_transactions;
  end if;
  if (v_transactions -> 0 ->> 'order_id')::uuid <> v_order then
    raise exception 'shift transaction feed returned the wrong order';
  end if;

  perform public.fn_close_pos_shift(v_shift, 12500, 'receipt harness close');

  -- Receipt remains available after shift close.
  perform public.fn_pos_receipt(v_order);

  ---------------------------------------------------------------- same-org manager can read
  execute 'reset role';
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_manager::text, 'role', 'authenticated', 'is_anonymous', false)::text,
    true
  );
  execute 'set local role authenticated';

  perform public.fn_pos_receipt(v_order);
  perform public.fn_pos_shift_transactions(v_shift, 10);

  ---------------------------------------------------------------- denials
  execute 'reset role';
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_cross_org_manager::text, 'role', 'authenticated', 'is_anonymous', false)::text,
    true
  );
  execute 'set local role authenticated';

  begin
    perform public.fn_pos_receipt(v_order);
    raise exception 'cross-org manager read a POS receipt';
  exception when insufficient_privilege then
    if sqlerrm <> 'not_authorized' then raise; end if;
  end;

  begin
    perform public.fn_pos_shift_transactions(v_shift, 10);
    raise exception 'cross-org manager read POS shift transactions';
  exception when insufficient_privilege then
    if sqlerrm <> 'not_authorized' then raise; end if;
  end;

  execute 'reset role';
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_outsider::text, 'role', 'authenticated', 'is_anonymous', false)::text,
    true
  );
  execute 'set local role authenticated';

  begin
    perform public.fn_pos_receipt(v_order);
    raise exception 'outsider read a POS receipt';
  exception when insufficient_privilege then
    if sqlerrm <> 'not_authorized' then raise; end if;
  end;

  begin
    perform public.fn_pos_shift_transactions(v_shift, 10);
    raise exception 'outsider read POS shift transactions';
  exception when insufficient_privilege then
    if sqlerrm <> 'not_authorized' then raise; end if;
  end;

  execute 'reset role';
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_cashier::text, 'role', 'authenticated', 'is_anonymous', true)::text,
    true
  );
  execute 'set local role authenticated';

  begin
    perform public.fn_pos_receipt(v_order);
    raise exception 'anonymous identity read a POS receipt';
  exception when insufficient_privilege then
    if sqlerrm <> 'claimed_account_required' then raise; end if;
  end;

  begin
    perform public.fn_pos_shift_transactions(v_shift, 10);
    raise exception 'anonymous identity read POS shift transactions';
  exception when insufficient_privilege then
    if sqlerrm <> 'claimed_account_required' then raise; end if;
  end;

  -- Non-POS orders are never receipt-loadable, even with a shift id present.
  execute 'reset role';
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_cashier::text, 'role', 'authenticated', 'is_anonymous', false)::text,
    true
  );
  execute 'set local role authenticated';

  begin
    perform public.fn_pos_receipt(v_online_order);
    raise exception 'online order loaded as a POS receipt';
  exception when no_data_found then
    if sqlerrm <> 'pos_receipt_not_found' then raise; end if;
  end;

  execute 'reset role';
end;
$$;

rollback;

\echo 'POS receipt and shift transaction authorization verification passed'
