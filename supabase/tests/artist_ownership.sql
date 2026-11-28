-- TICK-353 / TICK-484 artist claims, managers and profile authorization.
-- Run against an ISOLATED database only; one transaction, rolled back.
\set ON_ERROR_STOP on
begin;

create temp table _results (n serial, label text, ok boolean, detail text) on commit drop;
grant all on _results to authenticated, anon;
grant usage, select on sequence _results_n_seq to authenticated, anon;

create function pg_temp.as_user(p_user uuid, p_anonymous boolean default false) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user::text, 'role', 'authenticated', 'is_anonymous', p_anonymous)::text, true);
  execute 'set local role authenticated';
end $$;

create function pg_temp.expect(p_label text, p_sql text, p_should_succeed boolean, p_err text default '.') returns void
language plpgsql as $$
declare v_err text;
begin
  begin execute p_sql; exception when others then v_err := sqlerrm; end;
  if p_should_succeed then
    insert into _results (label, ok, detail) values (p_label, v_err is null, coalesce(v_err, 'ok'));
  else
    insert into _results (label, ok, detail) values (p_label, v_err is not null and v_err ~* p_err, coalesce(v_err, 'UNEXPECTEDLY SUCCEEDED'));
  end if;
end $$;

create function pg_temp.expect_eq(p_label text, p_sql text, p_expected text) returns void
language plpgsql as $$
declare v text;
begin
  execute p_sql into v;
  insert into _results (label, ok, detail) values (p_label, v is not distinct from p_expected, format('got %s, expected %s', v, p_expected));
end $$;

grant execute on function pg_temp.as_user(uuid, boolean), pg_temp.expect(text, text, boolean, text), pg_temp.expect_eq(text, text, text) to authenticated, anon;

create temp table _ids as select
  gen_random_uuid() as performer, gen_random_uuid() as impostor, gen_random_uuid() as manager,
  gen_random_uuid() as admin, gen_random_uuid() as anon_user, gen_random_uuid() as lineup_artist,
  gen_random_uuid() as self_artist;
grant select on _ids to authenticated, anon;

insert into auth.users (id, email, aud, role, instance_id)
select x.id, x.email, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'
from _ids i, lateral (values
  (i.performer, 'artist-performer-' || left(i.performer::text, 8) || '@example.test'),
  (i.impostor, 'artist-impostor-' || left(i.impostor::text, 8) || '@example.test'),
  (i.manager, 'artist-manager-' || left(i.manager::text, 8) || '@example.test'),
  (i.admin, 'artist-admin-' || left(i.admin::text, 8) || '@example.test'),
  (i.anon_user, 'artist-anon-' || left(i.anon_user::text, 8) || '@example.test')
) as x(id, email);
insert into public.admin_users (user_id, role_tier, active) select admin, 'super_admin', true from _ids;
-- An organiser-created line-up artist nobody owns yet.
insert into public.artists (id, name, slug) select lineup_artist, 'Harness Choir ' || left(lineup_artist::text, 6), 'harness-choir-' || left(lineup_artist::text, 8) from _ids;
-- A performer's own self-created profile (owner via primary_user_id).
insert into public.artists (id, name, slug, primary_user_id) select self_artist, 'Harness Soloist ' || left(self_artist::text, 6), 'harness-soloist-' || left(self_artist::text, 8), impostor from _ids;

select pg_temp.expect_eq('backfill/sync: primary_user_id is owner',
  format($q$select role from public.artist_members where artist_id = %L and user_id = %L$q$, (select self_artist from _ids), (select impostor from _ids)), 'artist_owner');

-- ── self-create on a taken name points to the existing profile ─────────────
select pg_temp.as_user(performer) from _ids;
select pg_temp.expect('self-create: taken name refused with artist_exists',
  format($q$select public.fn_create_talent_profile(%L)$q$, (select 'harness choir ' || left(lineup_artist::text, 6) from _ids)), false, 'artist_exists');
select pg_temp.expect_eq('search: finds the line-up artist',
  format($q$select count(*)::text from public.fn_search_claimable_artists(%L)$q$, (select 'harness choir ' || left(lineup_artist::text, 6) from _ids)), '1');
select pg_temp.expect('claim: performer claims the line-up artist',
  format($q$select public.fn_submit_artist_claim(%L, 'artist_owner', 'I lead this choir; our booking line is on our Facebook page.')$q$, (select lineup_artist from _ids)), true);
select pg_temp.expect('claim: duplicate pending claim refused',
  format($q$select public.fn_submit_artist_claim(%L, 'artist_owner', 'I lead this choir; our booking line is on our Facebook page.')$q$, (select lineup_artist from _ids)), false, 'claim_pending');
select pg_temp.expect('claim: no profile edits before approval',
  format($q$select public.fn_update_artist_profile(%L, 'bio', null, null, null, null, '{}', null, null, null)$q$, (select lineup_artist from _ids)), false, 'forbidden');
select pg_temp.expect_eq('claim: listed in my claims',
  $q$select count(*)::text from public.fn_my_artist_claims()$q$, '1');
reset role;

-- ── impostor claims the same artist; anonymous sessions refused ────────────
select pg_temp.as_user(impostor) from _ids;
select pg_temp.expect('claim: competing claim submitted',
  format($q$select public.fn_submit_artist_claim(%L, 'artist_owner', 'I am the real leader of this choir, honestly.')$q$, (select lineup_artist from _ids)), true);
select pg_temp.expect_eq('impostor: sees only own claims', $q$select count(*)::text from public.artist_claims$q$, '1');
select pg_temp.expect('impostor: cannot review claims',
  format($q$select public.fn_review_artist_claim((select id from public.artist_claims limit 1), true)$q$), false, 'forbidden');
select pg_temp.expect('impostor: direct insert into artist_members denied',
  format($q$insert into public.artist_members (artist_id, user_id, role) values (%L, %L, 'artist_owner')$q$, (select lineup_artist from _ids), (select impostor from _ids)),
  false, 'permission denied');
reset role;
select pg_temp.as_user(anon_user, true) from _ids;
select pg_temp.expect('anon: cannot claim',
  format($q$select public.fn_submit_artist_claim(%L, 'artist_owner', 'twenty characters of evidence here')$q$, (select lineup_artist from _ids)), false, 'claimed_account_required');
reset role;

-- ── admin review ───────────────────────────────────────────────────────────
select pg_temp.as_user(admin) from _ids;
select pg_temp.expect('admin: approve performer claim',
  format($q$select public.fn_review_artist_claim(%L, true, 'Checked with the choir''s page')$q$,
         (select id from public.artist_claims where claimant_id = (select performer from _ids))), true);
select pg_temp.expect('admin: competing owner claim is a dispute',
  format($q$select public.fn_review_artist_claim(%L, true)$q$, (select id from public.artist_claims where claimant_id = (select impostor from _ids))),
  false, 'artist_already_owned');
select pg_temp.expect('admin: reject the impostor',
  format($q$select public.fn_review_artist_claim(%L, false, 'Could not verify')$q$, (select id from public.artist_claims where claimant_id = (select impostor from _ids))), true);
reset role;

select pg_temp.expect_eq('approve: performer owns the artist',
  format($q$select primary_user_id::text from public.artists where id = %L$q$, (select lineup_artist from _ids)), (select performer::text from _ids));
select pg_temp.expect_eq('approve: owner row synced',
  format($q$select role from public.artist_members where artist_id = %L and user_id = %L$q$, (select lineup_artist from _ids), (select performer from _ids)), 'artist_owner');
select pg_temp.expect_eq('approve: verified',
  format($q$select verification_status from public.artists where id = %L$q$, (select lineup_artist from _ids)), 'verified');
select pg_temp.expect_eq('reject: impostor has no access',
  format($q$select count(*)::text from public.artist_members where artist_id = %L and user_id = %L$q$, (select lineup_artist from _ids), (select impostor from _ids)), '0');
select pg_temp.expect_eq('notifications: both claimants told',
  format($q$select count(*)::text from public.notifications where type = 'artist_claim_decision' and user_id in (%L, %L)$q$, (select performer from _ids), (select impostor from _ids)), '2');

-- ── owner manages profile and team ─────────────────────────────────────────
select pg_temp.as_user(performer) from _ids;
select pg_temp.expect('owner: update profile and press kit',
  format($q$select public.fn_update_artist_profile(%L, 'Gospel choir from Manzini.', 'choir', array['Gospel', 'gospel', 'Choral'], 'https://img.example/choir.jpg', null, '{"instagram":"https://instagram.com/choir","eljaytunes":"https://app.eljaytunes.com/artist/1"}', 'https://example.org/epk.pdf', 'bookings@choir.example', 'Two weeks notice')$q$,
         (select lineup_artist from _ids)), true);
select pg_temp.expect_eq('owner: genres normalised and de-duplicated',
  format($q$select array_to_string(genres, ',') from public.artists where id = %L$q$, (select lineup_artist from _ids)), 'choral,gospel');
select pg_temp.expect('owner: javascript link refused',
  format($q$select public.fn_update_artist_profile(%L, null, null, null, null, null, '{"website":"javascript:alert(1)"}', null, null, null)$q$, (select lineup_artist from _ids)), false, 'link_invalid');
select pg_temp.expect('owner: unknown link key refused',
  format($q$select public.fn_update_artist_profile(%L, null, null, null, null, null, '{"myspace":"https://x.example"}', null, null, null)$q$, (select lineup_artist from _ids)), false, 'link_invalid');
select pg_temp.expect_eq('owner: add manager',
  format($q$select public.fn_add_artist_manager(%L, %L)$q$, (select lineup_artist from _ids), (select 'artist-manager-' || left(manager::text, 8) || '@example.test' from _ids)), 'added');
select pg_temp.expect('owner: cannot remove self',
  format($q$select public.fn_remove_artist_member(%L, %L)$q$, (select lineup_artist from _ids), (select performer from _ids)), false, 'owner_cannot_be_removed');
reset role;

select pg_temp.as_user(manager) from _ids;
select pg_temp.expect('manager: can edit the profile',
  format($q$select public.fn_update_artist_profile(%L, 'Updated by manager', 'choir', array['gospel'], null, null, '{}', null, null, null)$q$, (select lineup_artist from _ids)), true);
select pg_temp.expect('manager: cannot add managers',
  format($q$select public.fn_add_artist_manager(%L, 'x@example.test')$q$, (select lineup_artist from _ids)), false, 'forbidden');
select pg_temp.expect_eq('manager: gets an artist context',
  format($q$select role_key from public.fn_get_ticketiv_effective_roles(%L) where source = 'artist_members'$q$, (select manager from _ids)), 'artist_manager');
reset role;

select pg_temp.as_user(impostor) from _ids;
select pg_temp.expect('impostor: cannot remove the manager',
  format($q$select public.fn_remove_artist_member(%L, %L)$q$, (select lineup_artist from _ids), (select manager from _ids)), false, 'forbidden');
select pg_temp.expect('impostor: cannot edit someone else''s artist',
  format($q$select public.fn_update_artist_profile(%L, 'hijack', null, null, null, null, '{}', null, null, null)$q$, (select lineup_artist from _ids)), false, 'forbidden');
reset role;

-- ── public visibility of a verified artist ─────────────────────────────────
set local role anon;
select pg_temp.expect_eq('public: verified artist readable by anon',
  format($q$select count(*)::text from public.artists where id = %L$q$, (select lineup_artist from _ids)), '1');
reset role;

do $$
declare v_fail int; v_total int; v_out text;
begin
  select count(*) filter (where not ok), count(*),
         string_agg(format('  %s  %-48s %s', case when ok then 'PASS' else 'FAIL' end, label, detail), E'\n' order by n)
  into v_fail, v_total, v_out from _results;
  raise notice E'ARTIST OWNERSHIP HARNESS\n%\n  passed=%  failed=%', v_out, v_total - v_fail, v_fail;
  if v_fail > 0 then raise exception 'artist ownership harness: % failure(s)', v_fail; end if;
end $$;

rollback;
