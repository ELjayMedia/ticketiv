-- TICK-434 / TICK-452: series alerts, one alert per user per event across all
-- follow kinds, preferences, the public threshold, the organiser trend and
-- fn_my_follows. Run against an ISOLATED database only; rolls back.
\set ON_ERROR_STOP on
begin;
do $$
declare
  u_series uuid := gen_random_uuid();   -- follows the series
  u_all uuid := gen_random_uuid();      -- follows series, artist and venue
  u_artist uuid := gen_random_uuid();   -- follows the artist and the venue
  u_muted uuid := gen_random_uuid();    -- follows the series, in-app alerts off
  u_member uuid := gen_random_uuid();   -- organiser team member
  u_stranger uuid := gen_random_uuid();
  v_org uuid; v_venue uuid; v_series uuid; v_artist uuid; v_event uuid; n int; v_err text; v_trend jsonb;
begin
  insert into auth.users (id, email, aud, role, instance_id)
  select x, 'fc-' || left(x::text, 8) || '@example.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'
    from unnest(array[u_series, u_all, u_artist, u_muted, u_member, u_stranger]) as x;
  insert into public.organizations (name, slug) values ('FC Org', 'fc-org-' || left(u_series::text, 8)) returning id into v_org;
  insert into public.org_members (org_id, user_id, role) values (v_org, u_member, 'organizer_admin');
  insert into public.venues (name, slug, city) values ('FC Hall', 'fc-hall-' || left(u_series::text, 8), 'Manzini') returning id into v_venue;
  insert into public.event_series (org_id, slug, title, series_type) values (v_org, 'fc-tour-' || left(u_series::text, 8), 'FC Tour', 'tour') returning id into v_series;
  insert into public.artists (name, slug) values ('FC Band ' || left(u_series::text, 6), 'fc-band-' || left(u_series::text, 8)) returning id into v_artist;

  insert into public.series_follows (user_id, series_id) values (u_series, v_series), (u_all, v_series), (u_muted, v_series);
  insert into public.artist_follows (user_id, artist_id) values (u_all, v_artist), (u_artist, v_artist);
  insert into public.venue_follows (user_id, venue_id) values (u_all, v_venue), (u_artist, v_venue);
  insert into public.user_notification_preferences (user_id, in_app_opt_in) values (u_muted, false)
    on conflict (user_id) do update set in_app_opt_in = false;

  insert into public.events (org_id, venue_id, series_id, title, slug, status, visibility, starts_at)
  values (v_org, v_venue, v_series, 'FC Night', 'fc-night-' || left(u_series::text, 8), 'draft', 'public', now() + interval '6 days')
  returning id into v_event;
  insert into public.event_artists (event_id, artist_id) values (v_event, v_artist);
  update public.events set status = 'published' where id = v_event;

  -- Series follower gets the series alert.
  select count(*) into n from public.notifications where user_id = u_series and type = 'series_new_event' and payload->>'eventId' = v_event::text;
  if n <> 1 then raise exception 'series follower should get one series alert (got %)', n; end if;
  -- One alert per user per event, whatever they follow.
  select count(*) into n from public.notifications where user_id = u_all and payload->>'eventId' = v_event::text;
  if n <> 1 then raise exception 'user following series+artist+venue should get exactly one alert (got %)', n; end if;
  select count(*) into n from public.notifications where user_id = u_all and type = 'series_new_event';
  if n <> 1 then raise exception 'series alert should win over artist and venue'; end if;
  select count(*) into n from public.notifications where user_id = u_artist and payload->>'eventId' = v_event::text;
  if n <> 1 then raise exception 'artist+venue follower should get exactly one alert (got %)', n; end if;
  select count(*) into n from public.notifications where user_id = u_artist and type = 'artist_new_event';
  if n <> 1 then raise exception 'artist alert should win over venue'; end if;
  -- Preferences respected.
  select count(*) into n from public.notifications where user_id = u_muted;
  if n <> 0 then raise exception 'in-app opt-out should get no alert (got %)', n; end if;

  -- Threshold: below 50 the public read model hides the count.
  insert into public.org_follows (user_id, org_id) values (u_series, v_org);
  execute 'set local role anon';
  select count(*) into n from public.v_organizer_public where id = v_org and follower_count is null;
  execute 'reset role';
  if n <> 1 then raise exception 'follower_count should be hidden below the threshold'; end if;
  insert into auth.users (id, email, aud, role, instance_id)
  select gen_random_uuid(), 'fc-bulk-' || i || '-' || left(u_series::text, 8) || '@example.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'
    from generate_series(1, 49) i;
  insert into public.org_follows (user_id, org_id)
  select id, v_org from auth.users where email like 'fc-bulk-%-' || left(u_series::text, 8) || '@example.test';
  update public.org_follows set created_at = now() - interval '45 days'
   where org_id = v_org and user_id in (select id from auth.users where email like 'fc-bulk-1_-%');
  execute 'set local role anon';
  select follower_count into n from public.v_organizer_public where id = v_org;
  execute 'reset role';
  if n is distinct from 50 then raise exception 'follower_count should show 50 at the threshold (got %)', n; end if;

  -- Organiser trend: members only.
  perform set_config('request.jwt.claims', json_build_object('sub', u_stranger::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';
  begin perform public.fn_org_follower_trend(v_org); v_err := null; exception when others then v_err := sqlerrm; end;
  execute 'reset role';
  if coalesce(v_err, '') !~ 'forbidden' then raise exception 'stranger must not read the trend (got %)', coalesce(v_err, 'success'); end if;
  perform set_config('request.jwt.claims', json_build_object('sub', u_member::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';
  v_trend := public.fn_org_follower_trend(v_org);
  execute 'reset role';
  if (v_trend->>'total')::int <> 50 then raise exception 'trend total should be 50 (got %)', v_trend->>'total'; end if;
  if (v_trend->>'new_30d')::int <> 40 then raise exception 'trend new_30d should be 40 (got %)', v_trend->>'new_30d'; end if;
  if jsonb_array_length(v_trend->'daily') <> 30 then raise exception 'trend should have 30 days'; end if;
  if (v_trend->'daily'->0->>'total')::int <> 10 then raise exception 'first day should count the 10 older followers (got %)', v_trend->'daily'->0->>'total'; end if;

  -- fn_my_follows: own rows only, every kind.
  perform set_config('request.jwt.claims', json_build_object('sub', u_all::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.fn_my_follows();
  if n <> 3 then execute 'reset role'; raise exception 'u_all should see 3 follows (got %)', n; end if;
  select count(distinct kind) into n from public.fn_my_follows();
  execute 'reset role';
  if n <> 3 then raise exception 'u_all should see series, artist and venue'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', u_series::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.fn_my_follows() where kind = 'organizer';
  execute 'reset role';
  if n <> 1 then raise exception 'u_series should see the organiser follow'; end if;
  execute 'set local role anon';
  begin perform public.fn_my_follows(); v_err := null; exception when others then v_err := sqlerrm; end;
  execute 'reset role';
  if v_err is null then raise exception 'anon must not call fn_my_follows'; end if;

  raise notice 'FOLLOW COMPLETION: series alert, one alert per event (org>series>artist>venue), opt-out, threshold, trend, my follows';
end $$;
rollback;
