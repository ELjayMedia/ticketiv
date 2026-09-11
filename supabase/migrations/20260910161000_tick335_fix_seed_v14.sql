-- TICK-335 v14: fix fn_seed_uat_fixtures to use correct ledger_entries column names

create or replace function public.fn_seed_uat_fixtures()
  returns jsonb
  language plpgsql
  security definer
  set search_path to 'public'
as $$
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
  P_PAID  uuid := 'da7a0006-0000-4000-8000-000000000001';
begin
  alter table public.order_items disable trigger trg_guard_scanner_checkin_only;

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
    (ORG_A, U_BUY1,  'attendee'),
    (ORG_A, U_BUY2,  'attendee'),
    (ORG_B, U_BOWN,  'organizer_owner');

  insert into public.venues (id, org_id, name, city, slug) values
    (VENUE, ORG_A, 'UAT Venue', 'Mbabane', 'uat-venue');

  insert into public.events (id, org_id, venue_id, title, slug, category, visibility, status, starts_at, ends_at, country_code) values
    (EV_LIVE, ORG_A, VENUE, 'UAT Live Event',  'uat-live-event',  'music',  'unlisted', 'published', now() + interval '1 day', now() + interval '2 days', 'SZ'),
    (EV_DRFT, ORG_A, VENUE, 'UAT Draft Event',  'uat-draft-event', 'music',  'unlisted', 'draft',     now() + interval '1 day', now() + interval '2 days', 'SZ'),
    (EV_BETA, ORG_B, VENUE, 'UAT Beta Event',   'uat-beta-event',  'music',  'unlisted', 'published', now() + interval '1 day', now() + interval '2 days', 'SZ');

  insert into public.ticket_types (id, event_id, name, price_cents, currency, quota, sales_status) values
    (TT_GA,  EV_LIVE, 'General Admission', 15000,  'ZAR', 100, 'on_sale'),
    (TT_VIP, EV_LIVE, 'VIP',               35000,  'ZAR', 20,  'on_sale'),
    (TT_BETA,EV_BETA, 'General Admission', 15000,  'ZAR', 100, 'on_sale');

  -- Create paid order using correct column names (org_id, email)
  insert into public.orders (id, org_id, email, status, total_cents, currency) values
    (O_PAID, ORG_A, 'uat-buyer1@uat.ticketiv.invalid', 'paid', 15000, 'ZAR');

  -- Insert order item with 'issued' status and ticket_code (NOT NULL)
  insert into public.order_items (id, order_id, ticket_type_id, status, ticket_code) values
    ('da7a0007-0000-4000-8000-000000000001', O_PAID, TT_GA, 'issued', 'UAT-PAID-0001');

  -- Insert payment record
  insert into public.payments (id, order_id, provider, amount_cents, currency, status) values
    (P_PAID, O_PAID, 'paystack', 15000, 'ZAR', 'succeeded');

  -- Insert ledger entries (correct column names: type, not entry_type)
  insert into public.ledger_entries (id, org_id, order_id, payment_id, type, amount_cents, currency) values
    ('da7a0008-0000-4000-8000-000000000001', ORG_A, O_PAID, P_PAID, 'order_gross', 15000, 'ZAR'),
    ('da7a0008-0000-4000-8000-000000000002', ORG_A, O_PAID, P_PAID, 'platform_fee', -975, 'ZAR'),
    ('da7a0008-0000-4000-8000-000000000003', ORG_A, O_PAID, P_PAID, 'payment_net', 14025, 'ZAR');

  alter table public.order_items enable trigger trg_guard_scanner_checkin_only;

  return jsonb_build_object('seeded', true);
end;
$$;

grant execute on function public.fn_seed_uat_fixtures() to service_role;
revoke execute on function public.fn_seed_uat_fixtures() from public, anon, authenticated;
