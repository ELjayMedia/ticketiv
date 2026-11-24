-- TICK-448 / TICK-393: after a transfer completes, the previous owner's QR is
-- refused at the gate and the new owner's code is admitted.
-- Run against an ISOLATED database only; rolls back.
\set ON_ERROR_STOP on
begin;
do $$
declare
  seller uuid := gen_random_uuid(); buyer uuid := gen_random_uuid(); gate uuid := gen_random_uuid();
  v_org uuid; v_venue uuid; v_event uuid; v_tt uuid; v_order uuid; v_item uuid; v_transfer uuid;
  v_old text; v_new text; r jsonb; n int;
begin
  insert into auth.users (id, email, aud, role, instance_id) values
    (seller, 'tx-s-' || left(seller::text, 8) || '@example.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    (buyer, 'tx-b-' || left(buyer::text, 8) || '@example.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    (gate, 'tx-g-' || left(gate::text, 8) || '@example.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
  insert into public.organizations (name, slug) values ('Transfer Org', 'tx-' || left(seller::text, 8)) returning id into v_org;
  insert into public.org_members (org_id, user_id, role) values (v_org, gate, 'organizer_staff');
  insert into public.venues (name, slug, city) values ('Transfer Hall ' || left(seller::text, 6), 'tx-hall-' || left(seller::text, 8), 'Mbabane') returning id into v_venue;
  insert into public.events (org_id, venue_id, title, slug, status, visibility, starts_at)
  values (v_org, v_venue, 'Transfer Night', 'tx-night-' || left(seller::text, 8), 'published', 'public', now() + interval '2 days') returning id into v_event;
  insert into public.ticket_types (event_id, name, price_cents, quota, currency) values (v_event, 'GA', 10000, 10, 'SZL') returning id into v_tt;
  insert into public.orders (org_id, buyer_id, total_cents, currency, status, subtotal_cents, channel, item_count)
  values (v_org, seller, 10000, 'SZL', 'paid', 10000, 'online', 1) returning id into v_order;
  insert into public.order_items (order_id, ticket_type_id, ticket_code, status, current_owner_id)
  values (v_order, v_tt, upper(gen_random_uuid()::text), 'issued', seller) returning id, ticket_code into v_item, v_old;
  insert into public.transfers (order_item_id, from_user_id, to_user_id, status)
  values (v_item, seller, buyer, 'requested') returning id into v_transfer;

  -- Recipient accepts through the real RPC.
  perform set_config('request.jwt.claims', json_build_object('sub', buyer::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';
  perform public.fn_complete_transfer(v_transfer);
  execute 'reset role';

  select ticket_code into v_new from public.order_items where id = v_item;
  if v_new is null or v_new = v_old then raise exception 'transfer must issue a new ticket code (old %, new %)', v_old, v_new; end if;
  select count(*) into n from public.order_items where current_owner_id = buyer and id = v_item;
  if n <> 1 then raise exception 'recipient should own the ticket'; end if;

  -- At the gate, through the live scanner RPC (fn_scan_ticket), as door staff.
  perform set_config('request.jwt.claims', json_build_object('sub', gate::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';
  r := public.fn_scan_ticket(v_old, v_event, gate);
  if (r->>'valid')::boolean then raise exception 'old code must be refused at the gate (got %)', r; end if;
  r := public.fn_scan_ticket(v_new, v_event, gate);
  execute 'reset role';
  if not coalesce((r->>'valid')::boolean, false) then raise exception 'new code should admit (got %)', r; end if;

  raise notice 'TRANSFER REISSUE: previous owner''s code refused, new owner''s code admitted (%)', r->>'outcome';
end $$;
rollback;
