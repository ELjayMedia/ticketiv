-- TICK-334 — repair the repeatable UAT fixture after the Paystack/ZAR money-path change.
--
-- The original fixture predates the launch decision to price Paystack-backed tickets
-- in ZAR. ticket_types now default to ZAR while the fixture still hard-coded SZL on
-- pricing plans, orders, payment completion, payments and refunds. That makes the
-- canonical mixed-currency guard reject the very first order_item insert.
--
-- Keep the fixture deterministic by making its launch-rail currency explicit on
-- every money-bearing row instead of relying on table defaults.

create or replace function public.fn_seed_uat_fixtures()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  ORG_A   uuid := 'da7a0000-0000-4000-8000-000000000001';
  ORG_B   uuid := 'da7a0000-0000-4000-8000-000000000002';
  U_OWNER uuid := 'da7a0001-0000-4000-8000-000000000001';
  U_ADMIN uuid := 'da7a0001-0000-4000-8000-000000000002';
  U_FIN   uuid := 'da7a0001-0000-4000-8000-000000000003';
  U_SCAN  uuid := 'da7a0001-0000-4000-8000-000000000004';
  U_CASH  uuid := 'da7a0001-0000-4000-8000-000000000005';
  U_BUY1  uuid := 'da7a0001-0000-4000-8000-000000000006';
  U_BUY2  uuid := 'da7a0001-0000-4000-8000-000000000007';
  U_BOWN  uuid := 'da7a0001-0000-4000-8000-000000000008';
  VENUE   uuid := 'da7a0002-0000-4000-8000-000000000001';
  EV_LIVE uuid := 'da7a0003-0000-4000-8000-000000000001';
  EV_DRFT uuid := 'da7a0003-0000-4000-8000-000000000002';
  EV_BETA uuid := 'da7a0003-0000-4000-8000-000000000003';
  TT_GA   uuid := 'da7a0004-0000-4000-8000-000000000001';
  TT_VIP  uuid := 'da7a0004-0000-4000-8000-000000000002';
  TT_BETA uuid := 'da7a0004-0000-4000-8000-000000000003';
  O_PAID  uuid := 'da7a0005-0000-4000-8000-000000000001';
  O_LIVE  uuid := 'da7a0005-0000-4000-8000-000000000002';
  O_STALE uuid := 'da7a0005-0000-4000-8000-000000000003';
  O_FAIL  uuid := 'da7a0005-0000-4000-8000-000000000004';
  O_REFD  uuid := 'da7a0005-0000-4000-8000-000000000005';
  O_DISC  uuid := 'da7a0005-0000-4000-8000-000000000006';
  P_REFD  uuid := 'da7a0006-0000-4000-8000-000000000002';
  P_DISC  uuid := 'da7a0006-0000-4000-8000-000000000003';
  v_total integer;
  v_item  uuid;
begin
  perform public.fn_teardown_uat_fixtures();

  insert into auth.users (id, email, aud, role, instance_id) values
    (U_OWNER,'uat-owner@uat.ticketiv.invalid','authenticated','authenticated','00000000-0000-0000-0000-000000000000'),
    (U_ADMIN,'uat-admin@uat.ticketiv.invalid','authenticated','authenticated','00000000-0000-0000-0000-000000000000'),
    (U_FIN,  'uat-finance@uat.ticketiv.invalid','authenticated','authenticated','00000000-0000-0000-0000-000000000000'),
    (U_SCAN, 'uat-scanner@uat.ticketiv.invalid','authenticated','authenticated','00000000-0000-0000-0000-000000000000'),
    (U_CASH, 'uat-cashier@uat.ticketiv.invalid','authenticated','authenticated','00000000-0000-0000-0000-000000000000'),
    (U_BUY1, 'uat-buyer1@uat.ticketiv.invalid','authenticated','authenticated','00000000-0000-0000-0000-000000000000'),
    (U_BUY2, 'uat-buyer2@uat.ticketiv.invalid','authenticated','authenticated','00000000-0000-0000-0000-000000000000'),
    (U_BOWN, 'uat-beta-owner@uat.ticketiv.invalid','authenticated','authenticated','00000000-0000-0000-0000-000000000000');

  insert into public.organizations (id, name, slug) values
    (ORG_A, 'UAT Alpha Events', 'uat-alpha'),
    (ORG_B, 'UAT Beta Events',  'uat-beta');

  insert into public.org_members (org_id, user_id, role) values
    (ORG_A, U_OWNER, 'organizer_owner'),
    (ORG_A, U_ADMIN, 'organizer_admin'),
    (ORG_A, U_FIN,   'finance'),
    (ORG_A, U_SCAN,  'organizer_scanner'),
    (ORG_A, U_CASH,  'pos'),
    (ORG_B, U_BOWN,  'organizer_owner');

  insert into public.pricing_plans
    (org_id, platform_percent_bps, platform_fixed_cents, processor_percent_bps,
     processor_fixed_cents, platform_fee_payer, processor_fee_payer, currency, active)
  values (ORG_A, 650, 0, 290, 100, 'buyer', 'buyer', 'ZAR', true);

  insert into public.venues (id, name, slug, city)
  values (VENUE, 'UAT Test Grounds', 'uat-test-grounds', 'Mbabane');

  insert into public.events (id, org_id, title, slug, status, visibility, venue_id, starts_at)
  values
    (EV_LIVE, ORG_A, 'UAT Live Event', 'uat-live-event', 'published', 'unlisted', VENUE, now() + interval '30 days'),
    (EV_BETA, ORG_B, 'UAT Beta Event', 'uat-beta-event', 'published', 'unlisted', VENUE, now() + interval '30 days');
  insert into public.events (id, org_id, title, slug, status, visibility)
  values (EV_DRFT, ORG_A, 'UAT Draft Event', 'uat-draft-event', 'draft', 'private');

  insert into public.ticket_types (id, event_id, name, price_cents, quota, currency) values
    (TT_GA,   EV_LIVE, 'UAT General Admission', 10000, 100, 'ZAR'),
    (TT_VIP,  EV_LIVE, 'UAT VIP',               25000, 20, 'ZAR'),
    (TT_BETA, EV_BETA, 'UAT Beta GA',           10000, 50, 'ZAR');

  insert into public.orders (id, org_id, buyer_id, buyer_email, total_cents, currency,
                             status, subtotal_cents, channel, item_count, fees_paid_by)
  values (O_PAID, ORG_A, U_BUY1, 'uat-buyer1@uat.ticketiv.invalid', 20000, 'ZAR',
          'pending', 20000, 'online', 2, 'buyer');
  insert into public.order_items (order_id, ticket_type_id, ticket_code, status) values
    (O_PAID, TT_GA, 'UAT-ALPHA-GA-0001', 'pending'),
    (O_PAID, TT_GA, 'UAT-ALPHA-GA-0002', 'pending');
  insert into public.payment_attempts (order_id, provider, attempt_no, status, ext_ref)
  values (O_PAID, 'paystack', 1, 'pending', 'uat_ref_paid_0001');

  select total_cents into v_total from public.orders where id = O_PAID;
  perform public.fn_complete_order_payment(
    O_PAID, 'paystack', 'uat_ref_paid_0001', v_total, 'ZAR',
    jsonb_build_object('source', 'uat_fixture'));

  select id into v_item from public.order_items where order_id = O_PAID order by ticket_code limit 1;
  insert into public.scans (event_id, ticket_code, outcome, order_item_id, scanned_at)
  values (EV_LIVE, 'UAT-ALPHA-GA-0001', 'valid', v_item, now() - interval '1 hour');
  update public.order_items set status = 'checked_in' where id = v_item;

  insert into public.orders (id, org_id, buyer_id, buyer_email, total_cents, currency,
                             status, subtotal_cents, channel, item_count, hold_expires_at)
  values (O_LIVE, ORG_A, U_BUY2, 'uat-buyer2@uat.ticketiv.invalid', 10000, 'ZAR',
          'pending', 10000, 'online', 1, now() + interval '9 minutes');
  insert into public.order_items (order_id, ticket_type_id, ticket_code, status)
  values (O_LIVE, TT_GA, 'UAT-ALPHA-GA-0003', 'pending');

  insert into public.orders (id, org_id, buyer_id, buyer_email, total_cents, currency,
                             status, subtotal_cents, channel, item_count, hold_expires_at)
  values (O_STALE, ORG_A, U_BUY2, 'uat-buyer2@uat.ticketiv.invalid', 10000, 'ZAR',
          'pending', 10000, 'online', 1, now() - interval '2 hours');
  insert into public.order_items (order_id, ticket_type_id, ticket_code, status)
  values (O_STALE, TT_GA, 'UAT-ALPHA-GA-0004', 'pending');

  insert into public.orders (id, org_id, buyer_id, buyer_email, total_cents, currency,
                             status, subtotal_cents, channel, item_count)
  values (O_FAIL, ORG_A, U_BUY2, 'uat-buyer2@uat.ticketiv.invalid', 10000, 'ZAR',
          'failed', 10000, 'online', 1);
  insert into public.order_items (order_id, ticket_type_id, ticket_code, status)
  values (O_FAIL, TT_GA, 'UAT-ALPHA-GA-0005', 'revoked');

  insert into public.orders (id, org_id, buyer_id, buyer_email, total_cents, currency,
                             status, subtotal_cents, channel, item_count)
  values (O_REFD, ORG_A, U_BUY1, 'uat-buyer1@uat.ticketiv.invalid', 10000, 'ZAR',
          'paid', 10000, 'online', 1);
  insert into public.order_items (order_id, ticket_type_id, ticket_code, status)
  values (O_REFD, TT_GA, 'UAT-ALPHA-GA-0006', 'issued');
  insert into public.payments (id, order_id, provider, amount_cents, currency,
                               ext_payment_id, status, channel)
  values (P_REFD, O_REFD, 'paystack', 10000, 'ZAR', 'uat_ref_refunded_0001', 'succeeded', 'online');
  insert into public.refunds (payment_id, amount_cents, currency, status)
  values (P_REFD, 10000, 'ZAR', 'requested');
  update public.refunds set status = 'processed' where payment_id = P_REFD;

  insert into public.payout_accounts (org_id, provider, details_encrypted)
  values (ORG_A, 'paystack', 'uat-fixture-not-a-real-account');
  insert into public.payouts (org_id, amount_cents, provider, status)
  values (ORG_A, 5000, 'paystack', 'requested');

  insert into public.orders (id, org_id, buyer_id, buyer_email, total_cents, currency,
                             status, subtotal_cents, channel, item_count)
  values (O_DISC, ORG_A, U_BUY2, 'uat-buyer2@uat.ticketiv.invalid', 10000, 'ZAR',
          'paid', 10000, 'online', 1);
  insert into public.order_items (order_id, ticket_type_id, ticket_code, status)
  values (O_DISC, TT_GA, 'UAT-ALPHA-GA-0007', 'issued');
  insert into public.payments (id, order_id, provider, amount_cents, currency,
                               ext_payment_id, status, channel)
  values (P_DISC, O_DISC, 'paystack', 10000, 'ZAR', 'uat_ref_discrepancy_0001', 'succeeded', 'online');
  delete from public.ledger_entries where order_id = O_DISC;

  return jsonb_build_object(
    'ok', true,
    'currency', 'ZAR',
    'orgs', jsonb_build_object('alpha', ORG_A, 'beta', ORG_B),
    'personas', jsonb_build_object(
      'owner', U_OWNER, 'admin', U_ADMIN, 'finance', U_FIN,
      'scanner', U_SCAN, 'cashier', U_CASH, 'buyer1', U_BUY1,
      'buyer2', U_BUY2, 'beta_owner', U_BOWN),
    'events', jsonb_build_object('live', EV_LIVE, 'draft', EV_DRFT, 'beta', EV_BETA),
    'ticket_types', jsonb_build_object('ga', TT_GA, 'vip', TT_VIP, 'beta_ga', TT_BETA),
    'orders', jsonb_build_object(
      'paid', O_PAID, 'pending_live', O_LIVE, 'pending_stale', O_STALE,
      'failed', O_FAIL, 'refunded', O_REFD, 'discrepancy', O_DISC),
    'counts', jsonb_build_object(
      'orders', (select count(*) from public.orders where org_id in (ORG_A, ORG_B)),
      'payments', (select count(*) from public.payments p
                   join public.orders o on o.id = p.order_id where o.org_id in (ORG_A, ORG_B)),
      'ledger_entries', (select count(*) from public.ledger_entries where org_id in (ORG_A, ORG_B)),
      'scans', (select count(*) from public.scans where event_id = EV_LIVE))
  );
end;
$function$;

revoke execute on function public.fn_seed_uat_fixtures() from public, anon, authenticated;
grant execute on function public.fn_seed_uat_fixtures() to service_role;;
