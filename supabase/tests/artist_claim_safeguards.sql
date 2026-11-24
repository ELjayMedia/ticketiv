-- TICK-353 safeguards: protected identity, rate limits, merge preservation, rollback.
-- Run against an ISOLATED database only; rolls back.
\set ON_ERROR_STOP on
begin;
do $$
declare
  owner_u uuid := gen_random_uuid(); fan uuid := gen_random_uuid(); admin_u uuid := gen_random_uuid(); spam uuid := gen_random_uuid();
  v_org uuid; v_venue uuid; v_e1 uuid; v_e2 uuid; v_dup uuid; v_canon uuid; v_claimed uuid; v_err text; n int; v_bio text;
  a uuid; i int;
begin
  insert into auth.users (id, email, aud, role, instance_id) values
    (owner_u, 'sg-o-' || left(owner_u::text, 8) || '@example.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    (fan, 'sg-f-' || left(fan::text, 8) || '@example.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    (admin_u, 'sg-a-' || left(admin_u::text, 8) || '@example.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    (spam, 'sg-s-' || left(spam::text, 8) || '@example.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
  insert into public.admin_users (user_id, role_tier, active) values (admin_u, 'super_admin', true);
  insert into public.organizations (name, slug) values ('SG Org', 'sg-' || left(owner_u::text, 8)) returning id into v_org;
  insert into public.venues (name, slug, city) values ('SG Hall ' || left(owner_u::text, 6), 'sg-hall-' || left(owner_u::text, 8), 'Mbabane') returning id into v_venue;
  insert into public.events (org_id, venue_id, title, slug, status, visibility, starts_at) values
    (v_org, v_venue, 'SG One', 'sg-one-' || left(owner_u::text, 8), 'draft', 'public', now() + interval '3 days') returning id into v_e1;
  insert into public.events (org_id, venue_id, title, slug, status, visibility, starts_at) values
    (v_org, v_venue, 'SG Two', 'sg-two-' || left(owner_u::text, 8), 'draft', 'public', now() + interval '4 days') returning id into v_e2;

  -- 1. A claimed artist's bio is not overwritten by an organiser's line-up entry.
  insert into public.artists (name, slug, primary_user_id, bio) values ('SG Claimed ' || left(owner_u::text, 6), 'sg-claimed-' || left(owner_u::text, 8), owner_u, 'Written by the artist') returning id into v_claimed;
  update public.artists set bio = null where id = v_claimed;  -- empty bio: organisers still may not fill it
  perform public.fn_get_or_create_artist('SG Claimed ' || left(owner_u::text, 6), 'Organiser bio', null);
  select bio into v_bio from public.artists where id = v_claimed;
  if v_bio is not null then raise exception 'organiser filled a claimed artist''s bio: %', v_bio; end if;

  -- 2. Rate limit: a fourth pending claim is refused.
  perform set_config('request.jwt.claims', json_build_object('sub', spam::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  for i in 1..4 loop
    execute 'reset role';
    insert into public.artists (name, slug) values ('SG Target ' || i || ' ' || left(spam::text, 6), 'sg-target-' || i || '-' || left(spam::text, 8)) returning id into a;
    execute 'set local role authenticated';
    begin
      perform public.fn_submit_artist_claim(a, 'artist_owner', 'I am this artist, see my official pages please.');
      v_err := null;
    exception when others then v_err := sqlerrm; end;
  end loop;
  execute 'reset role';
  if coalesce(v_err, '') !~ 'claim_rate_limited' then raise exception 'fourth pending claim should be rate limited (got %)', coalesce(v_err, 'success'); end if;

  -- 3. Merge: duplicate's line-ups and followers move; old URL redirects; history audited.
  insert into public.artists (name, slug) values ('SG Choir ' || left(owner_u::text, 6), 'sg-choir-' || left(owner_u::text, 8)) returning id into v_canon;
  insert into public.artists (name, slug, bio) values ('SG The Choir ' || left(owner_u::text, 6), 'sg-the-choir-' || left(owner_u::text, 8), 'Dup bio') returning id into v_dup;
  insert into public.event_artists (event_id, artist_id) values (v_e1, v_canon), (v_e1, v_dup), (v_e2, v_dup);
  insert into public.artist_follows (user_id, artist_id) values (fan, v_dup);

  perform set_config('request.jwt.claims', json_build_object('sub', fan::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';
  begin perform public.fn_admin_merge_artists(v_dup, v_canon, 'not an admin'); v_err := null; exception when others then v_err := sqlerrm; end;
  execute 'reset role';
  if coalesce(v_err, '') !~ 'forbidden' then raise exception 'non-admin merge must be refused (got %)', coalesce(v_err, 'success'); end if;

  perform set_config('request.jwt.claims', json_build_object('sub', admin_u::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';
  perform public.fn_admin_merge_artists(v_dup, v_canon, 'Same choir, two spellings');
  execute 'reset role';

  select count(*) into n from public.event_artists where artist_id = v_canon;
  if n <> 2 then raise exception 'canonical artist should be on both events (got %)', n; end if;
  select count(*) into n from public.artist_follows where artist_id = v_canon and user_id = fan;
  if n <> 1 then raise exception 'follower should move to the canonical artist'; end if;
  select count(*) into n from public.artist_redirects where old_id = v_dup and artist_id = v_canon and old_slug like 'sg-the-choir-%';
  if n <> 1 then raise exception 'merged profile should redirect'; end if;
  select count(*) into n from public.artists where id = v_dup;
  if n <> 0 then raise exception 'duplicate should be removed'; end if;
  select bio into v_bio from public.artists where id = v_canon;
  if v_bio is distinct from 'Dup bio' then raise exception 'empty canonical bio should be filled from the duplicate'; end if;
  select count(*) into n from public.audit_log where table_name = 'artists' and record_id = v_canon::text and changes->>'event' = 'artist_merged';
  if n <> 1 then raise exception 'merge should be audited'; end if;

  -- 4. Rollback of an incorrectly approved claim keeps line-ups and followers.
  update public.artists set primary_user_id = owner_u, verification_status = 'verified' where id = v_canon;
  perform set_config('request.jwt.claims', json_build_object('sub', admin_u::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';
  perform public.fn_admin_reset_artist_owner(v_canon, 'Claim approved in error');
  execute 'reset role';
  select count(*) into n from public.artist_members where artist_id = v_canon;
  if n <> 0 then raise exception 'reset should remove every member (got %)', n; end if;
  select count(*) into n from public.artists where id = v_canon and primary_user_id is null and verification_status = 'unverified';
  if n <> 1 then raise exception 'reset should clear the owner and verification'; end if;
  select count(*) into n from public.event_artists where artist_id = v_canon;
  if n <> 2 then raise exception 'reset must keep line-ups'; end if;

  raise notice 'ARTIST CLAIM SAFEGUARDS: protected bio, rate limit, merge preservation + redirect + audit, admin-only, rollback';
end $$;
rollback;
