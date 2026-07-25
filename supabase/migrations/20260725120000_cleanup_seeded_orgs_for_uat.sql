-- Remove seeded/demo organizations and their events so UAT runs against a
-- realistic single-tenant dataset (EljayTunes only).
--
-- Before this migration the project carried six organizations, five of which
-- were throwaway seed data accumulated during development, and their ten events
-- polluted public discovery (four of them 'published', so they were live on the
-- events index, search, venue and artist pages):
--
--   15fd89a7 Demo Org               -> 'Summer Jam', 'Summer Jam 2025' (published)
--   3fde51cc Demo Org               -> 'Concert Event' (draft)
--   9481a17e Test Org               -> 'Test Event' (draft)
--   b2f52078 Demo Org               -> 'Demo Concert' (archived)
--   00000000-...-0101 Ticketiv Test Fixtures
--                                   -> 'Gathering of Worshipers',
--                                      'MTN Bushfire Festival Test Weekend',
--                                      'Standard Bank Luju Food and Lifestyle
--                                       Festival Test',
--                                      'Culture Festival Test Edition'
--                                      (all published, 19 ticket types,
--                                       8 event_dates, 67 stale seat_holds)
--
-- EljayTunes (196d016f-1e10-4cea-a6cc-f46c9ee6734a) is deliberately untouched,
-- along with its event, org_members row, payout account and membership invite.
--
-- The target orgs are listed by explicit id rather than "everything except
-- EljayTunes" so this can never remove a real tenant created later, and so it
-- is a no-op on any environment that never had the seed rows.
--
-- Safe to remove: these orgs have no orders, payments, payouts, pos_shifts or
-- resale_listings (asserted below — the migration aborts rather than destroying
-- anything with money attached). The four fixture-org events are referenced only
-- by tests/uat-checkout-*.test.ts, which mock Supabase entirely and assert
-- against hardcoded literals, so they do not read these rows.
--
-- Most dependents disappear via ON DELETE CASCADE from events (event_dates,
-- ticket_types -> ticket_type_channels/seat_holds, event_artists,
-- event_live_stats, event_staff, waitlists, guestlist_entries, price_rules,
-- seat_maps) and from organizations (org_members, pricing_plans, devices,
-- event_series, webhook_endpoints, tapband_* configs). Three FKs need explicit
-- handling and are dealt with in order below: events.org_id is RESTRICT,
-- events.venue_id is RESTRICT, and audit_log.org_id is NO ACTION.
--
-- ticket_types and scans are deleted explicitly, before their events, rather
-- than being left to cascade. Both carry AFTER DELETE triggers
-- (trg_recalc_event_live_stats_ticket_types, trg_recalc_event_live_stats_scans)
-- that call fn_recalculate_event_live_stats(old.event_id), and that function
-- ends in `if not found then raise exception 'event % not found'`. During a
-- cascade from events the parent row is already gone when the trigger fires, so
-- the recalc finds nothing and aborts the whole statement -- deleting these
-- children first means the triggers run while the event still exists.
--
-- NOTE: that makes event deletion broken for any event with ticket types,
-- through the app's organizer delete path as much as here. This migration works
-- around it; the trigger/function itself still needs a real fix (the recalc
-- should no-op when the event is being deleted) and is left as a follow-up
-- rather than changing SECURITY DEFINER error semantics in a data cleanup.

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
  -- Refuse to run if any real financial activity is attached to these orgs.
  -- Each of these FKs is RESTRICT anyway; failing loudly here explains why
  -- instead of surfacing a bare constraint violation.
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

  -- Preserve the audit trail rather than deleting history: org_id is nullable
  -- and NO ACTION, so detach the two demo-org entries instead of dropping them.
  update public.audit_log
     set org_id = null
   where org_id = any(seed_org_ids);

  -- Trigger-safe ordering: these two fire fn_recalculate_event_live_stats on
  -- delete, which raises if its event row has already gone, so they must be
  -- removed while their events still exist (see header note).
  delete from public.scans
   where event_id in (select id from public.events where org_id = any(seed_org_ids));

  delete from public.ticket_types
   where event_id in (select id from public.events where org_id = any(seed_org_ids));

  -- Now that the recalc triggers have stopped firing, drop the stats rows they
  -- just rewrote.
  delete from public.event_live_stats
   where event_id in (select id from public.events where org_id = any(seed_org_ids));

  -- events.org_id is RESTRICT, so events go before their orgs. This is also
  -- what clears the remaining dependent rows via cascade.
  delete from public.events
   where org_id = any(seed_org_ids);

  -- events.venue_id is RESTRICT, so venues only become deletable once the
  -- events above are gone.
  delete from public.venues
   where org_id = any(seed_org_ids);

  delete from public.artists
   where org_id = any(seed_org_ids);

  delete from public.organizations
   where id = any(seed_org_ids);
end
$$;
