-- TICK-336 order-money assertions.
--
-- Runnable by hand (psql -f) or a future pgTAP/CI harness. Wrapped in a
-- transaction that ROLLS BACK, so it never persists test data. All assertions
-- must hold; any failure raises and aborts. If it completes with no error, pass.
--
-- Asserts fn_compute_order_money and the wired recompute path for:
--   organizer-paid, buyer-paid, adjustments, rounding, min-fee clamp,
--   channel scoping (reseller/comp preserved), and idempotency on a paid order.

begin;
do $$
#variable_conflict use_column
declare
  m record;
  v_s text := substr(md5(random()::text),1,8);
  v_org uuid := gen_random_uuid(); v_event uuid := gen_random_uuid(); v_tt uuid := gen_random_uuid();
  o1 uuid := gen_random_uuid(); i1 uuid := gen_random_uuid();
  o2 uuid := gen_random_uuid();  -- online, no items
  o3 uuid := gen_random_uuid();  -- reseller
  o4 uuid := gen_random_uuid(); i4 uuid := gen_random_uuid();  -- comp
  r record; item_status text;
begin
  -- Pure calculator ---------------------------------------------------------
  -- organizer-paid: buyer pays face value; organizer_net = subtotal - platform
  select * into m from public.fn_compute_order_money(10000,0,500,200,0,0,null,'organizer');
  if m.buyer_total_cents<>10000 or m.platform_fee_cents<>500 or m.processor_fee_cents<>200 or m.organizer_net_cents<>9500
    then raise exception 'FAIL organizer-paid: %', row_to_json(m); end if;

  -- buyer-paid: platform added on top; processor on buyer amount; net = subtotal
  select * into m from public.fn_compute_order_money(10000,0,500,200,0,0,null,'buyer');
  if m.buyer_total_cents<>10500 or m.platform_fee_cents<>500 or m.processor_fee_cents<>210 or m.organizer_net_cents<>10000
    then raise exception 'FAIL buyer-paid: %', row_to_json(m); end if;

  -- adjustments (discount) honoured
  select * into m from public.fn_compute_order_money(10000,-2000,500,200,0,0,null,'organizer');
  if m.buyer_total_cents<>8000 or m.platform_fee_cents<>400 or m.organizer_net_cents<>7600
    then raise exception 'FAIL adjustments: %', row_to_json(m); end if;

  -- round half up, components sum to total
  select * into m from public.fn_compute_order_money(333,0,500,200,0,0,null,'organizer');
  if m.platform_fee_cents<>17 or m.processor_fee_cents<>7
    then raise exception 'FAIL rounding: %', row_to_json(m); end if;
  if m.organizer_net_cents + m.platform_fee_cents <> m.buyer_total_cents
    then raise exception 'FAIL rounding sum: %', row_to_json(m); end if;

  -- min-fee clamp
  select * into m from public.fn_compute_order_money(100,0,500,200,0,100,null,'organizer');
  if m.platform_fee_cents<>100 then raise exception 'FAIL min clamp: %', row_to_json(m); end if;

  -- Wired recompute path across channels ------------------------------------
  insert into public.organizations(id,name,slug) values(v_org,'T','t336test-'||v_s);
  insert into public.pricing_plans(org_id,active,platform_percent_bps,platform_fixed_cents,processor_percent_bps,processor_fixed_cents,platform_fee_payer,processor_fee_payer)
    values(v_org,true,500,0,200,0,'organizer','organizer');
  insert into public.events(id,org_id,title,slug,status) values(v_event,v_org,'E','e336test-'||v_s,'draft');
  insert into public.ticket_types(id,event_id,name,price_cents,quota) values(v_tt,v_event,'GA',10000,100);

  -- online + item -> face-value total, fees + net, paid, then check-in works
  insert into public.orders(id,org_id,channel,total_cents,subtotal_cents,status) values(o1,v_org,'online',10000,10000,'pending');
  insert into public.order_items(id,order_id,ticket_type_id,ticket_code,status) values(i1,o1,v_tt,'X1-'||v_s,'pending');
  update public.orders o set status='paid' where o.id=o1;
  select o.total_cents,o.platform_fee_cents,o.processor_fee_cents,o.organizer_net_cents into r from public.orders o where o.id=o1;
  if r.total_cents<>10000 or r.platform_fee_cents<>500 or r.processor_fee_cents<>200 or r.organizer_net_cents<>9500
    then raise exception 'FAIL online recompute: %', row_to_json(r); end if;
  update public.order_items oi set status='checked_in' where oi.id=i1;   -- must not raise
  update public.orders o set totals_computed_at=now() where o.id=o1;      -- idempotent, must not trip paid guard

  -- online, no items -> RPC total preserved (not zeroed)
  insert into public.orders(id,org_id,channel,total_cents,subtotal_cents,status) values(o2,v_org,'online',10000,10000,'pending');
  select o.total_cents into r from public.orders o where o.id=o2;
  if r.total_cents<>10000 then raise exception 'FAIL online no-items: %', r.total_cents; end if;

  -- reseller -> bespoke total preserved
  insert into public.orders(id,org_id,channel,total_cents,subtotal_cents,status) values(o3,v_org,'reseller',10500,10000,'pending');
  select o.total_cents into r from public.orders o where o.id=o3;
  if r.total_cents<>10500 then raise exception 'FAIL reseller preserve: %', r.total_cents; end if;

  -- comp -> free preserved
  insert into public.orders(id,org_id,channel,total_cents,subtotal_cents,status) values(o4,v_org,'comp',0,0,'pending');
  insert into public.order_items(id,order_id,ticket_type_id,ticket_code,status) values(i4,o4,v_tt,'X4-'||v_s,'issued');
  select o.total_cents into r from public.orders o where o.id=o4;
  if r.total_cents<>0 then raise exception 'FAIL comp preserve: %', r.total_cents; end if;

  raise notice 'TICK-336 order-money assertions: PASS';
end $$;
rollback;
