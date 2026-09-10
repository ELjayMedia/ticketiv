-- TICK-335: add a public seeded event for discovery E2E tests.
--
-- Creates a dedicated public event (slug: uat-public-discovery-event) that
-- discovery E2E tests need. Kept separate from fn_seed_uat_fixtures to avoid
-- disturbing the existing UAT fixture set.

create or replace function public.fn_seed_public_discovery_event()
  returns jsonb
  language plpgsql
  security definer
  set search_path to 'public'
as $$
declare
  ORG_A   uuid := 'da7a0000-0000-4000-8000-000000000001';
  VENUE   uuid := 'da7a0002-0000-4000-8000-000000000001';
  EV_PUB  uuid := 'da7a0003-0000-4000-8000-000000000004';
  TT_PUB  uuid := 'da7a0004-0000-4000-8000-000000000004';
begin
  -- Insert organization
  insert into public.organizations (id, name, slug)
  values (ORG_A, 'UAT Alpha Events', 'uat-alpha')
  on conflict (id) do update set name = excluded.name;

  -- Insert venue
  insert into public.venues (id, org_id, name, city, slug)
  values (VENUE, ORG_A, 'UAT Venue', 'Mbabane', 'uat-venue')
  on conflict (id) do update set name = excluded.name;

  -- Insert public event
  insert into public.events (id, org_id, venue_id, title, slug, category, visibility, status, starts_at, ends_at, country_code)
  values (EV_PUB, ORG_A, VENUE, 'UAT Public Discovery Event', 'uat-public-discovery-event', 'music', 'public', 'published', now() + interval '1 day', now() + interval '2 days', 'SZ')
  on conflict (id) do update set visibility = 'public', status = 'published';

  -- Insert ticket type
  insert into public.ticket_types (id, event_id, name, price_cents, currency, quota, sales_status)
  values (TT_PUB, EV_PUB, 'General Admission', 10000, 'ZAR', 100, 'on_sale')
  on conflict (id) do update set sales_status = 'on_sale';

  return jsonb_build_object('seeded', true, 'public_event_slug', 'uat-public-discovery-event');
end;
$$;

create or replace function public.fn_teardown_public_discovery_event()
  returns jsonb
  language plpgsql
  security definer
  set search_path to 'public'
as $$
begin
  delete from public.ticket_types where id = 'da7a0004-0000-4000-8000-000000000004';
  delete from public.events where id = 'da7a0003-0000-4000-8000-000000000004';
  delete from public.venues where id = 'da7a0002-0000-4000-8000-000000000001';
  delete from public.organizations where id = 'da7a0000-0000-4000-8000-000000000001';
  return jsonb_build_object('teardown', true);
end;
$$;

grant execute on function public.fn_seed_public_discovery_event() to service_role;
grant execute on function public.fn_teardown_public_discovery_event() to service_role;
revoke execute on function public.fn_seed_public_discovery_event() from public, anon, authenticated;
revoke execute on function public.fn_teardown_public_discovery_event() from public, anon, authenticated;
