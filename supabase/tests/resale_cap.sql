-- TICK-448 regression: the resale price cap is enforced by the database.
-- Run against an ISOLATED database only; rolls back.
--   psql "$TICKETIV_CROSS_ORG_TEST_DB_URL" -X -v ON_ERROR_STOP=1 -f supabase/tests/resale_cap.sql
\set ON_ERROR_STOP on
begin;
do $$
declare
  v_org uuid; v_seller uuid := gen_random_uuid(); v_venue uuid;
  v_ev_capped uuid; v_ev_default uuid; v_tt_capped uuid; v_tt_default uuid; v_tt_free uuid;
  v_order uuid; v_item_capped uuid; v_item_default uuid; v_item_free uuid;
  v_err text; v_out text := ''; v_fail int := 0;
begin
  insert into auth.users (id, email, aud, role, instance_id)
  values (v_seller, 'resale-' || left(v_seller::text, 8) || '@example.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
  insert into public.organizations (name, slug) values ('Resale Org', 'resale-' || left(gen_random_uuid()::text, 8)) returning id into v_org;
  insert into public.venues (name, slug, city) values ('Resale Hall ' || left(v_seller::text, 6), 'resale-hall-' || left(v_seller::text, 8), 'Mbabane') returning id into v_venue;

  insert into public.events (org_id, venue_id, title, slug, status, visibility, starts_at, resale_cap_bps)
  values (v_org, v_venue, 'Capped', 'capped-' || left(v_seller::text, 8), 'draft', 'public', now() + interval '7 days', 10000) returning id into v_ev_capped;
  insert into public.events (org_id, venue_id, title, slug, status, visibility, starts_at)
  values (v_org, v_venue, 'Default', 'default-' || left(v_seller::text, 8), 'draft', 'public', now() + interval '7 days') returning id into v_ev_default;

  insert into public.ticket_types (event_id, name, price_cents, quota, currency) values (v_ev_capped, 'GA', 10000, 10, 'SZL') returning id into v_tt_capped;
  insert into public.ticket_types (event_id, name, price_cents, quota, currency) values (v_ev_default, 'GA', 10000, 10, 'SZL') returning id into v_tt_default;
  insert into public.ticket_types (event_id, name, price_cents, quota, currency) values (v_ev_default, 'Free', 0, 10, 'SZL') returning id into v_tt_free;

  insert into public.orders (org_id, buyer_id, total_cents, currency, status, subtotal_cents, channel, item_count)
  values (v_org, v_seller, 20000, 'SZL', 'paid', 20000, 'online', 3) returning id into v_order;
  insert into public.order_items (order_id, ticket_type_id, ticket_code, status, current_owner_id)
  values (v_order, v_tt_capped, 'RC-' || left(gen_random_uuid()::text, 10), 'issued', v_seller) returning id into v_item_capped;
  insert into public.order_items (order_id, ticket_type_id, ticket_code, status, current_owner_id)
  values (v_order, v_tt_default, 'RD-' || left(gen_random_uuid()::text, 10), 'issued', v_seller) returning id into v_item_default;
  insert into public.order_items (order_id, ticket_type_id, ticket_code, status, current_owner_id)
  values (v_order, v_tt_free, 'RF-' || left(gen_random_uuid()::text, 10), 'issued', v_seller) returning id into v_item_free;

  perform set_config('request.jwt.claims', json_build_object('sub', v_seller::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';

  -- 1. 100% cap: E100.01 refused
  begin perform public.fn_publish_resale_listing(v_item_capped, 10001, 24); v_err := null; exception when others then v_err := sqlerrm; end;
  if coalesce(v_err, '') !~ 'resale_price_above_cap' then v_fail := v_fail + 1; v_out := v_out || E'\n  FAIL  100% cap, 10001 refused: ' || coalesce(v_err, 'SUCCEEDED'); else v_out := v_out || E'\n  PASS  100% cap, 10001 refused'; end if;
  -- 2. default 110% cap: E110.01 refused
  begin perform public.fn_publish_resale_listing(v_item_default, 11001, 24); v_err := null; exception when others then v_err := sqlerrm; end;
  if coalesce(v_err, '') !~ 'resale_price_above_cap' then v_fail := v_fail + 1; v_out := v_out || E'\n  FAIL  default cap, 11001 refused: ' || coalesce(v_err, 'SUCCEEDED'); else v_out := v_out || E'\n  PASS  default cap, 11001 refused'; end if;
  -- 3. free ticket cannot be sold for money
  begin perform public.fn_publish_resale_listing(v_item_free, 100, 24); v_err := null; exception when others then v_err := sqlerrm; end;
  if coalesce(v_err, '') !~ 'resale_price_above_cap' then v_fail := v_fail + 1; v_out := v_out || E'\n  FAIL  free ticket refused: ' || coalesce(v_err, 'SUCCEEDED'); else v_out := v_out || E'\n  PASS  free ticket refused'; end if;
  -- 4. exactly at the 100% cap is allowed
  begin perform public.fn_publish_resale_listing(v_item_capped, 10000, 24); v_err := null; exception when others then v_err := sqlerrm; end;
  if v_err is not null then v_fail := v_fail + 1; v_out := v_out || E'\n  FAIL  100% cap, 10000 allowed: ' || v_err; else v_out := v_out || E'\n  PASS  100% cap, 10000 allowed'; end if;
  -- 5. exactly at the default 110% cap is allowed
  begin perform public.fn_publish_resale_listing(v_item_default, 11000, 24); v_err := null; exception when others then v_err := sqlerrm; end;
  if v_err is not null then v_fail := v_fail + 1; v_out := v_out || E'\n  FAIL  default cap, 11000 allowed: ' || v_err; else v_out := v_out || E'\n  PASS  default cap, 11000 allowed'; end if;

  execute 'reset role';
  raise notice E'RESALE CAP HARNESS%', v_out;
  if v_fail > 0 then raise exception 'resale cap harness: % failure(s)', v_fail; end if;
end $$;
rollback;
