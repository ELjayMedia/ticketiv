-- TICK-481 venue ownership & authorization harness.
--
-- Run against an ISOLATED database only (supabase db start), never live:
--   psql "$TICKETIV_CROSS_ORG_TEST_DB_URL" -X -v ON_ERROR_STOP=1 -f supabase/tests/venue_ownership.sql
-- Everything runs in one transaction that is rolled back. The script exits
-- non-zero if any expectation fails.

\set ON_ERROR_STOP on
begin;

create temp table _results (n serial, label text, ok boolean, detail text) on commit drop;
grant all on _results to authenticated;
grant usage, select on sequence _results_n_seq to authenticated;

-- Impersonate a user the way PostgREST does.
create function pg_temp.as_user(p_user uuid, p_anonymous boolean default false) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user::text, 'role', 'authenticated', 'is_anonymous', p_anonymous)::text, true);
  execute 'set local role authenticated';
end $$;

-- Run p_sql; record pass/fail against the expectation. p_err: regex the error
-- must match when p_should_succeed is false.
create function pg_temp.expect(p_label text, p_sql text, p_should_succeed boolean, p_err text default '.') returns void
language plpgsql as $$
declare v_err text;
begin
  begin
    execute p_sql;
  exception when others then v_err := sqlerrm; end;
  if p_should_succeed then
    insert into _results (label, ok, detail) values (p_label, v_err is null, coalesce(v_err, 'ok'));
  else
    insert into _results (label, ok, detail)
    values (p_label, v_err is not null and v_err ~* p_err, coalesce(v_err, 'UNEXPECTEDLY SUCCEEDED'));
  end if;
end $$;

-- Assert a scalar query returns the expected text.
create function pg_temp.expect_eq(p_label text, p_sql text, p_expected text) returns void
language plpgsql as $$
declare v text;
begin
  execute p_sql into v;
  insert into _results (label, ok, detail)
  values (p_label, v is not distinct from p_expected, format('got %s, expected %s', v, p_expected));
end $$;

grant execute on function pg_temp.as_user(uuid, boolean), pg_temp.expect(text, text, boolean, text),
  pg_temp.expect_eq(text, text, text) to authenticated;

-- ── fixtures ───────────────────────────────────────────────────────────────
create temp table _ids as select
  gen_random_uuid() as owner, gen_random_uuid() as claimant, gen_random_uuid() as stranger,
  gen_random_uuid() as manager, gen_random_uuid() as admin, gen_random_uuid() as anon_user,
  gen_random_uuid() as existing_venue;
grant select on _ids to authenticated;

insert into auth.users (id, email, aud, role, instance_id)
select x.id, x.email, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'
from _ids i, lateral (values
  (i.owner, 'venue-owner-' || left(i.owner::text, 8) || '@example.test'),
  (i.claimant, 'venue-claimant-' || left(i.claimant::text, 8) || '@example.test'),
  (i.stranger, 'venue-stranger-' || left(i.stranger::text, 8) || '@example.test'),
  (i.manager, 'venue-manager-' || left(i.manager::text, 8) || '@example.test'),
  (i.admin, 'venue-admin-' || left(i.admin::text, 8) || '@example.test'),
  (i.anon_user, 'venue-anon-' || left(i.anon_user::text, 8) || '@example.test')
) as x(id, email);

insert into public.admin_users (user_id, role_tier, active) select admin, 'super_admin', true from _ids;
insert into public.venues (id, name, slug, city)
select existing_venue, 'Harness Hall ' || left(existing_venue::text, 6), 'harness-hall-' || left(existing_venue::text, 8), 'Mbabane'
from _ids;

-- ── owner creates a brand-new venue ────────────────────────────────────────
select pg_temp.as_user(owner) from _ids;
create temp table _created as
  select public.fn_create_venue_profile('Harness Arena ' || left((select owner::text from _ids), 6), 'Manzini',
         '1 Main St', 800, 'I am the general manager of this arena, see our website.') as r;
reset role;
grant select on _created to authenticated;

select pg_temp.expect_eq('create: creator is owner',
  format($q$select role from public.venue_members where venue_id = %L and user_id = %L$q$,
         (select (r->>'venue_id') from _created), (select owner from _ids)), 'venue_owner');
select pg_temp.expect_eq('create: venue starts unverified',
  format($q$select verification_status from public.venues where id = %L$q$, (select r->>'venue_id' from _created)), 'unverified');
select pg_temp.expect_eq('create: pending create-claim exists',
  format($q$select status from public.venue_claims where id = %L$q$, (select r->>'claim_id' from _created)), 'pending');

-- duplicate name+city must be claimed, not recreated
select pg_temp.as_user(stranger) from _ids;
select pg_temp.expect('create: duplicate venue is refused',
  format($q$select public.fn_create_venue_profile(%L, 'manzini', null, null, 'twenty characters of evidence here')$q$,
         (select 'harness arena  ' || left(owner::text, 6) from _ids)), false, 'venue_exists');
reset role;

-- anonymous sessions cannot create or claim
select pg_temp.as_user(anon_user, true) from _ids;
select pg_temp.expect('anon: cannot create venue',
  $q$select public.fn_create_venue_profile('Anon Venue', 'Mbabane', null, null, 'twenty characters of evidence here')$q$, false, 'claimed_account_required');
select pg_temp.expect('anon: cannot claim venue',
  format($q$select public.fn_submit_venue_claim(%L, 'venue_owner', 'twenty characters of evidence here')$q$, (select existing_venue from _ids)),
  false, 'claimed_account_required');
reset role;

-- ── owner manages profile and team ─────────────────────────────────────────
select pg_temp.as_user(owner) from _ids;
select pg_temp.expect('owner: update profile',
  format($q$select public.fn_update_venue_profile(%L, 'A fine arena', '1 Main St', 900, 'https://arena.example', 'hello@arena.example', '+268 7600 0000')$q$,
         (select r->>'venue_id' from _created)), true);
select pg_temp.expect('owner: bad website rejected',
  format($q$select public.fn_update_venue_profile(%L, null, null, null, 'javascript:alert(1)', null, null)$q$, (select r->>'venue_id' from _created)),
  false, 'website_invalid');
select pg_temp.expect_eq('owner: add manager by email',
  format($q$select public.fn_add_venue_member(%L, %L, 'venue_manager')$q$, (select r->>'venue_id' from _created),
         (select 'venue-manager-' || left(manager::text, 8) || '@example.test' from _ids)), 'added');
select pg_temp.expect_eq('owner: unknown email reports no_account',
  format($q$select public.fn_add_venue_member(%L, 'nobody-here@example.test', 'venue_staff')$q$, (select r->>'venue_id' from _created)), 'no_account');
select pg_temp.expect('owner: cannot remove self as owner',
  format($q$select public.fn_remove_venue_member(%L, %L)$q$, (select r->>'venue_id' from _created), (select owner from _ids)),
  false, 'owner_cannot_be_removed');
select pg_temp.expect_eq('owner: team lists 2 members',
  format($q$select count(*)::text from public.fn_venue_team(%L)$q$, (select r->>'venue_id' from _created)), '2');
reset role;

-- manager can add staff but not managers
select pg_temp.as_user(manager) from _ids;
select pg_temp.expect('manager: cannot add another manager',
  format($q$select public.fn_add_venue_member(%L, %L, 'venue_manager')$q$, (select r->>'venue_id' from _created),
         (select 'venue-stranger-' || left(stranger::text, 8) || '@example.test' from _ids)), false, 'forbidden');
select pg_temp.expect('manager: can edit profile',
  format($q$select public.fn_update_venue_profile(%L, 'Updated by manager', null, 900, null, null, null)$q$, (select r->>'venue_id' from _created)), true);
reset role;

-- ── stranger is locked out ─────────────────────────────────────────────────
select pg_temp.as_user(stranger) from _ids;
select pg_temp.expect('stranger: cannot edit profile',
  format($q$select public.fn_update_venue_profile(%L, 'hijack', null, null, null, null, null)$q$, (select r->>'venue_id' from _created)),
  false, 'forbidden');
select pg_temp.expect('stranger: cannot add members',
  format($q$select public.fn_add_venue_member(%L, 'x@example.test', 'venue_staff')$q$, (select r->>'venue_id' from _created)), false, 'forbidden');
select pg_temp.expect('stranger: cannot remove members',
  format($q$select public.fn_remove_venue_member(%L, %L)$q$, (select r->>'venue_id' from _created), (select manager from _ids)), false, 'forbidden');
select pg_temp.expect('stranger: cannot review claims',
  format($q$select public.fn_review_venue_claim(%L, true)$q$, (select r->>'claim_id' from _created)), false, 'forbidden');
select pg_temp.expect('stranger: direct insert into venue_members denied',
  format($q$insert into public.venue_members (venue_id, user_id, role) values (%L, %L, 'venue_owner')$q$,
         (select existing_venue from _ids), (select stranger from _ids)), false, 'permission denied');
select pg_temp.expect('stranger: direct venue update changes nothing',
  format($q$do $d$ begin update public.venues set name = 'pwned' where id = %L; if found then raise exception 'updated'; end if; end $d$$q$,
         (select r->>'venue_id' from _created)), true);
select pg_temp.expect_eq('stranger: sees no team rows',
  format($q$select count(*)::text from public.venue_members where venue_id = %L$q$, (select r->>'venue_id' from _created)), '0');
select pg_temp.expect_eq('stranger: sees no claims of others',
  $q$select count(*)::text from public.venue_claims$q$, '0');
select pg_temp.expect_eq('stranger: no venue context',
  format($q$select count(*)::text from public.fn_get_ticketiv_effective_roles(%L) where source = 'venue_members'$q$, (select stranger from _ids)), '0');
select pg_temp.expect_eq('stranger: cannot read owner roles',
  format($q$select count(*)::text from public.fn_get_ticketiv_effective_roles(%L)$q$, (select owner from _ids)), '0');

-- stranger files a claim on the existing venue; a second pending claim is refused
select pg_temp.expect('claim: stranger submits claim',
  format($q$select public.fn_submit_venue_claim(%L, 'venue_owner', 'I manage bookings for Harness Hall, call our office.')$q$, (select existing_venue from _ids)), true);
select pg_temp.expect('claim: duplicate pending claim refused',
  format($q$select public.fn_submit_venue_claim(%L, 'venue_owner', 'I manage bookings for Harness Hall, call our office.')$q$, (select existing_venue from _ids)),
  false, 'claim_pending');
select pg_temp.expect('claim: short evidence refused',
  format($q$select public.fn_submit_venue_claim(%L, 'venue_manager', 'trust me')$q$, (select existing_venue from _ids)), false, 'evidence_required');
select pg_temp.expect_eq('claim: claimant lists own claim with venue name',
  $q$select venue_name from public.fn_my_venue_claims() limit 1$q$, (select 'Harness Hall ' || left(existing_venue::text, 6) from _ids));
select pg_temp.expect_eq('claim: no access before approval',
  format($q$select coalesce(app.venue_role(%L), 'none')$q$, (select existing_venue from _ids)), 'none');
select pg_temp.expect_eq('search: stranger finds the hall by partial name',
  $q$select count(*)::text from public.fn_search_claimable_venues('harness hall')$q$, '1');
select pg_temp.expect_eq('search: one-letter query returns nothing',
  $q$select count(*)::text from public.fn_search_claimable_venues('h')$q$, '0');
reset role;

select pg_temp.as_user(anon_user, true) from _ids;
select pg_temp.expect('search: anonymous session refused',
  $q$select count(*) from public.fn_search_claimable_venues('harness')$q$, false, 'claimed_account_required');
reset role;

-- claimant files a competing owner claim on the same venue
select pg_temp.as_user(claimant) from _ids;
select pg_temp.expect('claim: competing claimant submits',
  format($q$select public.fn_submit_venue_claim(%L, 'venue_owner', 'I am the actual owner of Harness Hall, title deed ref 123.')$q$, (select existing_venue from _ids)), true);
reset role;

-- ── platform admin reviews ─────────────────────────────────────────────────
select pg_temp.as_user(admin) from _ids;
select pg_temp.expect('admin: approve first owner claim',
  format($q$select public.fn_review_venue_claim(%L, true, 'Verified by phone')$q$,
         (select id from public.venue_claims where venue_id = (select existing_venue from _ids) and claimant_id = (select stranger from _ids))), true);
select pg_temp.expect('admin: second owner claim is a dispute',
  format($q$select public.fn_review_venue_claim(%L, true)$q$,
         (select id from public.venue_claims where venue_id = (select existing_venue from _ids) and claimant_id = (select claimant from _ids))),
  false, 'venue_already_owned');
select pg_temp.expect('admin: dispute resolved with replace_owner',
  format($q$select public.fn_review_venue_claim(%L, true, 'Title deed checked', true)$q$,
         (select id from public.venue_claims where venue_id = (select existing_venue from _ids) and claimant_id = (select claimant from _ids))), true);
select pg_temp.expect('admin: reject the create-claim',
  format($q$select public.fn_review_venue_claim(%L, false, 'Could not verify')$q$, (select r->>'claim_id' from _created)), true);
select pg_temp.expect('admin: cannot re-review a decided claim',
  format($q$select public.fn_review_venue_claim(%L, true)$q$, (select r->>'claim_id' from _created)), false, 'claim_not_pending');
reset role;

select pg_temp.expect_eq('dispute: new owner is claimant',
  format($q$select user_id::text from public.venue_members where venue_id = %L and role = 'venue_owner'$q$, (select existing_venue from _ids)),
  (select claimant::text from _ids));
select pg_temp.expect_eq('dispute: previous owner kept as manager',
  format($q$select role from public.venue_members where venue_id = %L and user_id = %L$q$, (select existing_venue from _ids), (select stranger from _ids)),
  'venue_manager');
select pg_temp.expect_eq('approve: venue verified',
  format($q$select verification_status from public.venues where id = %L$q$, (select existing_venue from _ids)), 'verified');
select pg_temp.expect_eq('reject create: creator access removed',
  format($q$select count(*)::text from public.venue_members where venue_id = %L and user_id = %L$q$,
         (select r->>'venue_id' from _created), (select owner from _ids)), '0');
select pg_temp.expect_eq('notifications: claimants notified',
  format($q$select count(*)::text from public.notifications where type = 'venue_claim_decision' and user_id in (%L, %L, %L)$q$,
         (select owner from _ids), (select stranger from _ids), (select claimant from _ids)), '3');
select pg_temp.expect_eq('audit: claim decisions audited',
  $q$select count(*)::text from public.audit_log where table_name = 'venue_claims' and changes->>'event' in ('venue_claim_approved', 'venue_claim_rejected') and created_at >= now()$q$, '3');

-- ── effective roles surface the venue context ──────────────────────────────
select pg_temp.as_user(claimant) from _ids;
select pg_temp.expect_eq('roles: owner gets a venue context',
  format($q$select role_key from public.fn_get_ticketiv_effective_roles(%L) where source = 'venue_members'$q$, (select claimant from _ids)), 'venue_owner');
select pg_temp.expect_eq('roles: member can read own unpublished venue',
  format($q$select count(*)::text from public.venues where id = %L$q$, (select existing_venue from _ids)), '1');
reset role;

-- ── report ─────────────────────────────────────────────────────────────────
do $$
declare v_fail int; v_total int; v_out text;
begin
  select count(*) filter (where not ok), count(*),
         string_agg(format('  %s  %-48s %s', case when ok then 'PASS' else 'FAIL' end, label, detail), E'\n' order by n)
  into v_fail, v_total, v_out from _results;
  raise notice E'VENUE OWNERSHIP HARNESS\n%\n  passed=%  failed=%', v_out, v_total - v_fail, v_fail;
  if v_fail > 0 then raise exception 'venue ownership harness: % failure(s)', v_fail; end if;
end $$;

rollback;
