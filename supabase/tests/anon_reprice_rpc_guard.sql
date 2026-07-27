-- Security regression: fn_apply_pricing_to_order must not be callable directly.
--
-- Runnable by hand (psql -f) or a future pgTAP/CI harness. Wrapped in a
-- transaction that ROLLS BACK, so it never persists test data. All assertions
-- must hold; any failure raises and aborts. If it completes with no error, pass.
--
-- Covers 20260725140000_close_anon_reprice_rpc_and_search_path.sql.
--
-- The function is SECURITY DEFINER, so it bypasses RLS, and `anon` holds
-- EXECUTE, so PostgREST published it at /rest/v1/rpc/fn_apply_pricing_to_order.
-- Its body writes to public.orders by id with no authorization check, so before
-- the fix any unauthenticated caller could write to any order -- including
-- orders RLS would not even let them read. Assertion 2 below is the exact
-- observed pre-fix behaviour, and is what must never regress.
--
-- The guard is pg_trigger_depth() rather than a REVOKE because the three
-- callers (trg_reprice_order_after_items, trg_reprice_order_after_adjustments,
-- trg_reprice_order_on_status) are SECURITY INVOKER: they run as the buyer, so
-- revoking EXECUTE from anon/authenticated would break guest checkout.
-- Assertion 3 guards that path.

begin;
do $$
declare
  v_s text := substr(md5(random()::text),1,8);
  v_org uuid := gen_random_uuid();
  v_event uuid := gen_random_uuid();
  v_tt uuid := gen_random_uuid();
  v_order uuid := gen_random_uuid();
  v_before timestamptz;
  v_after timestamptz;
  v_accepted boolean;
  v_errcode text;
  v_anon_can_read boolean;
  v_stamped timestamptz;
  v_subtotal integer;
begin
  insert into public.organizations (id, name, slug)
  values (v_org, 'anon rpc guard '||v_s, 'anon-rpc-guard-'||v_s);
  insert into public.events (id, org_id, title, slug)
  values (v_event, v_org, 'Guard '||v_s, 'guard-'||v_s);
  insert into public.ticket_types (id, event_id, name, price_cents, quota)
  values (v_tt, v_event, 'GA', 10000, 10);
  insert into public.orders (id, org_id, total_cents)
  values (v_order, v_org, 0);

  update public.orders set totals_computed_at = null where id = v_order;
  select totals_computed_at into v_before from public.orders where id = v_order;

  -- Act as an unauthenticated PostgREST caller.
  set local role anon;

  -- 1. RLS must hide the order from anon. If this ever returns true the table's
  --    policies regressed, and the rest of this test is measuring the wrong thing.
  select exists (select 1 from public.orders where id = v_order) into v_anon_can_read;

  -- 2. The direct call must be refused.
  v_accepted := false;
  begin
    perform public.fn_apply_pricing_to_order(v_order);
    v_accepted := true;
  exception when others then
    v_errcode := sqlstate;
  end;

  reset role;

  if v_anon_can_read then
    raise exception 'FAIL: anon can read orders directly -- RLS regression, not just an RPC issue';
  end if;
  if v_accepted then
    raise exception 'FAIL: anon executed fn_apply_pricing_to_order directly';
  end if;
  if v_errcode is distinct from '42501' then
    raise exception 'FAIL: expected insufficient_privilege (42501), got %', v_errcode;
  end if;

  -- The refused call must not have written anything.
  select totals_computed_at into v_after from public.orders where id = v_order;
  if v_before is distinct from v_after then
    raise exception 'FAIL: refused call still wrote totals_computed_at (% -> %)', v_before, v_after;
  end if;

  -- 3. The legitimate trigger path must still reprice. Inserting an order_item
  --    fires trg_reprice_order_after_items, which calls the helper at
  --    pg_trigger_depth() >= 1.
  insert into public.order_items (order_id, ticket_type_id, ticket_code)
  values (v_order, v_tt, 'GRD-'||v_s);

  select totals_computed_at, subtotal_cents
    into v_stamped, v_subtotal
  from public.orders where id = v_order;

  if v_stamped is null then
    raise exception 'FAIL: reprice trigger did not stamp totals_computed_at -- guard broke checkout';
  end if;
  if v_subtotal is distinct from 10000 then
    raise exception 'FAIL: expected subtotal 10000 from reprice, got %', v_subtotal;
  end if;
end $$;
rollback;
