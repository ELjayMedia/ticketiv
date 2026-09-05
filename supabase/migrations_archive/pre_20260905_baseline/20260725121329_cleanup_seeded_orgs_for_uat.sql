do $$
declare
  seed_org_ids uuid[] := array[
    '15fd89a7-b35c-42c7-b238-194806d5d23b',  -- Demo Org
    '3fde51cc-ebee-4c56-ba4d-60520f467cda',  -- Demo Org
    '9481a17e-8103-4d6c-8fd8-da02631263d6',  -- Test Org
    'b2f52078-adc1-46fa-a49e-be46849eb0da',  -- Demo Org
    '00000000-0000-4000-8000-000000000101'   -- Ticketiv Test Fixtures
  ]::uuid[];
  blocker_count bigint;
  blocker_table text;
begin
  for blocker_table, blocker_count in
    select 'orders',          count(*) from public.orders          where org_id = any(seed_org_ids)
    union all
    select 'payments',        count(*) from public.payments p
      where exists (select 1 from public.orders o where o.id = p.order_id and o.org_id = any(seed_org_ids))
    union all
    select 'payouts',         count(*) from public.payouts         where org_id = any(seed_org_ids)
    union all
    select 'payout_accounts', count(*) from public.payout_accounts where org_id = any(seed_org_ids)
    union all
    select 'pos_shifts',      count(*) from public.pos_shifts      where org_id = any(seed_org_ids)
    union all
    select 'resale_listings', count(*) from public.resale_listings where org_id = any(seed_org_ids)
  loop
    if blocker_count > 0 then
      raise exception
        'Aborting seed cleanup: % row(s) in public.% belong to a seed org. Reconcile the money path before deleting.',
        blocker_count, blocker_table;
    end if;
  end loop;

  update public.audit_log
     set org_id = null
   where org_id = any(seed_org_ids);

  delete from public.scans
   where event_id in (select id from public.events where org_id = any(seed_org_ids));

  delete from public.ticket_types
   where event_id in (select id from public.events where org_id = any(seed_org_ids));

  delete from public.event_live_stats
   where event_id in (select id from public.events where org_id = any(seed_org_ids));

  delete from public.events
   where org_id = any(seed_org_ids);

  delete from public.venues
   where org_id = any(seed_org_ids);

  delete from public.artists
   where org_id = any(seed_org_ids);

  delete from public.organizations
   where id = any(seed_org_ids);
end
$$;;
