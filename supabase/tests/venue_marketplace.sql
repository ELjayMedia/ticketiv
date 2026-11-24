-- TICK-482 / TICK-460: venue spaces, enquiries, bookings, conflicts, search.
-- Run against an ISOLATED database only; one transaction, rolled back.
\set ON_ERROR_STOP on
begin;

create temp table _results (n serial, label text, ok boolean, detail text) on commit drop;
grant all on _results to authenticated, anon;
grant usage, select on sequence _results_n_seq to authenticated, anon;

create function pg_temp.as_user(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';
end $$;
create function pg_temp.expect(p_label text, p_sql text, p_should_succeed boolean, p_err text default '.') returns void language plpgsql as $$
declare v_err text;
begin
  begin execute p_sql; exception when others then v_err := sqlerrm || coalesce(' / ' || nullif(pg_temp.detail(), ''), ''); end;
  if p_should_succeed then
    insert into _results (label, ok, detail) values (p_label, v_err is null, coalesce(v_err, 'ok'));
  else
    insert into _results (label, ok, detail) values (p_label, v_err is not null and v_err ~* p_err, coalesce(v_err, 'UNEXPECTEDLY SUCCEEDED'));
  end if;
end $$;
create function pg_temp.detail() returns text language sql as $$ select '' $$;
create function pg_temp.expect_eq(p_label text, p_sql text, p_expected text) returns void language plpgsql as $$
declare v text;
begin
  execute p_sql into v;
  insert into _results (label, ok, detail) values (p_label, v is not distinct from p_expected, format('got %s, expected %s', v, p_expected));
end $$;
grant execute on function pg_temp.as_user(uuid), pg_temp.expect(text, text, boolean, text), pg_temp.expect_eq(text, text, text), pg_temp.detail() to authenticated, anon;

create temp table _ids as select
  gen_random_uuid() as owner_u, gen_random_uuid() as staff_u, gen_random_uuid() as org_a_u, gen_random_uuid() as org_b_u,
  gen_random_uuid() as stranger_u, gen_random_uuid() as admin_u,
  gen_random_uuid() as venue, gen_random_uuid() as unverified_venue, gen_random_uuid() as org_a, gen_random_uuid() as org_b,
  (date_trunc('day', now()) + interval '30 days')::timestamptz as d1,
  null::uuid as main_hall, null::uuid as terrace, null::uuid as enq_a, null::uuid as enq_b, null::uuid as enq_c, null::uuid as booking_a;
grant select, update on _ids to authenticated, anon;

insert into auth.users (id, email, aud, role, instance_id)
select x, 'vm-' || left(x::text, 8) || '@example.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'
  from _ids, unnest(array[owner_u, staff_u, org_a_u, org_b_u, stranger_u, admin_u]) x;
insert into public.admin_users (user_id, role_tier, active) select admin_u, 'super_admin', true from _ids;
insert into public.venues (id, name, slug, city, verification_status, capacity)
select venue, 'VM Hall ' || left(venue::text, 6), 'vm-hall-' || left(venue::text, 8), 'Lobamba', 'verified', 300 from _ids;
insert into public.venues (id, name, slug, city, verification_status)
select unverified_venue, 'VM Shed ' || left(venue::text, 6), 'vm-shed-' || left(venue::text, 8), 'Lobamba', 'unverified' from _ids;
insert into public.venue_members (venue_id, user_id, role) select venue, owner_u, 'venue_owner' from _ids;
insert into public.venue_members (venue_id, user_id, role) select venue, staff_u, 'venue_staff' from _ids;
insert into public.venue_members (venue_id, user_id, role) select unverified_venue, owner_u, 'venue_owner' from _ids;
insert into public.organizations (id, name, slug) select org_a, 'VM Org A', 'vm-org-a-' || left(org_a::text, 8) from _ids;
insert into public.organizations (id, name, slug) select org_b, 'VM Org B', 'vm-org-b-' || left(org_b::text, 8) from _ids;
insert into public.org_members (org_id, user_id, role) select org_a, org_a_u, 'organizer_owner' from _ids;
insert into public.org_members (org_id, user_id, role) select org_b, org_b_u, 'organizer_owner' from _ids;

-- ── spaces (TICK-482) ──────────────────────────────────────────────────────
select pg_temp.as_user(owner_u) from _ids;
update _ids set main_hall = public.fn_save_venue_space(venue, null, 'Main hall', 'Sprung floor', 800, 400,
  array['stage', 'sound_system', 'Bar'], array['step_free_entry', 'accessible_toilet'], array['https://img.example/hall.jpg'],
  1500000, 'szl', 'day', 'Includes cleaning', true);
update _ids set terrace = public.fn_save_venue_space(venue, null, 'Terrace', null, 120, null, '{}', '{}', '{}', null, null, null, null, true);
select pg_temp.expect('space: private draft saved',
  format($q$select public.fn_save_venue_space(%L, null, 'Back room', null, 40, null, '{}', '{}', '{}', null, null, null, null, false)$q$, (select venue from _ids)), true);
select pg_temp.expect('space: unknown amenity refused',
  format($q$select public.fn_save_venue_space(%L, null, 'X room', null, 10, null, array['helipad'], '{}', '{}', null, null, null, null, false)$q$, (select venue from _ids)), false, 'amenity_invalid');
select pg_temp.expect('space: http image refused',
  format($q$select public.fn_save_venue_space(%L, null, 'X room', null, 10, null, '{}', '{}', array['http://img.example/x.jpg'], null, null, null, null, false)$q$, (select venue from _ids)), false, 'image_invalid');
select pg_temp.expect('space: rate without unit refused',
  format($q$select public.fn_save_venue_space(%L, null, 'X room', null, 10, null, '{}', '{}', '{}', 5000, null, null, null, false)$q$, (select venue from _ids)), false, 'rate_unit_required');
select pg_temp.expect('space: unverified venue can draft spaces',
  format($q$select public.fn_save_venue_space(%L, null, 'Shed floor', null, 50, null, '{}', '{}', '{}', null, null, null, null, true)$q$, (select unverified_venue from _ids)), true);
select pg_temp.expect('venue type: set via profile',
  format($q$select public.fn_update_venue_profile(%L, 'A hall', 'Main road', 300, null, null, null, 'hall')$q$, (select venue from _ids)), true);
reset role;
select pg_temp.expect_eq('space: amenities normalised',
  format($q$select array_to_string(amenities, ',') from public.venue_spaces where id = %L$q$, (select main_hall from _ids)), 'bar,sound_system,stage');

select pg_temp.as_user(staff_u) from _ids;
select pg_temp.expect('space: venue staff cannot edit',
  format($q$select public.fn_save_venue_space(%L, null, 'Staff room', null, 10, null, '{}', '{}', '{}', null, null, null, null, true)$q$, (select venue from _ids)), false, 'forbidden');
reset role;
select pg_temp.as_user(stranger_u) from _ids;
select pg_temp.expect('space: stranger cannot edit',
  format($q$select public.fn_save_venue_space(%L, %L, 'Hijack', null, 10, null, '{}', '{}', '{}', null, null, null, null, true)$q$, (select venue from _ids), (select main_hall from _ids)), false, 'forbidden');
reset role;

set local role anon;
select pg_temp.expect_eq('public: sees the 2 public spaces of the verified venue',
  format($q$select count(*)::text from public.venue_spaces where venue_id = %L$q$, (select venue from _ids)), '2');
select pg_temp.expect_eq('public: unverified venue spaces hidden',
  format($q$select count(*)::text from public.venue_spaces where venue_id = %L$q$, (select unverified_venue from _ids)), '0');
select pg_temp.expect('public: enquiries not readable by anon', $q$select count(*) from public.venue_enquiries$q$, false, 'permission denied');
reset role;

-- ── enquiries (TICK-460) ───────────────────────────────────────────────────
select pg_temp.as_user(org_a_u) from _ids;
update _ids set enq_a = public.fn_submit_venue_enquiry(venue, main_hall, org_a, d1 + interval '18 hours', d1 + interval '23 hours', 350, 1200000, 'SZL',
  'We would like the main hall for a gospel concert.');
select pg_temp.expect('enquiry: unverified venue refused',
  format($q$select public.fn_submit_venue_enquiry(%L, null, %L, %L, %L, 10, null, null, 'Hello there, is this free?')$q$,
         (select unverified_venue from _ids), (select org_a from _ids), (select d1 from _ids), (select d1 + interval '2 hours' from _ids)), false, 'venue_not_listed');
select pg_temp.expect('enquiry: past date refused',
  format($q$select public.fn_submit_venue_enquiry(%L, null, %L, now() - interval '1 day', now(), 10, null, null, 'Hello there, is this free?')$q$,
         (select venue from _ids), (select org_a from _ids)), false, 'dates_invalid');
select pg_temp.expect('enquiry: cannot enquire for an organisation you do not manage',
  format($q$select public.fn_submit_venue_enquiry(%L, null, %L, %L, %L, 10, null, null, 'Hello there, is this free?')$q$,
         (select venue from _ids), (select org_b from _ids), (select d1 from _ids), (select d1 + interval '2 hours' from _ids)), false, 'forbidden');
reset role;

select pg_temp.as_user(org_b_u) from _ids;
-- Org B wants the same hall at an overlapping time, and the whole venue later that night.
update _ids set enq_b = public.fn_submit_venue_enquiry(venue, main_hall, org_b, d1 + interval '20 hours', d1 + interval '23 hours', 200, null, null,
  'Main hall for our comedy night please.');
update _ids set enq_c = public.fn_submit_venue_enquiry(venue, null, org_b, d1 + interval '22 hours', d1 + interval '24 hours', 500, null, null,
  'The whole venue for an after-party.');
select pg_temp.expect_eq('privacy: org B sees only its own 2 enquiries', $q$select count(*)::text from public.venue_enquiries$q$, '2');
select pg_temp.expect_eq('privacy: org B cannot read org A''s thread',
  format($q$select count(*)::text from public.venue_enquiry_messages where enquiry_id = %L$q$, (select enq_a from _ids)), '0');
select pg_temp.expect('privacy: org B cannot post in org A''s thread',
  format($q$select public.fn_post_venue_enquiry_message(%L, 'Sneaky')$q$, (select enq_a from _ids)), false, 'forbidden');
select pg_temp.expect('privacy: org B cannot decide',
  format($q$select public.fn_decide_venue_enquiry(%L, true)$q$, (select enq_a from _ids)), false, 'forbidden');
reset role;

select pg_temp.as_user(stranger_u) from _ids;
select pg_temp.expect_eq('privacy: stranger sees no enquiries', $q$select count(*)::text from public.venue_enquiries$q$, '0');
select pg_temp.expect_eq('privacy: stranger sees no bookings', $q$select count(*)::text from public.venue_bookings$q$, '0');
reset role;
select pg_temp.as_user(admin_u) from _ids;
select pg_temp.expect_eq('privacy: platform admin sees all 3', $q$select count(*)::text from public.venue_enquiries$q$, '3');
reset role;
select pg_temp.as_user(staff_u) from _ids;
select pg_temp.expect_eq('privacy: venue staff reads the venue''s enquiries', $q$select count(*)::text from public.venue_enquiries$q$, '3');
select pg_temp.expect_eq('privacy: venue side sees the organiser name snapshot',
  format($q$select org_name from public.venue_enquiries where id = %L$q$, (select enq_a from _ids)), 'VM Org A');
select pg_temp.expect('privacy: venue staff cannot accept',
  format($q$select public.fn_decide_venue_enquiry(%L, true)$q$, (select enq_a from _ids)), false, 'forbidden');
reset role;

-- ── accept, conflicts, exclusion ───────────────────────────────────────────
select pg_temp.as_user(owner_u) from _ids;
select pg_temp.expect('thread: venue replies',
  format($q$select public.fn_post_venue_enquiry_message(%L, 'Yes, that date works. Load-in from 14:00.')$q$, (select enq_a from _ids)), true);
update _ids set booking_a = public.fn_decide_venue_enquiry(enq_a, true, 'Confirmed, see you then');
select pg_temp.expect('conflict: overlapping enquiry for the same space refused',
  format($q$select public.fn_decide_venue_enquiry(%L, true)$q$, (select enq_b from _ids)), false, 'slot_unavailable');
select pg_temp.expect('conflict: whole-venue enquiry overlapping a space booking refused',
  format($q$select public.fn_decide_venue_enquiry(%L, true)$q$, (select enq_c from _ids)), false, 'slot_unavailable');
select pg_temp.expect('conflict: block over a booked slot refused',
  format($q$select public.fn_add_venue_block(%L, null, %L, %L, 'Maintenance')$q$, (select venue from _ids), (select d1 + interval '19 hours' from _ids), (select d1 + interval '20 hours' from _ids)), false, 'slot_booked');
reset role;
select pg_temp.expect_eq('conflict: failed accept leaves the enquiry open',
  format($q$select status from public.venue_enquiries where id = %L$q$, (select enq_b from _ids)), 'open');
select pg_temp.expect('exclusion: a direct overlapping insert is rejected by the constraint',
  format($q$insert into public.venue_bookings (venue_id, space_id, org_id, starts_at, ends_at) values (%L, %L, %L, %L, %L)$q$,
         (select venue from _ids), (select main_hall from _ids), (select org_b from _ids), (select d1 + interval '19 hours' from _ids), (select d1 + interval '21 hours' from _ids)),
  false, 'venue_bookings_no_overlap');
select pg_temp.expect('exclusion: a different space at the same time is fine',
  format($q$insert into public.venue_bookings (venue_id, space_id, org_id, starts_at, ends_at) values (%L, %L, %L, %L, %L)$q$,
         (select venue from _ids), (select terrace from _ids), (select org_b from _ids), (select d1 + interval '19 hours' from _ids), (select d1 + interval '21 hours' from _ids)),
  true);
select pg_temp.expect_eq('notify: venue owner told about enquiries',
  format($q$select count(*)::text from public.notifications where user_id = %L and type = 'venue_enquiry'$q$, (select owner_u from _ids)), '3');
select pg_temp.expect_eq('notify: org A told it was accepted',
  format($q$select count(*)::text from public.notifications where user_id = %L and type = 'venue_enquiry_decision' and payload->>'accepted' = 'true'$q$, (select org_a_u from _ids)), '1');
select pg_temp.expect_eq('notify: org A told about the reply',
  format($q$select count(*)::text from public.notifications where user_id = %L and type = 'venue_enquiry_message'$q$, (select org_a_u from _ids)), '1');

-- ── blocks and events also hold dates ──────────────────────────────────────
select pg_temp.as_user(owner_u) from _ids;
select pg_temp.expect('block: owner blocks day 2',
  format($q$select public.fn_add_venue_block(%L, null, %L, %L, 'Private function')$q$, (select venue from _ids), (select d1 + interval '1 day' from _ids), (select d1 + interval '2 days' from _ids)), true);
reset role;
insert into public.events (org_id, venue_id, title, slug, status, visibility, starts_at)
select org_b, venue, 'VM Gig', 'vm-gig-' || left(venue::text, 8), 'published', 'public', d1 + interval '3 days 19 hours' from _ids;
select pg_temp.as_user(org_a_u) from _ids;
select pg_temp.expect('block: enquiry on the blocked day can be sent',
  format($q$select public.fn_submit_venue_enquiry(%L, %L, %L, %L, %L, 50, null, null, 'Is the terrace free on day two?')$q$,
         (select venue from _ids), (select terrace from _ids), (select org_a from _ids), (select d1 + interval '1 day 10 hours' from _ids), (select d1 + interval '1 day 12 hours' from _ids)), true);
select pg_temp.expect('event: enquiry over the published event can be sent',
  format($q$select public.fn_submit_venue_enquiry(%L, %L, %L, %L, %L, 50, null, null, 'Terrace during the gig?')$q$,
         (select venue from _ids), (select terrace from _ids), (select org_a from _ids), (select d1 + interval '3 days 20 hours' from _ids), (select d1 + interval '3 days 22 hours' from _ids)), true);
reset role;
select pg_temp.as_user(owner_u) from _ids;
select pg_temp.expect('block: accepting on a blocked day refused',
  format($q$select public.fn_decide_venue_enquiry((select id from public.venue_enquiries where org_id = %L and starts_at = %L), true)$q$,
         (select org_a from _ids), (select d1 + interval '1 day 10 hours' from _ids)), false, 'slot_unavailable');
select pg_temp.expect('event: accepting over an event at the venue refused',
  format($q$select public.fn_decide_venue_enquiry((select id from public.venue_enquiries where org_id = %L and starts_at = %L), true)$q$,
         (select org_a from _ids), (select d1 + interval '3 days 20 hours' from _ids)), false, 'slot_unavailable');
reset role;

-- ── booking → event draft; cancel frees the date ───────────────────────────
select pg_temp.as_user(org_b_u) from _ids;
select pg_temp.expect('draft: other organisation cannot create from the booking',
  format($q$select public.fn_create_event_from_booking(%L, 'Hijack')$q$, (select booking_a from _ids)), false, 'forbidden');
reset role;
select pg_temp.as_user(org_a_u) from _ids;
select pg_temp.expect('draft: org A creates the event from the booking',
  format($q$select public.fn_create_event_from_booking(%L, 'Gospel Night')$q$, (select booking_a from _ids)), true);
select pg_temp.expect_eq('draft: second call returns the same event',
  format($q$select (public.fn_create_event_from_booking(%L, 'Again') = (select event_id from public.venue_bookings where id = %L))::text$q$, (select booking_a from _ids), (select booking_a from _ids)), 'true');
reset role;
select pg_temp.expect_eq('draft: event has the venue and dates',
  format($q$select (e.venue_id = %L and e.starts_at = b.starts_at and e.status = 'draft')::text from public.venue_bookings b join public.events e on e.id = b.event_id where b.id = %L$q$,
         (select venue from _ids), (select booking_a from _ids)), 'true');
select pg_temp.as_user(org_a_u) from _ids;
select pg_temp.expect('cancel: reason required',
  format($q$select public.fn_cancel_venue_booking(%L, '')$q$, (select booking_a from _ids)), false, 'reason_required');
select pg_temp.expect('cancel: organiser cancels',
  format($q$select public.fn_cancel_venue_booking(%L, 'Moved to a bigger venue')$q$, (select booking_a from _ids)), true);
reset role;
select pg_temp.as_user(owner_u) from _ids;
select pg_temp.expect('cancel: the freed slot can now be accepted for org B',
  format($q$select public.fn_decide_venue_enquiry(%L, true)$q$, (select enq_b from _ids)), true);
select pg_temp.expect('decide: cannot decide twice',
  format($q$select public.fn_decide_venue_enquiry(%L, false)$q$, (select enq_b from _ids)), false, 'enquiry_not_open');
reset role;

-- ── search and public availability ─────────────────────────────────────────
set local role anon;
select pg_temp.expect_eq('search: city + type finds the verified venue only',
  format($q$select count(*)::text from public.fn_search_venues('lobamba', null, null, 'hall', null) where id in (%L, %L)$q$, (select venue from _ids), (select unverified_venue from _ids)), '1');
select pg_temp.expect_eq('search: capacity uses the largest public space',
  format($q$select capacity::text from public.fn_search_venues('Lobamba', 700, null, null, null) where id = %L$q$, (select venue from _ids)), '800');
select pg_temp.expect_eq('search: too small a max capacity excludes it',
  format($q$select count(*)::text from public.fn_search_venues('Lobamba', null, 100, null, null) where id = %L$q$, (select venue from _ids)), '0');
select pg_temp.expect_eq('search: a fully blocked day is unavailable',
  format($q$select available::text from public.fn_search_venues('Lobamba', null, null, null, (%L::timestamptz + interval '1 day')::date) where id = %L$q$, (select d1 from _ids), (select venue from _ids)), 'false');
select pg_temp.expect_eq('search: a free day is available',
  format($q$select available::text from public.fn_search_venues('Lobamba', null, null, null, (%L::timestamptz + interval '10 days')::date) where id = %L$q$, (select d1 from _ids), (select venue from _ids)), 'true');
select pg_temp.expect_eq('busy: public ranges for the next weeks (booking, terrace, block, event)',
  format($q$select count(*)::text from public.fn_venue_public_busy(%L, current_date, current_date + 60)$q$, (select venue from _ids)), '4');
select pg_temp.expect_eq('busy: unverified venue exposes nothing',
  format($q$select count(*)::text from public.fn_venue_public_busy(%L, current_date, current_date + 60)$q$, (select unverified_venue from _ids)), '0');
reset role;

do $$
declare v_fail int; v_total int; v_out text;
begin
  select count(*) filter (where not ok), count(*),
         string_agg(format('  %s  %-60s %s', case when ok then 'PASS' else 'FAIL' end, label, detail), E'\n' order by n)
  into v_fail, v_total, v_out from _results;
  raise notice E'VENUE MARKETPLACE HARNESS\n%\n  passed=%  failed=%', v_out, v_total - v_fail, v_fail;
  if v_fail > 0 then raise exception 'venue marketplace harness: % failure(s)', v_fail; end if;
end $$;

rollback;
