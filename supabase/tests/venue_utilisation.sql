-- TICK-483: venue utilisation aggregates and who can read them.
-- Run against an ISOLATED database only; rolls back.
\set ON_ERROR_STOP on
begin;
do $$
declare
  owner_u uuid := gen_random_uuid();
  staff_u uuid := gen_random_uuid();
  org_u uuid := gen_random_uuid();
  stranger uuid := gen_random_uuid();
  v_venue uuid; v_org uuid; v_hall uuid; v_terrace uuid;
  d0 date := current_date + 40;      -- range d0 .. d0+29 (30 days)
  r jsonb; v_err text;
  function_local text := 'Africa/Mbabane';
begin
  insert into auth.users (id, email, aud, role, instance_id)
  select x, 'vu-' || left(x::text, 8) || '@example.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'
    from unnest(array[owner_u, staff_u, org_u, stranger]) x;
  insert into public.venues (name, slug, city, verification_status) values ('VU Hall', 'vu-hall-' || left(owner_u::text, 8), 'Siteki', 'verified') returning id into v_venue;
  insert into public.venue_members (venue_id, user_id, role) values (v_venue, owner_u, 'venue_owner'), (v_venue, staff_u, 'venue_staff');
  insert into public.organizations (name, slug) values ('VU Org', 'vu-org-' || left(owner_u::text, 8)) returning id into v_org;
  insert into public.org_members (org_id, user_id, role) values (v_org, org_u, 'organizer_owner');
  insert into public.venue_spaces (venue_id, name, is_public, sort_order) values (v_venue, 'Hall', true, 0) returning id into v_hall;
  insert into public.venue_spaces (venue_id, name, is_public, sort_order) values (v_venue, 'Terrace', true, 1) returning id into v_terrace;

  -- Day 1: hall 18:00-23:00 (5h) and terrace 19:00-21:00 (2h): one occupied day.
  insert into public.venue_bookings (venue_id, space_id, org_id, starts_at, ends_at) values
    (v_venue, v_hall, v_org, (d0 + 1 + time '18:00') at time zone function_local, (d0 + 1 + time '23:00') at time zone function_local),
    (v_venue, v_terrace, v_org, (d0 + 1 + time '19:00') at time zone function_local, (d0 + 1 + time '21:00') at time zone function_local);
  -- Days 5-6: whole venue 10:00 to 02:00 the next day (16h): two occupied days.
  insert into public.venue_bookings (venue_id, space_id, org_id, starts_at, ends_at) values
    (v_venue, null, v_org, (d0 + 5 + time '10:00') at time zone function_local, (d0 + 6 + time '02:00') at time zone function_local);
  -- Day 8: cancelled, ignored.
  insert into public.venue_bookings (venue_id, space_id, org_id, starts_at, ends_at, status) values
    (v_venue, v_hall, v_org, (d0 + 8 + time '18:00') at time zone function_local, (d0 + 8 + time '22:00') at time zone function_local, 'cancelled');
  -- Day 10: a published event with no end (six hours). Day 12: a draft, ignored.
  insert into public.events (org_id, venue_id, title, slug, status, visibility, starts_at) values
    (v_org, v_venue, 'VU Gig', 'vu-gig-' || left(owner_u::text, 8), 'published', 'public', (d0 + 10 + time '18:00') at time zone function_local),
    (v_org, v_venue, 'VU Draft', 'vu-draft-' || left(owner_u::text, 8), 'draft', 'private', (d0 + 12 + time '18:00') at time zone function_local);
  -- Day 15 blocked (counts as blocked); day 1 blocked too but already occupied (not double counted).
  insert into public.venue_blocks (venue_id, starts_at, ends_at) values
    (v_venue, (d0 + 15)::timestamp at time zone function_local, (d0 + 16)::timestamp at time zone function_local),
    (v_venue, (d0 + 1 + time '08:00') at time zone function_local, (d0 + 1 + time '09:00') at time zone function_local);
  -- Enquiries in the range: two received, one accepted.
  insert into public.venue_enquiries (venue_id, org_id, starts_at, ends_at, status, created_at) values
    (v_venue, v_org, now() + interval '90 days', now() + interval '90 days 2 hours', 'accepted', (d0 + 2)::timestamp at time zone function_local),
    (v_venue, v_org, now() + interval '91 days', now() + interval '91 days 2 hours', 'declined', (d0 + 3)::timestamp at time zone function_local);

  -- Members read it.
  perform set_config('request.jwt.claims', json_build_object('sub', staff_u::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';
  r := public.fn_venue_utilisation(v_venue, d0, d0 + 29);
  execute 'reset role';

  if (r->>'days')::int <> 30 then raise exception 'days should be 30 (got %)', r->>'days'; end if;
  if (r->>'occupied_days')::int <> 4 then raise exception 'occupied days should be 4 (got %)', r->>'occupied_days'; end if;
  if (r->>'blocked_days')::int <> 1 then raise exception 'blocked days should be 1 (got %)', r->>'blocked_days'; end if;
  if (r->>'occupancy_pct')::numeric <> 13.3 then raise exception 'occupancy should be 13.3%% (got %)', r->>'occupancy_pct'; end if;
  if (r->>'bookings')::int <> 3 then raise exception 'bookings should be 3 (got %)', r->>'bookings'; end if;
  if (r->>'booked_hours')::numeric <> 23 then raise exception 'booked hours should be 23 (got %)', r->>'booked_hours'; end if;
  if (r->>'events')::int <> 1 then raise exception 'events should be 1 (got %)', r->>'events'; end if;
  if (r->>'enquiries_received')::int <> 2 or (r->>'enquiries_accepted')::int <> 1 then raise exception 'enquiries 2/1 expected (got %/%)', r->>'enquiries_received', r->>'enquiries_accepted'; end if;
  if (r->>'whole_venue_bookings')::int <> 1 then raise exception 'one whole-venue booking expected'; end if;
  if (r->'spaces'->0->>'name') <> 'Hall' or (r->'spaces'->0->>'booked_hours')::numeric <> 5 or (r->'spaces'->1->>'booked_hours')::numeric <> 2 then
    raise exception 'per-space hours wrong: %', r->'spaces';
  end if;
  if (select sum((m->>'days')::int) from jsonb_array_elements(r->'months') m) <> 30 then raise exception 'months should cover 30 days'; end if;
  if (select sum((m->>'occupied_days')::int) from jsonb_array_elements(r->'months') m) <> 4 then raise exception 'months should sum to 4 occupied days'; end if;
  -- No attendee or ticket data in the payload.
  if r::text ~* '(email|phone|buyer|ticket|attendee|order)' then raise exception 'utilisation payload leaks attendee data: %', r; end if;

  -- A booking clipped by the range only counts the part inside it.
  perform set_config('request.jwt.claims', json_build_object('sub', owner_u::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';
  r := public.fn_venue_utilisation(v_venue, d0 + 6, d0 + 6);
  execute 'reset role';
  if (r->>'booked_hours')::numeric <> 2 or (r->>'occupied_days')::int <> 1 then raise exception 'clipped day 6 should have 2h, 1 day (got % / %)', r->>'booked_hours', r->>'occupied_days'; end if;

  -- Non-members refused, including the booking organisation; long ranges refused; anon cannot call.
  perform set_config('request.jwt.claims', json_build_object('sub', org_u::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';
  begin perform public.fn_venue_utilisation(v_venue, d0, d0 + 29); v_err := null; exception when others then v_err := sqlerrm; end;
  execute 'reset role';
  if coalesce(v_err, '') !~ 'forbidden' then raise exception 'organiser should not read venue utilisation (got %)', coalesce(v_err, 'success'); end if;
  perform set_config('request.jwt.claims', json_build_object('sub', stranger::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';
  begin perform public.fn_venue_utilisation(v_venue, d0, d0 + 29); v_err := null; exception when others then v_err := sqlerrm; end;
  execute 'reset role';
  if coalesce(v_err, '') !~ 'forbidden' then raise exception 'stranger should be refused (got %)', coalesce(v_err, 'success'); end if;
  perform set_config('request.jwt.claims', json_build_object('sub', owner_u::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';
  begin perform public.fn_venue_utilisation(v_venue, d0, d0 + 500); v_err := null; exception when others then v_err := sqlerrm; end;
  execute 'reset role';
  if coalesce(v_err, '') !~ 'dates_invalid' then raise exception 'over-long range should be refused (got %)', coalesce(v_err, 'success'); end if;
  execute 'set local role anon';
  begin perform public.fn_venue_utilisation(v_venue, d0, d0 + 29); v_err := null; exception when others then v_err := sqlerrm; end;
  execute 'reset role';
  if coalesce(v_err, '') !~ 'permission denied' then raise exception 'anon should not execute (got %)', coalesce(v_err, 'success'); end if;

  -- Public calendar: anon sees the published event at the venue, never the draft.
  execute 'set local role anon';
  select count(*)::text into v_err from public.events where venue_id = v_venue;
  execute 'reset role';
  if v_err <> '1' then raise exception 'anon should see only the published event (got %)', v_err; end if;

  raise notice 'VENUE UTILISATION: occupancy, hours, per-space, months, clipping, no PII, members only, public sees published only';
end $$;
rollback;
