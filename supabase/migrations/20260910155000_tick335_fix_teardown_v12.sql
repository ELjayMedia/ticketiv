-- TICK-335 v12: fix teardown to delete ALL UAT events (including public discovery event)

create or replace function public.fn_teardown_uat_fixtures()
  returns jsonb
  language plpgsql
  security definer
  set search_path to 'public'
as $$
begin
  -- Delete in correct order: child tables before parents
  delete from public.ledger_entries where id in (
    'da7a0008-0000-4000-8000-000000000001',
    'da7a0008-0000-4000-8000-000000000002',
    'da7a0008-0000-4000-8000-000000000003'
  );
  delete from public.payments where id in (
    'da7a0006-0000-4000-8000-000000000001',
    'da7a0006-0000-4000-8000-000000000002',
    'da7a0006-0000-4000-8000-000000000003'
  );
  delete from public.order_items where order_id in (
    'da7a0005-0000-4000-8000-000000000001',
    'da7a0005-0000-4000-8000-000000000002',
    'da7a0005-0000-4000-8000-000000000003',
    'da7a0005-0000-4000-8000-000000000004',
    'da7a0005-0000-4000-8000-000000000005',
    'da7a0005-0000-4000-8000-000000000006',
    'da7a0007-0000-4000-8000-000000000001'
  );
  delete from public.orders where id in (
    'da7a0005-0000-4000-8000-000000000001',
    'da7a0005-0000-4000-8000-000000000002',
    'da7a0005-0000-4000-8000-000000000003',
    'da7a0005-0000-4000-8000-000000000004',
    'da7a0005-0000-4000-8000-000000000005',
    'da7a0005-0000-4000-8000-000000000006'
  );
  delete from public.ticket_types where id in (
    'da7a0004-0000-4000-8000-000000000001',
    'da7a0004-0000-4000-8000-000000000002',
    'da7a0004-0000-4000-8000-000000000003',
    'da7a0004-0000-4000-8000-000000000004'
  );
  -- Delete ALL events for the UAT venue (including public discovery event)
  delete from public.events where venue_id = 'da7a0002-0000-4000-8000-000000000001';
  delete from public.venues where id = 'da7a0002-0000-4000-8000-000000000001';
  delete from public.org_members where org_id in (
    'da7a0000-0000-4000-8000-000000000001',
    'da7a0000-0000-4000-8000-000000000002'
  );
  delete from public.organizations where id in (
    'da7a0000-0000-4000-8000-000000000001',
    'da7a0000-0000-4000-8000-000000000002'
  );
  delete from auth.users where id in (
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
