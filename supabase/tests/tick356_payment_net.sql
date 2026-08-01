-- TICK-356 payment completion assertions. This transaction always rolls back.

begin;
select set_config('request.jwt.claim.role', 'service_role', true);

do $$
#variable_conflict use_column
declare
  v_suffix text := substr(md5(random()::text), 1, 8);
  v_org uuid := gen_random_uuid();
  v_event uuid := gen_random_uuid();
  v_ticket_type uuid := gen_random_uuid();
  v_buyer uuid := gen_random_uuid();
  v_order uuid := gen_random_uuid();
  v_item uuid := gen_random_uuid();
  v_reference text := 'TICK356-' || upper(substr(md5(random()::text), 1, 12));
  v_first record;
  v_replay record;
  v_money record;
  v_gross integer;
  v_fee integer;
  v_net integer;
begin
  insert into public.organizations(id, name, slug, default_currency)
  values (v_org, 'TICK-356 test', 'tick356-' || v_suffix, 'ZAR');

  insert into auth.users(id, email, aud, role, instance_id)
  values (
    v_buyer,
    'tick356-' || v_suffix || '@example.test',
    'authenticated',
    'authenticated',
    '00000000-0000-0000-0000-000000000000'
  );

  insert into public.pricing_plans(
    org_id, active, currency, platform_percent_bps, platform_fixed_cents,
    processor_percent_bps, processor_fixed_cents, platform_fee_payer,
    processor_fee_payer
  ) values (v_org, true, 'ZAR', 650, 0, 290, 100, 'organizer', 'organizer');

  insert into public.events(id, org_id, title, slug, status)
  values (v_event, v_org, 'TICK-356 event', 'tick356-' || v_suffix, 'draft');

  insert into public.ticket_types(id, event_id, name, price_cents, quota, currency)
  values (v_ticket_type, v_event, 'General admission', 3500, 10, 'ZAR');

  insert into public.orders(
    id, org_id, buyer_id, currency, order_currency, status, channel, item_count,
    subtotal_cents, total_cents
  ) values (v_order, v_org, v_buyer, 'ZAR', 'ZAR', 'pending', 'online', 1, 3500, 3500);

  insert into public.order_items(id, order_id, ticket_type_id, ticket_code, status)
  values (v_item, v_order, v_ticket_type, 'T356-' || v_suffix, 'pending');

  insert into public.payment_attempts(order_id, provider, attempt_no, status, ext_ref)
  values (v_order, 'paystack', 1, 'pending', v_reference);

  select o.total_cents, o.platform_fee_cents, o.processor_fee_cents,
         o.organizer_net_cents
    into v_money
  from public.orders o where o.id = v_order;

  if v_money.total_cents <> 3500
     or v_money.platform_fee_cents <> 228
     or v_money.processor_fee_cents <> 202
     or v_money.organizer_net_cents <> 3272 then
    raise exception 'FAIL order money snapshot: %', row_to_json(v_money);
  end if;

  select * into v_first from public.fn_complete_order_payment(
    v_order, 'paystack', v_reference, 3500, 'ZAR',
    jsonb_build_object('test', 'TICK-356')
  );

  if v_first.already_completed or v_first.issued_item_count <> 1 then
    raise exception 'FAIL first completion: %', row_to_json(v_first);
  end if;

  select
    coalesce(sum(le.amount_cents) filter (where le.type = 'order_gross'), 0),
    coalesce(sum(le.amount_cents) filter (where le.type = 'fee'), 0),
    coalesce(sum(le.amount_cents) filter (where le.type = 'payment_net'), 0)
  into v_gross, v_fee, v_net
  from public.ledger_entries le
  where le.payment_id = v_first.completed_payment_id;

  if v_gross <> 3500 or v_fee <> -228 or v_net <> 3272
     or v_gross + v_fee <> v_net then
    raise exception 'FAIL settlement amounts gross %, fee %, net %', v_gross, v_fee, v_net;
  end if;

  if (select count(*) from public.ledger_entries le
      where le.payment_id = v_first.completed_payment_id) <> 3 then
    raise exception 'FAIL settlement must contain exactly three rows';
  end if;

  if (select count(*) from public.ledger_entries le
      where le.payment_id = v_first.completed_payment_id
        and le.type = 'fee' and le.meta ->> 'fee_type' = 'platform') <> 1 then
    raise exception 'FAIL settlement must contain one platform fee';
  end if;

  if exists (
    select 1 from public.ledger_entries le
    where le.payment_id = v_first.completed_payment_id
      and le.meta ->> 'fee_type' = 'processor'
  ) then
    raise exception 'FAIL processor cost was written as an organizer deduction';
  end if;

  if (select o.status from public.orders o where o.id = v_order) <> 'paid'
     or (select oi.status from public.order_items oi where oi.id = v_item) <> 'issued' then
    raise exception 'FAIL order or item not completed';
  end if;

  if (select count(*) from public.payments p
      where p.order_id = v_order and p.status = 'succeeded') <> 1 then
    raise exception 'FAIL expected one succeeded payment';
  end if;

  if not exists (
    select 1 from public.payment_attempts pa
    where pa.order_id = v_order and pa.status = 'succeeded'
      and pa.payment_id = v_first.completed_payment_id
  ) then
    raise exception 'FAIL payment attempt was not linked';
  end if;

  if (select count(*) from public.payment_outbox ob
      where ob.order_id = v_order and ob.topic = 'ticket_delivery') <> 1 then
    raise exception 'FAIL expected one external ticket-delivery outbox entry';
  end if;

  if (select count(*) from public.notifications n
      where n.user_id = v_buyer and n.type = 'payment_succeeded'
        and n.dedupe_key = 'payment_succeeded:' || v_first.completed_payment_id::text) <> 1 then
    raise exception 'FAIL expected one transactional payment notification';
  end if;

  select * into v_replay from public.fn_complete_order_payment(
    v_order, 'paystack', v_reference, 3500, 'ZAR',
    jsonb_build_object('test', 'TICK-356 replay')
  );

  if not v_replay.already_completed
     or v_replay.completed_payment_id <> v_first.completed_payment_id then
    raise exception 'FAIL idempotent replay: %', row_to_json(v_replay);
  end if;

  if (select count(*) from public.payments p where p.order_id = v_order) <> 1
     or (select count(*) from public.ledger_entries le
         where le.payment_id = v_first.completed_payment_id) <> 3
     or (select count(*) from public.payment_outbox ob where ob.order_id = v_order) <> 1
     or (select count(*) from public.notifications n
         where n.user_id = v_buyer and n.type = 'payment_succeeded') <> 1 then
    raise exception 'FAIL replay created duplicate state';
  end if;

  if exists (
    select 1 from public.ledger_entries le
    where le.order_id = v_order and le.payment_id is null
      and le.type in ('order_gross', 'fee', 'payment_net')
  ) then
    raise exception 'FAIL settlement row has no payment';
  end if;

  raise notice 'TICK-356 payment-net assertions: PASS';
end $$;

rollback;
