-- Command centre: create organisers / events and assign event admins.
--
-- Run against an ISOLATED database only (supabase db start), never live:
--   psql "$TICKETIV_CROSS_ORG_TEST_DB_URL" -X -v ON_ERROR_STOP=1 -f supabase/tests/admin_create_org_event.sql
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
  gen_random_uuid() as owner_admin, gen_random_uuid() as support, gen_random_uuid() as promoter,
  gen_random_uuid() as runner, gen_random_uuid() as stranger;
grant select on _ids to authenticated;

insert into auth.users (id, email, aud, role, instance_id)
select x.id, x.email, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'
from _ids i, lateral (values
  (i.owner_admin, 'aco-own-' || left(i.owner_admin::text, 8) || '@example.test'),
  (i.support, 'aco-sup-' || left(i.support::text, 8) || '@example.test'),
  (i.promoter, 'aco-pro-' || left(i.promoter::text, 8) || '@example.test'),
  (i.runner, 'aco-run-' || left(i.runner::text, 8) || '@example.test'),
  (i.stranger, 'aco-x-' || left(i.stranger::text, 8) || '@example.test')
) as x(id, email);
insert into public.admin_users (user_id, role_tier, active)
select owner_admin, 'super_admin'::public.admin_role_tier, true from _ids union all
select support, 'support_admin'::public.admin_role_tier, true from _ids;

-- ── organisation ───────────────────────────────────────────────────────────
select pg_temp.as_user(support) from _ids;
select pg_temp.expect('org: support admin refused', format($q$select public.fn_admin_create_organization('ACO Live', %L, 'onboarding call')$q$, (select promoter from _ids)), false, 'forbidden');
reset role;
select pg_temp.as_user(promoter) from _ids;
select pg_temp.expect('org: ordinary user refused', format($q$select public.fn_admin_create_organization('ACO Live', %L, 'onboarding call')$q$, (select promoter from _ids)), false, 'forbidden');
reset role;
select pg_temp.as_user(owner_admin) from _ids;
select pg_temp.expect('org: note required', format($q$select public.fn_admin_create_organization('ACO Live', %L, 'x')$q$, (select promoter from _ids)), false, 'note_required');
select pg_temp.expect('org: name required', format($q$select public.fn_admin_create_organization(' ', %L, 'onboarding call')$q$, (select promoter from _ids)), false, 'name_required');
select pg_temp.expect('org: unknown owner refused', format($q$select public.fn_admin_create_organization('ACO Live', %L, 'onboarding call')$q$, gen_random_uuid()), false, 'user_not_found');
create temp table _org as select (public.fn_admin_create_organization('ACO Live ' || left((select promoter::text from _ids), 6), (select promoter from _ids), 'onboarding call')->>'id')::uuid as id;
reset role;
grant select on _org to authenticated;
select pg_temp.expect_eq('org: promoter is owner', $q$select role::text from public.org_members where org_id = (select id from _org) and user_id = (select promoter from _ids)$q$, 'organizer_owner');
select pg_temp.expect_eq('org: calling admin not made a member', $q$select count(*)::text from public.org_members where org_id = (select id from _org) and user_id = (select owner_admin from _ids)$q$, '0');

-- ── event ──────────────────────────────────────────────────────────────────
select pg_temp.as_user(support) from _ids;
select pg_temp.expect('event: support admin refused', format($q$select public.fn_admin_create_event(%L, 'ACO Night', 'setting up')$q$, (select id from _org)), false, 'forbidden');
reset role;
select pg_temp.as_user(owner_admin) from _ids;
select pg_temp.expect('event: unknown organiser', format($q$select public.fn_admin_create_event(%L, 'ACO Night', 'setting up')$q$, gen_random_uuid()), false, 'organisation_not_found');
select pg_temp.expect('event: title required', format($q$select public.fn_admin_create_event(%L, '  ', 'setting up')$q$, (select id from _org)), false, 'title_required');
create temp table _ev as select public.fn_admin_create_event((select id from _org), 'ACO Night', 'setting up', (select runner from _ids)) as id;
create temp table _ev2 as select public.fn_admin_create_event((select id from _org), 'ACO Matinee', 'setting up') as id;
reset role;
grant select on _ev, _ev2 to authenticated;
select pg_temp.expect_eq('event: draft and private', $q$select status::text || '/' || visibility from public.events where id = (select id from _ev)$q$, 'draft/private');
select pg_temp.expect_eq('event: runner is event admin', $q$select role::text from public.event_staff where event_id = (select id from _ev) and user_id = (select runner from _ids) and active$q$, 'organizer_admin');
select pg_temp.expect_eq('event: runner joined the org as door staff only', $q$select role::text from public.org_members where org_id = (select id from _org) and user_id = (select runner from _ids)$q$, 'organizer_staff');
select pg_temp.expect_eq('event: no admin on the second event', $q$select count(*)::text from public.event_staff where event_id = (select id from _ev2)$q$, '0');
select pg_temp.expect_eq('event: calling admin not made staff', $q$select count(*)::text from public.event_staff where user_id = (select owner_admin from _ids)$q$, '0');

-- ── assign later ───────────────────────────────────────────────────────────
select pg_temp.as_user(support) from _ids;
select pg_temp.expect('assign: support admin refused', format($q$select public.fn_admin_assign_event_admin(%L, %L, 'runs the matinee')$q$, (select id from _ev2), (select runner from _ids)), false, 'forbidden');
reset role;
select pg_temp.as_user(owner_admin) from _ids;
select pg_temp.expect('assign: note required', format($q$select public.fn_admin_assign_event_admin(%L, %L, '')$q$, (select id from _ev2), (select runner from _ids)), false, 'note_required');
select pg_temp.expect('assign: unknown event', format($q$select public.fn_admin_assign_event_admin(%L, %L, 'runs the matinee')$q$, gen_random_uuid(), (select runner from _ids)), false, 'event_not_found');
select pg_temp.expect('assign: existing member', format($q$select public.fn_admin_assign_event_admin(%L, %L, 'runs the matinee')$q$, (select id from _ev2), (select runner from _ids)), true);
select pg_temp.expect('assign: new person', format($q$select public.fn_admin_assign_event_admin(%L, %L, 'helps run it')$q$, (select id from _ev2), (select stranger from _ids)), true);
select pg_temp.expect('assign: twice is fine', format($q$select public.fn_admin_assign_event_admin(%L, %L, 'helps run it')$q$, (select id from _ev2), (select stranger from _ids)), true);
reset role;
select pg_temp.expect_eq('assign: two admins on the matinee', $q$select count(*)::text from public.event_staff where event_id = (select id from _ev2) and role = 'organizer_admin'$q$, '2');
select pg_temp.expect_eq('assign: owner keeps owner role', $q$select role::text from public.org_members where org_id = (select id from _org) and user_id = (select promoter from _ids)$q$, 'organizer_owner');

select pg_temp.expect_eq('audit: every change logged',
  $q$select count(*)::text from public.audit_log where changes->>'business_action' in ('admin_create_organization','admin_create_event','admin_assign_event_admin') and org_id = (select id from _org)$q$, '6');
select pg_temp.expect_eq('grants: anon cannot call', $q$select has_function_privilege('anon', 'public.fn_admin_create_event(uuid,text,text,uuid)', 'execute')::text$q$, 'false');
select pg_temp.expect_eq('grants: helper not callable by users', $q$select has_function_privilege('authenticated', 'app.admin_grant_event_admin(uuid,uuid)', 'execute')::text$q$, 'false');

-- ── report ─────────────────────────────────────────────────────────────────
do $$
declare v_fail int; v_total int; v_out text;
begin
  select count(*) filter (where not ok), count(*),
         string_agg(format('  %s  %-52s %s', case when ok then 'PASS' else 'FAIL' end, label, detail), E'\n' order by n)
  into v_fail, v_total, v_out from _results;
  raise notice E'ADMIN CREATE ORG/EVENT HARNESS\n%\n  passed=%  failed=%', v_out, v_total - v_fail, v_fail;
  if v_fail > 0 then raise exception 'admin create org/event harness: % failure(s)', v_fail; end if;
end $$;

rollback;
