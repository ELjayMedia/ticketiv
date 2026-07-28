-- TICK-337 — capture live-only service-role RPC helpers in source control.
--
-- Live Supabase drift on 2026-07-27 showed these three SECURITY DEFINER
-- functions present in production but absent from committed migrations and the
-- RPC permission matrix. They are intentionally server-only: browser roles must
-- not execute them through PostgREST.

create or replace function public.fn_rate_limit_edge(
  p_bucket text,
  p_key text,
  p_max integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_bucket text := 'edge:' || coalesce(p_bucket, '') || ':' || coalesce(p_key, '');
  v_allowed boolean;
  v_window_start timestamptz;
  v_hits integer;
begin
  if p_key is null or coalesce(p_max, 0) <= 0 or coalesce(p_window_seconds, 0) <= 0 then
    return jsonb_build_object('allowed', true, 'remaining', coalesce(p_max, 0), 'retry_after', 0);
  end if;

  v_allowed := public.fn_rate_limit(v_bucket, p_max, p_window_seconds);

  v_window_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );
  select hits into v_hits
  from public.rate_limits
  where bucket = v_bucket and window_start = v_window_start;

  return jsonb_build_object(
    'allowed', v_allowed,
    'remaining', greatest(0, p_max - coalesce(v_hits, 0)),
    'retry_after', greatest(
      1,
      ceil(extract(epoch from (v_window_start + make_interval(secs => p_window_seconds) - clock_timestamp())))
    )::integer
  );
end;
$function$;

revoke execute on function public.fn_rate_limit_edge(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.fn_rate_limit_edge(text, text, integer, integer)
  to service_role;

create or replace function public.fn_teardown_uat_fixtures()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_orgs uuid[] := array[
    'da7a0000-0000-4000-8000-000000000001'::uuid,
    'da7a0000-0000-4000-8000-000000000002'::uuid
  ];
  v_users uuid[] := array[
    'da7a0001-0000-4000-8000-000000000001'::uuid,
    'da7a0001-0000-4000-8000-000000000002'::uuid,
    'da7a0001-0000-4000-8000-000000000003'::uuid,
    'da7a0001-0000-4000-8000-000000000004'::uuid,
    'da7a0001-0000-4000-8000-000000000005'::uuid,
    'da7a0001-0000-4000-8000-000000000006'::uuid,
    'da7a0001-0000-4000-8000-000000000007'::uuid,
    'da7a0001-0000-4000-8000-000000000008'::uuid
  ];
  v_venue uuid := 'da7a0002-0000-4000-8000-000000000001';
  v_orders integer;
begin
  select count(*) into v_orders
  from public.orders
  where org_id = any(v_orgs);

  delete from public.scans s
  where s.event_id in (select id from public.events where org_id = any(v_orgs));
  delete from public.ledger_entries where org_id = any(v_orgs);
  delete from public.refund_items ri
  where ri.refund_id in (
    select r.id
    from public.refunds r
    join public.payments p on p.id = r.payment_id
    where p.order_id in (select id from public.orders where org_id = any(v_orgs))
  );
  delete from public.refunds r
  where r.payment_id in (
    select p.id
    from public.payments p
    where p.order_id in (select id from public.orders where org_id = any(v_orgs))
  );
  delete from public.payment_outbox
  where order_id in (select id from public.orders where org_id = any(v_orgs));
  delete from public.payment_attempts
  where order_id in (select id from public.orders where org_id = any(v_orgs));
  delete from public.payments
  where order_id in (select id from public.orders where org_id = any(v_orgs));
  delete from public.order_items
  where order_id in (select id from public.orders where org_id = any(v_orgs));
  delete from public.orders where org_id = any(v_orgs);
  delete from public.payouts where org_id = any(v_orgs);
  delete from public.payout_accounts where org_id = any(v_orgs);
  delete from public.devices where org_id = any(v_orgs);
  delete from public.seat_holds
  where event_id in (select id from public.events where org_id = any(v_orgs));
  delete from public.ticket_types
  where event_id in (select id from public.events where org_id = any(v_orgs));
  delete from public.events where org_id = any(v_orgs);
  delete from public.pricing_plans where org_id = any(v_orgs);
  delete from public.org_members where org_id = any(v_orgs);
  delete from public.organizations where id = any(v_orgs);
  delete from public.venues where id = v_venue;
  delete from public.notifications where user_id = any(v_users);
  delete from public.profiles where user_id = any(v_users);
  delete from auth.users where id = any(v_users);

  return jsonb_build_object('ok', true, 'removed', jsonb_build_object('orders_removed', v_orders));
end;
$function$;

revoke execute on function public.fn_teardown_uat_fixtures()
  from public, anon, authenticated;
grant execute on function public.fn_teardown_uat_fixtures()
  to service_role;

create or replace function public.fn_seed_uat_fixtures()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  org_a uuid := 'da7a0000-0000-4000-8000-000000000001';
  org_b uuid := 'da7a0000-0000-4000-8000-000000000002';
  u_owner uuid := 'da7a0001-0000-4000-8000-000000000001';
  u_admin uuid := 'da7a0001-0000-4000-8000-000000000002';
  u_fin uuid := 'da7a0001-0000-4000-8000-000000000003';
  u_scan uuid := 'da7a0001-0000-4000-8000-000000000004';
  u_cash uuid := 'da7a0001-0000-4000-8000-000000000005';
  u_buy1 uuid := 'da7a0001-0000-4000-8000-000000000006';
  u_buy2 uuid := 'da7a0001-0000-4000-8000-000000000007';
  u_bown uuid := 'da7a0001-0000-4000-8000-000000000008';
  venue uuid := 'da7a0002-0000-4000-8000-000000000001';
  ev_live uuid := 'da7a0003-0000-4000-8000-000000000001';
  ev_drft uuid := 'da7a0003-0000-4000-8000-000000000002';
  ev_beta uuid := 'da7a0003-0000-4000-8000-000000000003';
  tt_ga uuid := 'da7a0004-0000-4000-8000-000000000001';
  tt_vip uuid := 'da7a0004-0000-4000-8000-000000000002';
  tt_beta uuid := 'da7a0004-0000-4000-8000-000000000003';
  o_paid uuid := 'da7a0005-0000-4000-8000-000000000001';
  o_live uuid := 'da7a0005-0000-4000-8000-000000000002';
  o_stale uuid := 'da7a0005-0000-4000-8000-000000000003';
  o_fail uuid := 'da7a0005-0000-4000-8000-000000000004';
  o_refd uuid := 'da7a0005-0000-4000-8000-000000000005';
  o_disc uuid := 'da7a0005-0000-4000-8000-000000000006';
  p_refd uuid := 'da7a0006-0000-4000-8000-000000000002';
  p_disc uuid := 'da7a0006-0000-4000-8000-000000000003';
  v_total integer;
  v_item uuid;
begin
  perform public.fn_teardown_uat_fixtures();

  insert into auth.users (id, email, aud, role, instance_id) values
    (u_owner, 'uat-owner@uat.ticketiv.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    (u_admin, 'uat-admin@uat.ticketiv.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    (u_fin, 'uat-finance@uat.ticketiv.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    (u_scan, 'uat-scanner@uat.ticketiv.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    (u_cash, 'uat-cashier@uat.ticketiv.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    (u_buy1, 'uat-buyer1@uat.ticketiv.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    (u_buy2, 'uat-buyer2@uat.ticketiv.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    (u_bown, 'uat-beta-owner@uat.ticketiv.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');

  insert into public.organizations (id, name, slug) values
    (org_a, 'UAT Alpha Events', 'uat-alpha'),
    (org_b, 'UAT Beta Events', 'uat-beta');

  insert into public.org_members (org_id, user_id, role) values
    (org_a, u_owner, 'organizer_owner'),
    (org_a, u_admin, 'organizer_admin'),
    (org_a, u_fin, 'finance'),
    (org_a, u_scan, 'organizer_scanner'),
    (org_a, u_cash, 'pos'),
    (org_b, u_bown, 'organizer_owner');

  insert into public.pricing_plans
    (org_id, platform_percent_bps, platform_fixed_cents, processor_percent_bps,
     processor_fixed_cents, platform_fee_payer, processor_fee_payer, currency, active)
  values (org_a, 650, 0, 290, 100, 'buyer', 'buyer', 'SZL', true);

  insert into public.venues (id, name, slug, city)
  values (venue, 'UAT Test Grounds', 'uat-test-grounds', 'Mbabane');

  insert into public.events (id, org_id, title, slug, status, visibility, venue_id, starts_at)
  values
    (ev_live, org_a, 'UAT Live Event', 'uat-live-event', 'published', 'unlisted', venue, now() + interval '30 days'),
    (ev_beta, org_b, 'UAT Beta Event', 'uat-beta-event', 'published', 'unlisted', venue, now() + interval '30 days');
  insert into public.events (id, org_id, title, slug, status, visibility)
  values (ev_drft, org_a, 'UAT Draft Event', 'uat-draft-event', 'draft', 'private');

  insert into public.ticket_types (id, event_id, name, price_cents, quota) values
    (tt_ga, ev_live, 'UAT General Admission', 10000, 100),
    (tt_vip, ev_live, 'UAT VIP', 25000, 20),
    (tt_beta, ev_beta, 'UAT Beta GA', 10000, 50);

  insert into public.orders (id, org_id, buyer_id, buyer_email, total_cents, currency,
                             status, subtotal_cents, channel, item_count, fees_paid_by)
  values (o_paid, org_a, u_buy1, 'uat-buyer1@uat.ticketiv.invalid', 20000, 'SZL',
          'pending', 20000, 'online', 2, 'buyer');
  insert into public.order_items (order_id, ticket_type_id, ticket_code, status) values
    (o_paid, tt_ga, 'UAT-ALPHA-GA-0001', 'pending'),
    (o_paid, tt_ga, 'UAT-ALPHA-GA-0002', 'pending');
  insert into public.payment_attempts (order_id, provider, attempt_no, status, ext_ref)
  values (o_paid, 'paystack', 1, 'pending', 'uat_ref_paid_0001');

  select total_cents into v_total from public.orders where id = o_paid;
  perform public.fn_complete_order_payment(
    o_paid, 'paystack', 'uat_ref_paid_0001', v_total, 'SZL',
    jsonb_build_object('source', 'uat_fixture')
  );

  select id into v_item from public.order_items where order_id = o_paid order by ticket_code limit 1;
  insert into public.scans (event_id, ticket_code, outcome, order_item_id, scanned_at)
  values (ev_live, 'UAT-ALPHA-GA-0001', 'valid', v_item, now() - interval '1 hour');
  update public.order_items set status = 'checked_in' where id = v_item;

  insert into public.orders (id, org_id, buyer_id, buyer_email, total_cents, currency,
                             status, subtotal_cents, channel, item_count, hold_expires_at)
  values (o_live, org_a, u_buy2, 'uat-buyer2@uat.ticketiv.invalid', 10000, 'SZL',
          'pending', 10000, 'online', 1, now() + interval '9 minutes');
  insert into public.order_items (order_id, ticket_type_id, ticket_code, status)
  values (o_live, tt_ga, 'UAT-ALPHA-GA-0003', 'pending');

  insert into public.orders (id, org_id, buyer_id, buyer_email, total_cents, currency,
                             status, subtotal_cents, channel, item_count, hold_expires_at)
  values (o_stale, org_a, u_buy2, 'uat-buyer2@uat.ticketiv.invalid', 10000, 'SZL',
          'pending', 10000, 'online', 1, now() - interval '2 hours');
  insert into public.order_items (order_id, ticket_type_id, ticket_code, status)
  values (o_stale, tt_ga, 'UAT-ALPHA-GA-0004', 'pending');

  insert into public.orders (id, org_id, buyer_id, buyer_email, total_cents, currency,
                             status, subtotal_cents, channel, item_count)
  values (o_fail, org_a, u_buy2, 'uat-buyer2@uat.ticketiv.invalid', 10000, 'SZL',
          'failed', 10000, 'online', 1);
  insert into public.order_items (order_id, ticket_type_id, ticket_code, status)
  values (o_fail, tt_ga, 'UAT-ALPHA-GA-0005', 'revoked');

  insert into public.orders (id, org_id, buyer_id, buyer_email, total_cents, currency,
                             status, subtotal_cents, channel, item_count)
  values (o_refd, org_a, u_buy1, 'uat-buyer1@uat.ticketiv.invalid', 10000, 'SZL',
          'paid', 10000, 'online', 1);
  insert into public.order_items (order_id, ticket_type_id, ticket_code, status)
  values (o_refd, tt_ga, 'UAT-ALPHA-GA-0006', 'issued');
  insert into public.payments (id, order_id, provider, amount_cents, currency,
                               ext_payment_id, status, channel)
  values (p_refd, o_refd, 'paystack', 10000, 'SZL', 'uat_ref_refunded_0001', 'succeeded', 'online');
  insert into public.refunds (payment_id, amount_cents, currency, status)
  values (p_refd, 10000, 'SZL', 'requested');
  update public.refunds set status = 'processed' where payment_id = p_refd;

  insert into public.payout_accounts (org_id, provider, details_encrypted)
  values (org_a, 'paystack', 'uat-fixture-not-a-real-account');
  insert into public.payouts (org_id, amount_cents, provider, status)
  values (org_a, 5000, 'paystack', 'requested');

  insert into public.orders (id, org_id, buyer_id, buyer_email, total_cents, currency,
                             status, subtotal_cents, channel, item_count)
  values (o_disc, org_a, u_buy2, 'uat-buyer2@uat.ticketiv.invalid', 10000, 'SZL',
          'paid', 10000, 'online', 1);
  insert into public.order_items (order_id, ticket_type_id, ticket_code, status)
  values (o_disc, tt_ga, 'UAT-ALPHA-GA-0007', 'issued');
  insert into public.payments (id, order_id, provider, amount_cents, currency,
                               ext_payment_id, status, channel)
  values (p_disc, o_disc, 'paystack', 10000, 'SZL', 'uat_ref_discrepancy_0001', 'succeeded', 'online');
  delete from public.ledger_entries where order_id = o_disc;

  return jsonb_build_object(
    'ok', true,
    'orgs', jsonb_build_object('alpha', org_a, 'beta', org_b),
    'personas', jsonb_build_object(
      'owner', u_owner, 'admin', u_admin, 'finance', u_fin,
      'scanner', u_scan, 'cashier', u_cash, 'buyer1', u_buy1,
      'buyer2', u_buy2, 'beta_owner', u_bown
    ),
    'events', jsonb_build_object('live', ev_live, 'draft', ev_drft, 'beta', ev_beta),
    'ticket_types', jsonb_build_object('ga', tt_ga, 'vip', tt_vip, 'beta_ga', tt_beta),
    'orders', jsonb_build_object(
      'paid', o_paid, 'pending_live', o_live, 'pending_stale', o_stale,
      'failed', o_fail, 'refunded', o_refd, 'discrepancy', o_disc
    ),
    'counts', jsonb_build_object(
      'orders', (select count(*) from public.orders where org_id in (org_a, org_b)),
      'payments', (
        select count(*)
        from public.payments p
        join public.orders o on o.id = p.order_id
        where o.org_id in (org_a, org_b)
      ),
      'ledger_entries', (select count(*) from public.ledger_entries where org_id in (org_a, org_b)),
      'scans', (select count(*) from public.scans where event_id = ev_live)
    )
  );
end;
$function$;

revoke execute on function public.fn_seed_uat_fixtures()
  from public, anon, authenticated;
grant execute on function public.fn_seed_uat_fixtures()
  to service_role;
