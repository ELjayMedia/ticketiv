-- Regression: signed-in visitors read public lineups like signed-out ones.
-- Run against an ISOLATED database only; rolls back.
\set ON_ERROR_STOP on
begin;
do $$
declare
  v_user uuid := gen_random_uuid(); v_org uuid; v_venue uuid; v_event uuid; v_private_event uuid;
  v_artist uuid; v_hidden uuid; n_artist int; n_lineup int; n_hidden int; n_anon int;
begin
  insert into auth.users (id, email, aud, role, instance_id)
  values (v_user, 'fan-' || left(v_user::text, 8) || '@example.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
  insert into public.organizations (name, slug) values ('Lineup Org', 'lineup-' || left(v_user::text, 8)) returning id into v_org;
  insert into public.venues (name, slug, city) values ('Lineup Hall ' || left(v_user::text, 6), 'lineup-hall-' || left(v_user::text, 8), 'Mbabane') returning id into v_venue;
  insert into public.artists (name, slug) values ('Lineup Star ' || left(v_user::text, 6), 'lineup-star-' || left(v_user::text, 8)) returning id into v_artist;
  insert into public.artists (name, slug) values ('Private Act ' || left(v_user::text, 6), 'private-act-' || left(v_user::text, 8)) returning id into v_hidden;
  insert into public.events (org_id, venue_id, title, slug, status, visibility, starts_at)
  values (v_org, v_venue, 'Public Night', 'public-night-' || left(v_user::text, 8), 'published', 'public', now() + interval '3 days') returning id into v_event;
  insert into public.events (org_id, venue_id, title, slug, status, visibility, starts_at)
  values (v_org, v_venue, 'Private Night', 'private-night-' || left(v_user::text, 8), 'published', 'private', now() + interval '3 days') returning id into v_private_event;
  insert into public.event_artists (event_id, artist_id) values (v_event, v_artist), (v_private_event, v_hidden);

  execute 'set local role anon';
  select count(*) into n_anon from public.artists where id = v_artist;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', v_user::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';
  select count(*) into n_artist from public.artists where id = v_artist;
  select count(*) into n_lineup from public.event_artists where artist_id = v_artist;
  select count(*) into n_hidden from public.artists where id = v_hidden;
  execute 'reset role';

  if n_anon <> 1 then raise exception 'anon should read the lineup artist (got %)', n_anon; end if;
  if n_artist <> 1 then raise exception 'signed-in visitor should read the lineup artist (got %)', n_artist; end if;
  if n_lineup <> 1 then raise exception 'signed-in visitor should read the public lineup (got %)', n_lineup; end if;
  if n_hidden <> 0 then raise exception 'artist only on a private event must stay hidden (got %)', n_hidden; end if;
  raise notice 'ARTIST PUBLIC READ: anon=1 signed-in artist=1 lineup=1 private-only=0';
end $$;
rollback;
