-- Phase 6M: Hierarchy tests for fn_get_effective_payment_providers
-- Run after baseline + TICK-395 + TICK-396/397 applied

-- Setup test data
DO $$
DECLARE
  v_org_id uuid;
  v_event_id uuid;
  v_ticket_type_id uuid;
  v_org_b_id uuid;
  v_event_b_id uuid;
  v_result text[];
BEGIN
  -- Create test organization
  insert into public.organizations (name, slug, default_currency)
  values ('Test Org', 'test-org', 'SZL')
  returning id into v_org_id;

  -- Create test event
  insert into public.events (org_id, title, status, visibility)
  values (v_org_id, 'Test Event', 'draft', 'private')
  returning id into v_event_id;

  -- Create test ticket type
  insert into public.ticket_types (event_id, name, price_cents, currency, quota)
  values (v_event_id, 'General', 10000, 'SZL', 100)
  returning id into v_ticket_type_id;

  -- Create second org for invalid hierarchy test
  insert into public.organizations (name, slug, default_currency)
  values ('Test Org B', 'test-org-b', 'SZL')
  returning id into v_org_b_id;

  -- Create event belonging to org B
  insert into public.events (org_id, title, status, visibility)
  values (v_org_b_id, 'Test Event B', 'draft', 'private')
  returning id into v_event_b_id;

  -- ========================================
  -- Test 1: Platform restriction
  -- Platform: paystack, momo
  -- Organizer: paystack, deltapay
  -- Expected: paystack (not paystack, deltapay)
  -- ========================================
  update public.payment_provider_settings set is_enabled = false;
  update public.payment_provider_settings set is_enabled = true where provider = 'paystack';
  update public.payment_provider_settings set is_enabled = true where provider = 'momo';

  update public.organizations set payment_providers = array['paystack', 'deltapay'] where id = v_org_id;

  v_result := public.fn_get_effective_payment_providers(v_org_id);
  if v_result = array['paystack']::text[] then
    raise notice 'Test 1 PASSED: Platform restriction';
  else
    raise exception 'Test 1 FAILED: Expected paystack, got %', v_result;
  end if;

  -- ========================================
  -- Test 2: Organizer inherit
  -- Platform: paystack, momo
  -- Organizer: []
  -- Expected: paystack, momo
  -- ========================================
  update public.organizations set payment_providers = '{}'::text[] where id = v_org_id;

  v_result := public.fn_get_effective_payment_providers(v_org_id);
  if v_result = array['momo', 'paystack']::text[] then
    raise notice 'Test 2 PASSED: Organizer inherit';
  else
    raise exception 'Test 2 FAILED: Expected momo,paystack, got %', v_result;
  end if;

  -- ========================================
  -- Test 3: Event restriction
  -- Platform: paystack, momo, deltapay
  -- Organizer: paystack, momo
  -- Event: momo, deltapay
  -- Expected: momo
  -- ========================================
  update public.payment_provider_settings set is_enabled = true where provider = 'deltapay';
  update public.organizations set payment_providers = array['paystack', 'momo'] where id = v_org_id;
  update public.events set payment_providers = array['momo', 'deltapay'] where id = v_event_id;

  v_result := public.fn_get_effective_payment_providers(v_org_id, v_event_id);
  if v_result = array['momo']::text[] then
    raise notice 'Test 3 PASSED: Event restriction';
  else
    raise exception 'Test 3 FAILED: Expected momo, got %', v_result;
  end if;

  -- ========================================
  -- Test 4: Ticket-type restriction
  -- Platform: paystack, momo, deltapay
  -- Organizer: paystack, momo
  -- Event: paystack, momo
  -- Ticket type: momo, deltapay
  -- Expected: momo
  -- ========================================
  update public.events set payment_providers = array['paystack', 'momo'] where id = v_event_id;
  update public.ticket_types set payment_providers = array['momo', 'deltapay'] where id = v_ticket_type_id;

  v_result := public.fn_get_effective_payment_providers(v_org_id, v_event_id, v_ticket_type_id);
  if v_result = array['momo']::text[] then
    raise notice 'Test 4 PASSED: Ticket-type restriction';
  else
    raise exception 'Test 4 FAILED: Expected momo, got %', v_result;
  end if;

  -- ========================================
  -- Test 5: Globally disabled provider
  -- Platform has DeltaPay disabled
  -- Organizer/event/ticket type all request deltapay
  -- Expected: []
  -- ========================================
  update public.payment_provider_settings set is_enabled = false where provider = 'deltapay';
  update public.organizations set payment_providers = array['deltapay'] where id = v_org_id;
  update public.events set payment_providers = array['deltapay'] where id = v_event_id;
  update public.ticket_types set payment_providers = array['deltapay'] where id = v_ticket_type_id;

  v_result := public.fn_get_effective_payment_providers(v_org_id, v_event_id, v_ticket_type_id);
  if v_result = '{}'::text[] then
    raise notice 'Test 5 PASSED: Globally disabled provider';
  else
    raise exception 'Test 5 FAILED: Expected empty, got %', v_result;
  end if;

  -- ========================================
  -- Test 6: Invalid hierarchy
  -- Organization A + Event belonging to Organization B
  -- Expected: [] (fail closed)
  -- ========================================
  v_result := public.fn_get_effective_payment_providers(v_org_id, v_event_b_id);
  if v_result = '{}'::text[] then
    raise notice 'Test 6 PASSED: Invalid hierarchy';
  else
    raise exception 'Test 6 FAILED: Expected empty, got %', v_result;
  end if;

  -- ========================================
  -- Test 7: Empty intersection
  -- Platform: paystack
  -- Organizer: momo
  -- Expected: [] (not NULL, not fallback to platform)
  -- ========================================
  update public.payment_provider_settings set is_enabled = false;
  update public.payment_provider_settings set is_enabled = true where provider = 'paystack';
  update public.organizations set payment_providers = array['momo'] where id = v_org_id;
  update public.events set payment_providers = '{}'::text[] where id = v_event_id;
  update public.ticket_types set payment_providers = '{}'::text[] where id = v_ticket_type_id;

  v_result := public.fn_get_effective_payment_providers(v_org_id, v_event_id, v_ticket_type_id);
  if v_result = '{}'::text[] then
    raise notice 'Test 7 PASSED: Empty intersection';
  else
    raise exception 'Test 7 FAILED: Expected empty, got %', v_result;
  end if;

  -- Cleanup
  delete from public.ticket_types where id = v_ticket_type_id;
  delete from public.events where id = v_event_id;
  delete from public.events where id = v_event_b_id;
  delete from public.organizations where id = v_org_id;
  delete from public.organizations where id = v_org_b_id;

  raise notice 'ALL TESTS PASSED';
END;
$$;
