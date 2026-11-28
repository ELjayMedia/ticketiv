-- TICK-434 / TICK-452: venue follows, alerts and public follower counts.
-- Run against an ISOLATED database only; rolls back.
\set ON_ERROR_STOP on
begin;
do $$
declare
  a uuid := gen_random_uuid();  -- follows the venue only
  b uuid := gen_random_uuid();  -- follows the venue and the organiser
  g uuid := gen_random_uuid();  -- anonymous session
  v_org uuid; v_venue uuid; v_event uuid; v_series uuid; n int; v_err text;
begin
  insert into auth.users (id, email, aud, role, instance_id) values
    (a, 'fa-' || left(a::text, 8) || '@example.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    (b, 'fb-' || left(b::text, 8) || '@example.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    (g, 'fg-' || left(g::text, 8) || '@example.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
  insert into public.organizations (name, slug) values ('Follow Org', 'follow-' || left(a::text, 8)) returning id into v_org;
  insert into public.venues (name, slug, city) values ('Follow Hall ' || left(a::text, 6), 'follow-hall-' || left(a::text, 8), 'Mbabane') returning id into v_venue;

  -- Follow through the RPCs as each user.
  perform set_config('request.jwt.claims', json_build_object('sub', a::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';
  perform public.fn_set_venue_follow(v_venue, true);
  perform public.fn_set_venue_follow(v_venue, true);  -- idempotent
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';
  perform public.fn_set_venue_follow(v_venue, true);
  perform public.fn_set_org_follow(v_org, true);
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', g::text, 'role', 'authenticated', 'is_anonymous', true)::text, true);
  execute 'set local role authenticated';
  begin perform public.fn_set_venue_follow(v_venue, true); v_err := null; exception when others then v_err := sqlerrm; end;
  execute 'reset role';
  if coalesce(v_err, '') !~ 'claimed_account_required' then raise exception 'anonymous session should not follow (got %)', coalesce(v_err, 'success'); end if;

  -- Public counts, readable by anon.
  execute 'set local role anon';
  select public.fn_follower_count('venue', v_venue) into n;
  if n <> 2 then raise exception 'venue follower count should be 2 (got %)', n; end if;
  select public.fn_follower_count('organizer', v_org) into n;
  if n <> 1 then raise exception 'organiser follower count should be 1 (got %)', n; end if;
  select public.fn_follower_count('nonsense', v_org) into n;
  if n is not null then raise exception 'unknown kind should return null'; end if;
  execute 'reset role';

  -- Publishing at the venue alerts A once; B gets the organiser alert instead.
  insert into public.events (org_id, venue_id, title, slug, status, visibility, starts_at)
  values (v_org, v_venue, 'Hall Night', 'hall-night-' || left(a::text, 8), 'draft', 'public', now() + interval '5 days') returning id into v_event;
  update public.events set status = 'published' where id = v_event;

  select count(*) into n from public.notifications where user_id = a and type = 'venue_new_event' and payload->>'eventId' = v_event::text;
  if n <> 1 then raise exception 'venue follower should get one venue alert (got %)', n; end if;
  select count(*) into n from public.notifications where user_id = b and type = 'venue_new_event';
  if n <> 0 then raise exception 'organiser follower should not get a duplicate venue alert (got %)', n; end if;
  select count(*) into n from public.notifications where user_id = b and type = 'organizer_new_event';
  if n <> 1 then raise exception 'organiser follower should get the organiser alert (got %)', n; end if;

  -- Unfollow drops the count.
  perform set_config('request.jwt.claims', json_build_object('sub', a::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';
  perform public.fn_set_venue_follow(v_venue, false);
  select count(*) into n from public.venue_follows;  -- select-own: sees nothing after unfollow
  execute 'reset role';
  if n <> 0 then raise exception 'follower should see only own rows (got %)', n; end if;
  if public.fn_follower_count('venue', v_venue) <> 1 then raise exception 'count should drop to 1 after unfollow'; end if;

  raise notice 'FOLLOWS: venue follow, dedupe with organiser alert, public counts, anon refused, unfollow';
end $$;
rollback;
