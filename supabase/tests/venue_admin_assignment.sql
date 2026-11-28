-- Venue MVP: command-centre venue admin assignment harness.
--
-- Run against an ISOLATED database only (supabase db start), never live:
--   psql "$TICKETIV_CROSS_ORG_TEST_DB_URL" -X -v ON_ERROR_STOP=1 -f supabase/tests/venue_admin_assignment.sql
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
  gen_random_uuid() as owner_admin, gen_random_uuid() as support, gen_random_uuid() as person,
  gen_random_uuid() as other, gen_random_uuid() as stranger;
grant select on _ids to authenticated;

insert into auth.users (id, email, aud, role, instance_id)
select x.id, x.email, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'
from _ids i, lateral (values
  (i.owner_admin, 'vaa-owner-' || left(i.owner_admin::text, 8) || '@example.test'),
  (i.support, 'vaa-support-' || left(i.support::text, 8) || '@example.test'),
  (i.person, 'vaa-person-' || left(i.person::text, 8) || '@example.test'),
  (i.other, 'vaa-other-' || left(i.other::text, 8) || '@example.test'),
  (i.stranger, 'vaa-stranger-' || left(i.stranger::text, 8) || '@example.test')
) as x(id, email);
insert into public.admin_users (user_id, role_tier, active)
select owner_admin, 'super_admin'::public.admin_role_tier, true from _ids union all select support, 'support_admin'::public.admin_role_tier, true from _ids;

-- ── create ─────────────────────────────────────────────────────────────────
select pg_temp.as_user(support) from _ids;
select pg_temp.expect('create: support admin is refused',
  $q$select public.fn_admin_create_venue('VAA Hall', 'Mbabane')$q$, false, 'forbidden');
reset role;
select pg_temp.as_user(stranger) from _ids;
select pg_temp.expect('create: ordinary user is refused',
  $q$select public.fn_admin_create_venue('VAA Hall', 'Mbabane')$q$, false, 'forbidden');
reset role;

select pg_temp.as_user(owner_admin) from _ids;
create temp table _v as select public.fn_admin_create_venue('VAA Hall ' || left((select person::text from _ids), 6), 'Mbabane', '1 Road', 500) as id;
select pg_temp.expect('create: duplicate name+city refused',
  format($q$select public.fn_admin_create_venue(%L, 'mbabane')$q$, (select 'vaa hall ' || left(person::text, 6) from _ids)), false, 'venue_exists');
select pg_temp.expect('create: capacity checked',
  $q$select public.fn_admin_create_venue('VAA Big', 'Mbabane', null, 0)$q$, false, 'capacity_invalid');
reset role;
grant select on _v to authenticated;
select pg_temp.expect_eq('create: no members yet',
  format($q$select count(*)::text from public.venue_members where venue_id = %L$q$, (select id from _v)), '0');

-- ── assign ─────────────────────────────────────────────────────────────────
select pg_temp.as_user(support) from _ids;
select pg_temp.expect('assign: support admin is refused',
  format($q$select public.fn_admin_assign_venue_member(%L, %L, 'venue_owner', 'onboarding call')$q$, (select id from _v), (select person from _ids)), false, 'forbidden');
reset role;

select pg_temp.as_user(owner_admin) from _ids;
select pg_temp.expect('assign: note required',
  format($q$select public.fn_admin_assign_venue_member(%L, %L, 'venue_owner', '')$q$, (select id from _v), (select person from _ids)), false, 'note_required');
select pg_temp.expect('assign: role validated',
  format($q$select public.fn_admin_assign_venue_member(%L, %L, 'organizer_owner', 'onboarding call')$q$, (select id from _v), (select person from _ids)), false, 'role_invalid');
select pg_temp.expect('assign: unknown user refused',
  format($q$select public.fn_admin_assign_venue_member(%L, %L, 'venue_owner', 'onboarding call')$q$, (select id from _v), gen_random_uuid()), false, 'user_not_found');
select pg_temp.expect('assign: owner with verify',
  format($q$select public.fn_admin_assign_venue_member(%L, %L, 'venue_owner', 'onboarding call', true)$q$, (select id from _v), (select person from _ids)), true);
reset role;
select pg_temp.expect_eq('assign: person is owner',
  format($q$select role from public.venue_members where venue_id = %L and user_id = %L$q$, (select id from _v), (select person from _ids)), 'venue_owner');
select pg_temp.expect_eq('assign: venue verified',
  format($q$select verification_status from public.venues where id = %L$q$, (select id from _v)), 'verified');
select pg_temp.expect_eq('assign: person notified',
  format($q$select count(*)::text from public.notifications where user_id = %L and payload->>'venueId' = %L$q$, (select person from _ids), (select id from _v)), '1');

-- the new owner sees the workspace
select pg_temp.as_user(person) from _ids;
select pg_temp.expect_eq('assign: owner gets venue role',
  format($q$select role_key from public.fn_get_ticketiv_effective_roles(%L) where source = 'venue_members'$q$, (select person from _ids)), 'venue_owner');
reset role;

-- replacing the owner keeps the previous one as manager
select pg_temp.as_user(owner_admin) from _ids;
select pg_temp.expect('assign: second owner',
  format($q$select public.fn_admin_assign_venue_member(%L, %L, 'venue_owner', 'ownership changed hands')$q$, (select id from _v), (select other from _ids)), true);
reset role;
select pg_temp.expect_eq('assign: previous owner demoted to manager',
  format($q$select role from public.venue_members where venue_id = %L and user_id = %L$q$, (select id from _v), (select person from _ids)), 'venue_manager');
select pg_temp.expect_eq('assign: still exactly one owner',
  format($q$select count(*)::text from public.venue_members where venue_id = %L and role = 'venue_owner'$q$, (select id from _v)), '1');

-- ── remove ─────────────────────────────────────────────────────────────────
select pg_temp.as_user(stranger) from _ids;
select pg_temp.expect('remove: ordinary user refused',
  format($q$select public.fn_admin_remove_venue_member(%L, %L, 'left the company')$q$, (select id from _v), (select person from _ids)), false, 'forbidden');
reset role;
select pg_temp.as_user(owner_admin) from _ids;
select pg_temp.expect('remove: owner admin removes manager',
  format($q$select public.fn_admin_remove_venue_member(%L, %L, 'left the company')$q$, (select id from _v), (select person from _ids)), true);
select pg_temp.expect('remove: non-member reported',
  format($q$select public.fn_admin_remove_venue_member(%L, %L, 'left the company')$q$, (select id from _v), (select stranger from _ids)), false, 'not_a_member');
reset role;
select pg_temp.expect_eq('remove: membership gone',
  format($q$select count(*)::text from public.venue_members where venue_id = %L and user_id = %L$q$, (select id from _v), (select person from _ids)), '0');

select pg_temp.expect_eq('audit: create, 2 assigns, remove',
  format($q$select count(*)::text from public.audit_log where changes->>'event' in ('venue_created_by_admin','venue_member_assigned_by_admin','venue_member_removed_by_admin') and (record_id = %L or record_id like %L)$q$,
         (select id::text from _v), (select id::text from _v) || ':%'), '4');

-- ── report ─────────────────────────────────────────────────────────────────
do $$
declare v_fail int; v_total int; v_out text;
begin
  select count(*) filter (where not ok), count(*),
         string_agg(format('  %s  %-48s %s', case when ok then 'PASS' else 'FAIL' end, label, detail), E'\n' order by n)
  into v_fail, v_total, v_out from _results;
  raise notice E'VENUE ADMIN ASSIGNMENT HARNESS\n%\n  passed=%  failed=%', v_out, v_total - v_fail, v_fail;
  if v_fail > 0 then raise exception 'venue admin assignment harness: % failure(s)', v_fail; end if;
end $$;

rollback;
