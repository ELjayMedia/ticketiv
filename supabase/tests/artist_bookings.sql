-- TICK-461 / TICK-485 / TICK-486: artist booking requests, line-up linking,
-- privacy, rate limits, insights and announcements.
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
  begin execute p_sql; exception when others then v_err := sqlerrm; end;
  if p_should_succeed then
    insert into _results (label, ok, detail) values (p_label, v_err is null, coalesce(v_err, 'ok'));
  else
    insert into _results (label, ok, detail) values (p_label, v_err is not null and v_err ~* p_err, coalesce(v_err, 'UNEXPECTEDLY SUCCEEDED'));
  end if;
end $$;
create function pg_temp.expect_eq(p_label text, p_sql text, p_expected text) returns void language plpgsql as $$
declare v text;
begin
  execute p_sql into v;
  insert into _results (label, ok, detail) values (p_label, v is not distinct from p_expected, format('got %s, expected %s', v, p_expected));
end $$;
grant execute on function pg_temp.as_user(uuid), pg_temp.expect(text, text, boolean, text), pg_temp.expect_eq(text, text, text) to authenticated, anon;

create temp table _ids as select
  gen_random_uuid() as owner_u, gen_random_uuid() as manager_u, gen_random_uuid() as org_a_u, gen_random_uuid() as org_b_u,
  gen_random_uuid() as stranger_u, gen_random_uuid() as admin_u, gen_random_uuid() as fan1, gen_random_uuid() as fan2,
  gen_random_uuid() as artist, gen_random_uuid() as unclaimed, gen_random_uuid() as org_a, gen_random_uuid() as org_b,
  gen_random_uuid() as ev_a, gen_random_uuid() as ev_b, gen_random_uuid() as ev_past,
  null::uuid as req1, null::uuid as req2, null::uuid as req3;
grant select, update on _ids to authenticated, anon;

insert into auth.users (id, email, aud, role, instance_id)
select x, 'ab-' || left(x::text, 8) || '@example.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'
  from _ids, unnest(array[owner_u, manager_u, org_a_u, org_b_u, stranger_u, admin_u, fan1, fan2]) x;
insert into public.admin_users (user_id, role_tier, active) select admin_u, 'super_admin', true from _ids;
insert into public.artists (id, name, slug, primary_user_id) select artist, 'AB Band ' || left(artist::text, 6), 'ab-band-' || left(artist::text, 8), owner_u from _ids;
insert into public.artists (id, name, slug) select unclaimed, 'AB Nobody ' || left(artist::text, 6), 'ab-nobody-' || left(artist::text, 8) from _ids;
insert into public.artist_members (artist_id, user_id, role) select artist, manager_u, 'artist_manager' from _ids;
insert into public.organizations (id, name, slug) select org_a, 'AB Org A', 'ab-org-a-' || left(org_a::text, 8) from _ids;
insert into public.organizations (id, name, slug) select org_b, 'AB Org B', 'ab-org-b-' || left(org_b::text, 8) from _ids;
insert into public.org_members (org_id, user_id, role) select org_a, org_a_u, 'organizer_owner' from _ids;
insert into public.org_members (org_id, user_id, role) select org_b, org_b_u, 'organizer_owner' from _ids;
insert into public.events (id, org_id, title, slug, status, visibility, starts_at)
select ev_a, org_a, 'AB Fest', 'ab-fest-' || left(ev_a::text, 8), 'draft', 'public', now() + interval '20 days' from _ids;
insert into public.events (id, org_id, title, slug, status, visibility, starts_at)
select ev_b, org_b, 'AB Other', 'ab-other-' || left(ev_b::text, 8), 'draft', 'public', now() + interval '25 days' from _ids;
insert into public.venues (name, slug, city) select 'AB Club', 'ab-club-' || left(ev_past::text, 8), 'Manzini' from _ids;
insert into public.events (id, org_id, venue_id, title, slug, status, visibility, starts_at)
select ev_past, org_b, (select id from public.venues where slug = 'ab-club-' || left(ev_past::text, 8)), 'AB Past Gig', 'ab-past-' || left(ev_past::text, 8),
       'published', 'public', now() - interval '10 days' from _ids;
insert into public.event_artists (event_id, artist_id) select ev_past, artist from _ids;
insert into public.event_live_stats (event_id, tickets_sold, checked_in_count) select ev_past, 120, 97 from _ids
  on conflict (event_id) do update set tickets_sold = 120, checked_in_count = 97;
insert into public.artist_follows (user_id, artist_id) select fan1, artist from _ids;
insert into public.artist_follows (user_id, artist_id) select fan2, artist from _ids;
insert into public.user_notification_preferences (user_id, in_app_opt_in) select fan2, false from _ids
  on conflict (user_id) do update set in_app_opt_in = false;

-- ── sending requests (TICK-461) ────────────────────────────────────────────
select pg_temp.as_user(org_a_u) from _ids;
select pg_temp.expect('request: unclaimed artist refused',
  format($q$select public.fn_submit_artist_booking(%L, %L, null, 'AB Fest', now() + interval '20 days', 'Manzini', 60, 500000, 800000, 'SZL', 'Would love you to headline.')$q$,
         (select unclaimed from _ids), (select org_a from _ids)), false, 'artist_not_claimed');
select pg_temp.expect('request: another organisation''s event refused',
  format($q$select public.fn_submit_artist_booking(%L, %L, %L, null, now() + interval '25 days', null, 60, null, null, null, 'Would love you to headline.')$q$,
         (select artist from _ids), (select org_a from _ids), (select ev_b from _ids)), false, 'event_not_found');
select pg_temp.expect('request: offer range must be ordered',
  format($q$select public.fn_submit_artist_booking(%L, %L, null, 'AB Fest', now() + interval '20 days', null, 60, 900000, 100000, null, 'Would love you to headline.')$q$,
         (select artist from _ids), (select org_a from _ids)), false, 'offer_invalid');
update _ids set req1 = public.fn_submit_artist_booking(artist, org_a, ev_a, null, now() + interval '20 days', 'Manzini', 60, 500000, 800000, 'SZL',
  'We would love you to headline AB Fest.');
update _ids set req2 = public.fn_submit_artist_booking(artist, org_a, null, 'AB Winter Show', now() + interval '40 days', 'Mbabane', 45, 300000, 400000, 'SZL',
  'A 45-minute set at our winter show?');
select pg_temp.expect('limit: a third open request to the same artist refused',
  format($q$select public.fn_submit_artist_booking(%L, %L, null, 'Third', now() + interval '50 days', null, 30, null, null, null, 'One more request please.')$q$,
         (select artist from _ids), (select org_a from _ids)), false, 'booking_open_limit');
select pg_temp.expect_eq('request: event title taken from the linked event',
  format($q$select event_title from public.artist_booking_requests where id = %L$q$, (select req1 from _ids)), 'AB Fest');
reset role;

select pg_temp.as_user(stranger_u) from _ids;
select pg_temp.expect('request: someone who manages no organisation refused',
  format($q$select public.fn_submit_artist_booking(%L, %L, null, 'X', now() + interval '20 days', null, 30, null, null, null, 'Hello hello hello')$q$,
         (select artist from _ids), (select org_a from _ids)), false, 'forbidden');
select pg_temp.expect_eq('privacy: stranger sees no requests', $q$select count(*)::text from public.artist_booking_requests$q$, '0');
reset role;

-- Rate limit: org B's manager already sent 10 today.
insert into public.artist_booking_requests (artist_id, org_id, requested_by, event_title, starts_at, status)
select artist, org_b, org_b_u, 'Spam ' || i, now() + interval '60 days', 'declined' from _ids, generate_series(1, 10) i;
select pg_temp.as_user(org_b_u) from _ids;
select pg_temp.expect('limit: an 11th request in a day refused',
  format($q$select public.fn_submit_artist_booking(%L, %L, null, 'Eleven', now() + interval '20 days', null, 30, null, null, null, 'Please come play for us.')$q$,
         (select artist from _ids), (select org_b from _ids)), false, 'booking_rate_limited');
select pg_temp.expect_eq('privacy: org B cannot see org A''s requests',
  format($q$select count(*)::text from public.artist_booking_requests where org_id = %L$q$, (select org_a from _ids)), '0');
select pg_temp.expect_eq('privacy: org B cannot read org A''s thread',
  format($q$select count(*)::text from public.artist_booking_messages where request_id = %L$q$, (select req1 from _ids)), '0');
select pg_temp.expect('privacy: org B cannot post in it',
  format($q$select public.fn_post_artist_booking_message(%L, 'hi')$q$, (select req1 from _ids)), false, 'forbidden');
select pg_temp.expect('privacy: org B cannot respond as the artist',
  format($q$select public.fn_respond_artist_booking(%L, 'accept')$q$, (select req1 from _ids)), false, 'forbidden');
reset role;
set local role anon;
select pg_temp.expect('privacy: anon cannot read requests', $q$select count(*) from public.artist_booking_requests$q$, false, 'permission denied');
reset role;
select pg_temp.as_user(admin_u) from _ids;
select pg_temp.expect_eq('privacy: platform admin sees org A''s requests',
  format($q$select count(*)::text from public.artist_booking_requests where org_id = %L$q$, (select org_a from _ids)), '2');
reset role;

-- ── artist inbox: accept, counter (TICK-461 / TICK-485) ────────────────────
select pg_temp.as_user(manager_u) from _ids;
select pg_temp.expect_eq('inbox: manager sees both requests from org A',
  format($q$select count(*)::text from public.artist_booking_requests where org_id = %L$q$, (select org_a from _ids)), '2');
select pg_temp.expect_eq('inbox: manager reads the thread',
  format($q$select count(*)::text from public.artist_booking_messages where request_id = %L$q$, (select req1 from _ids)), '1');
select pg_temp.expect_eq('accept: manager accepts the AB Fest request',
  format($q$select public.fn_respond_artist_booking(%L, 'accept', null, 'See you there!')$q$, (select req1 from _ids)), 'accepted');
select pg_temp.expect('accept: cannot respond twice',
  format($q$select public.fn_respond_artist_booking(%L, 'decline')$q$, (select req1 from _ids)), false, 'request_not_open');
reset role;
select pg_temp.expect_eq('lineup: accepted artist added to the event line-up',
  format($q$select count(*)::text from public.event_artists where event_id = %L and artist_id = %L$q$, (select ev_a from _ids), (select artist from _ids)), '1');
select pg_temp.expect_eq('accept: agreed fee is the top of the offer',
  format($q$select agreed_cents::text from public.artist_booking_requests where id = %L$q$, (select req1 from _ids)), '800000');

select pg_temp.as_user(owner_u) from _ids;
select pg_temp.expect('counter: a counter needs an amount',
  format($q$select public.fn_respond_artist_booking(%L, 'counter')$q$, (select req2 from _ids)), false, 'counter_required');
select pg_temp.expect_eq('counter: owner counters at SZL 5,000',
  format($q$select public.fn_respond_artist_booking(%L, 'counter', 500000, 'Our fee for 45 minutes is SZL 5,000.')$q$, (select req2 from _ids)), 'countered');
reset role;
select pg_temp.as_user(org_a_u) from _ids;
select pg_temp.expect('link: cannot link before acceptance',
  format($q$select public.fn_link_artist_booking_event(%L, %L)$q$, (select req2 from _ids), (select ev_a from _ids)), false, 'request_not_accepted');
select pg_temp.expect_eq('counter: organiser accepts the counter',
  format($q$select public.fn_organizer_artist_booking(%L, 'accept_counter')$q$, (select req2 from _ids)), 'accepted');
select pg_temp.expect('link: cannot link to another organisation''s event',
  format($q$select public.fn_link_artist_booking_event(%L, %L)$q$, (select req2 from _ids), (select ev_b from _ids)), false, 'event_not_found');
select pg_temp.expect('link: links the booking to the organisation''s event',
  format($q$select public.fn_link_artist_booking_event(%L, %L)$q$, (select req2 from _ids), (select ev_a from _ids)), true);
-- Withdraw a fresh request, then the thread is closed.
update _ids set req3 = public.fn_submit_artist_booking(artist, org_a, null, 'AB Pop-up', now() + interval '70 days', null, 30, null, null, null, 'Short pop-up set?');
select pg_temp.expect_eq('withdraw: organiser withdraws',
  format($q$select public.fn_organizer_artist_booking(%L, 'withdraw')$q$, (select req3 from _ids)), 'withdrawn');
select pg_temp.expect('withdraw: thread closed afterwards',
  format($q$select public.fn_post_artist_booking_message(%L, 'Still keen?')$q$, (select req3 from _ids)), false, 'request_closed');
reset role;
select pg_temp.expect_eq('counter: agreed fee is the counter',
  format($q$select agreed_cents::text from public.artist_booking_requests where id = %L$q$, (select req2 from _ids)), '500000');
select pg_temp.expect_eq('notify: owner and manager both told about the first request',
  format($q$select count(distinct user_id)::text from public.notifications where type = 'artist_booking_request' and payload->>'requestId' = %L$q$, (select req1 from _ids)), '2');
select pg_temp.expect_eq('notify: organiser told about the acceptance and the counter',
  format($q$select count(*)::text from public.notifications where type = 'artist_booking_decision' and user_id = %L$q$, (select org_a_u from _ids)), '2');

-- ── insights and announcements (TICK-486) ──────────────────────────────────
select pg_temp.as_user(manager_u) from _ids;
select pg_temp.expect_eq('insights: followers', format($q$select public.fn_artist_insights(%L)->>'followers'$q$, (select artist from _ids)), '2');
select pg_temp.expect_eq('insights: aggregate tickets at past events', format($q$select public.fn_artist_insights(%L)->>'tickets_sold'$q$, (select artist from _ids)), '120');
select pg_temp.expect_eq('insights: aggregate check-ins', format($q$select public.fn_artist_insights(%L)->>'checked_in'$q$, (select artist from _ids)), '97');
select pg_temp.expect_eq('insights: confirmed upcoming bookings', format($q$select public.fn_artist_insights(%L)->>'confirmed_bookings'$q$, (select artist from _ids)), '2');
select pg_temp.expect_eq('insights: no buyer contact fields',
  format($q$select (public.fn_artist_insights(%L)::text ~* '(email|phone|buyer|user_id)')::text$q$, (select artist from _ids)), 'false');
select pg_temp.expect_eq('announce: in-app only to followers with in-app on',
  format($q$select public.fn_post_artist_announcement(%L, 'New single out', 'Our new single drops Friday.')$q$, (select artist from _ids)), '1');
select pg_temp.expect('announce: two more this week are fine',
  format($q$select public.fn_post_artist_announcement(%L, 'Tour', 'Tour dates soon.'), public.fn_post_artist_announcement(%L, 'Merch', 'Merch is live.')$q$, (select artist from _ids), (select artist from _ids)), true);
select pg_temp.expect('announce: a fourth in 7 days refused',
  format($q$select public.fn_post_artist_announcement(%L, 'Again', 'Too many posts.')$q$, (select artist from _ids)), false, 'announcement_rate_limited');
select pg_temp.expect('announce: unrelated event refused',
  format($q$select public.fn_post_artist_announcement(%L, 'Gig', 'See you there.', %L)$q$, (select artist from _ids), (select ev_b from _ids)), false, 'event_not_found|announcement_rate_limited');
reset role;
select pg_temp.expect_eq('announce: the opted-out follower got nothing',
  format($q$select count(*)::text from public.notifications where type = 'artist_announcement' and user_id = %L$q$, (select fan2 from _ids)), '0');
select pg_temp.as_user(org_a_u) from _ids;
select pg_temp.expect('insights: organiser cannot read the artist''s insights',
  format($q$select public.fn_artist_insights(%L)$q$, (select artist from _ids)), false, 'forbidden');
select pg_temp.expect('announce: organiser cannot post as the artist',
  format($q$select public.fn_post_artist_announcement(%L, 'Hijack', 'Not ours.')$q$, (select artist from _ids)), false, 'forbidden');
reset role;
select pg_temp.as_user(fan1) from _ids;
select pg_temp.expect_eq('announce: followers cannot list announcements', $q$select count(*)::text from public.artist_announcements$q$, '0');
reset role;

do $$
declare v_fail int; v_total int; v_out text;
begin
  select count(*) filter (where not ok), count(*),
         string_agg(format('  %s  %-62s %s', case when ok then 'PASS' else 'FAIL' end, label, detail), E'\n' order by n)
  into v_fail, v_total, v_out from _results;
  raise notice E'ARTIST BOOKINGS HARNESS\n%\n  passed=%  failed=%', v_out, v_total - v_fail, v_fail;
  if v_fail > 0 then raise exception 'artist bookings harness: % failure(s)', v_fail; end if;
end $$;

rollback;
