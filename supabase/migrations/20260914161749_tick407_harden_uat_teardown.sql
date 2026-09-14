-- TICK-407: checkout E2E creates random order UUIDs under deterministic UAT orgs.
-- Teardown must clean by UAT organization rather than a fixed order-id allowlist.

create or replace function public.fn_teardown_uat_fixtures()
  returns jsonb
  language plpgsql
  security definer
  set search_path to 'public'
as $$
begin
  delete from public.price_rule_redemptions
  where order_id in (
    select id from public.orders
    where org_id in (
      'da7a0000-0000-4000-8000-000000000001',
      'da7a0000-0000-4000-8000-000000000002'
    )
  );

  delete from public.refunds
  where payment_id in (
    select p.id
    from public.payments p
    join public.orders o on o.id = p.order_id
    where o.org_id in (
      'da7a0000-0000-4000-8000-000000000001',
      'da7a0000-0000-4000-8000-000000000002'
    )
  );

  delete from public.audit_log
  where org_id in (
    'da7a0000-0000-4000-8000-000000000001',
    'da7a0000-0000-4000-8000-000000000002'
  );

  delete from public.payouts
  where org_id in (
    'da7a0000-0000-4000-8000-000000000001',
    'da7a0000-0000-4000-8000-000000000002'
  );

  delete from public.payout_accounts
  where org_id in (
    'da7a0000-0000-4000-8000-000000000001',
    'da7a0000-0000-4000-8000-000000000002'
  );

  delete from public.pos_shifts
  where org_id in (
    'da7a0000-0000-4000-8000-000000000001',
    'da7a0000-0000-4000-8000-000000000002'
  );

  delete from public.resale_listings
  where org_id in (
    'da7a0000-0000-4000-8000-000000000001',
    'da7a0000-0000-4000-8000-000000000002'
  );

  delete from public.orders
  where org_id in (
    'da7a0000-0000-4000-8000-000000000001',
    'da7a0000-0000-4000-8000-000000000002'
  );

  delete from public.events
  where org_id in (
    'da7a0000-0000-4000-8000-000000000001',
    'da7a0000-0000-4000-8000-000000000002'
  );

  delete from public.venues
  where org_id in (
    'da7a0000-0000-4000-8000-000000000001',
    'da7a0000-0000-4000-8000-000000000002'
  );

  delete from public.org_members
  where org_id in (
    'da7a0000-0000-4000-8000-000000000001',
    'da7a0000-0000-4000-8000-000000000002'
  );

  delete from public.organizations
  where id in (
    'da7a0000-0000-4000-8000-000000000001',
    'da7a0000-0000-4000-8000-000000000002'
  );

  delete from auth.users
  where id in (
    'da7a0001-0000-4000-8000-000000000001',
    'da7a0001-0000-4000-8000-000000000002',
    'da7a0001-0000-4000-8000-000000000003',
    'da7a0001-0000-4000-8000-000000000004',
    'da7a0001-0000-4000-8000-000000000005',
    'da7a0001-0000-4000-8000-000000000006',
    'da7a0001-0000-4000-8000-000000000007',
    'da7a0001-0000-4000-8000-000000000008'
  );

  return jsonb_build_object('teardown', true);
end;
$$;

grant execute on function public.fn_teardown_uat_fixtures() to service_role;
revoke execute on function public.fn_teardown_uat_fixtures() from public, anon, authenticated;
