-- Feature flags: per-organisation / per-event exclusion harness.
--
-- Run against an ISOLATED database only (supabase db start), never live:
--   psql "$TICKETIV_CROSS_ORG_TEST_DB_URL" -X -v ON_ERROR_STOP=1 -f supabase/tests/feature_flag_exclusions.sql
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
  gen_random_uuid() as ops, gen_random_uuid() as readonly, gen_random_uuid() as stranger,
  gen_random_uuid() as org_a, gen_random_uuid() as event_1;
grant select on _ids to authenticated;

insert into auth.users (id, email, aud, role, instance_id)
select x.id, x.email, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'
from _ids i, lateral (values
  (i.ops, 'ffx-ops-' || left(i.ops::text, 8) || '@example.test'),
  (i.readonly, 'ffx-ro-' || left(i.readonly::text, 8) || '@example.test'),
  (i.stranger, 'ffx-x-' || left(i.stranger::text, 8) || '@example.test')
) as x(id, email);
insert into public.admin_users (user_id, role_tier, active)
select ops, 'event_ops_admin'::public.admin_role_tier, true from _ids
union all select readonly, 'read_only_admin'::public.admin_role_tier, true from _ids;
insert into public.organizations (id, name, slug) select org_a, 'FFX Org', 'ffx-org-' || left(org_a::text, 8) from _ids;
insert into public.events (id, org_id, title, slug) select event_1, org_a, 'FFX Night', 'ffx-night-' || left(event_1::text, 8) from _ids;
insert into public.feature_flags (key, enabled, org_id) values ('ffx_test_enabled', false, null);

-- ── switch ─────────────────────────────────────────────────────────────────
select pg_temp.as_user(readonly) from _ids;
select pg_temp.expect('switch: read-only admin refused', $q$select public.fn_admin_set_platform_flag('ffx_test_enabled', true)$q$, false, 'forbidden');
reset role;
select pg_temp.as_user(stranger) from _ids;
select pg_temp.expect('switch: ordinary user refused', $q$select public.fn_admin_set_platform_flag('ffx_test_enabled', true)$q$, false, 'forbidden');
reset role;
select pg_temp.as_user(ops) from _ids;
select pg_temp.expect('switch: unknown flag', $q$select public.fn_admin_set_platform_flag('ffx_nope', true)$q$, false, 'unknown_flag');
select pg_temp.expect('switch: ops admin switches on', $q$select public.fn_admin_set_platform_flag('ffx_test_enabled', true)$q$, true);
reset role;
select pg_temp.expect_eq('switch: flag is on', $q$select enabled::text from public.feature_flags where key='ffx_test_enabled' and org_id is null$q$, 'true');

-- ── exclusions ─────────────────────────────────────────────────────────────
select pg_temp.as_user(readonly) from _ids;
select pg_temp.expect('exclude: read-only admin refused',
  format($q$select public.fn_admin_add_flag_exclusion('ffx_test_enabled', %L)$q$, (select org_a from _ids)), false, 'forbidden');
reset role;
select pg_temp.as_user(ops) from _ids;
select pg_temp.expect('exclude: needs exactly one target',
  format($q$select public.fn_admin_add_flag_exclusion('ffx_test_enabled', %L, %L)$q$, (select org_a from _ids), (select event_1 from _ids)), false, 'choose_one_target');
select pg_temp.expect('exclude: no target refused', $q$select public.fn_admin_add_flag_exclusion('ffx_test_enabled')$q$, false, 'choose_one_target');
select pg_temp.expect('exclude: unknown flag', format($q$select public.fn_admin_add_flag_exclusion('ffx_nope', %L)$q$, (select org_a from _ids)), false, 'unknown_flag');
select pg_temp.expect('exclude: unknown org', format($q$select public.fn_admin_add_flag_exclusion('ffx_test_enabled', %L)$q$, gen_random_uuid()), false, 'unknown_organisation');
select pg_temp.expect('exclude: unknown event', format($q$select public.fn_admin_add_flag_exclusion('ffx_test_enabled', null, %L)$q$, gen_random_uuid()), false, 'unknown_event');
select pg_temp.expect('exclude: organisation', format($q$select public.fn_admin_add_flag_exclusion('ffx_test_enabled', %L, null, 'asked')$q$, (select org_a from _ids)), true);
select pg_temp.expect('exclude: event', format($q$select public.fn_admin_add_flag_exclusion('ffx_test_enabled', null, %L)$q$, (select event_1 from _ids)), true);
select pg_temp.expect('exclude: duplicate refused', format($q$select public.fn_admin_add_flag_exclusion('ffx_test_enabled', null, %L)$q$, (select event_1 from _ids)), false, 'already_excluded');
select pg_temp.expect('exclude: table not readable by admins directly', $q$select count(*) from public.feature_flag_exclusions$q$, false, 'permission denied');
reset role;
select pg_temp.expect_eq('exclude: two rows', $q$select count(*)::text from public.feature_flag_exclusions where flag_key='ffx_test_enabled'$q$, '2');

create temp table _ex as select id from public.feature_flag_exclusions where event_id = (select event_1 from _ids);
grant select on _ex to authenticated;
select pg_temp.as_user(ops) from _ids;
select pg_temp.expect('remove: event exclusion', format($q$select public.fn_admin_remove_flag_exclusion(%L)$q$, (select id from _ex)), true);
select pg_temp.expect('remove: twice is not_found', format($q$select public.fn_admin_remove_flag_exclusion(%L)$q$, (select id from _ex)), false, 'not_found');
reset role;
select pg_temp.expect_eq('remove: one row left', $q$select count(*)::text from public.feature_flag_exclusions where flag_key='ffx_test_enabled'$q$, '1');

-- deleting an event removes its exclusions (organisations are kept by the audit log FK)
select pg_temp.as_user(ops) from _ids;
select pg_temp.expect('exclude: event again', format($q$select public.fn_admin_add_flag_exclusion('ffx_test_enabled', null, %L)$q$, (select event_1 from _ids)), true);
reset role;
delete from public.events where id = (select event_1 from _ids);
select pg_temp.expect_eq('cascade: event delete clears its exclusion', $q$select count(*)::text from public.feature_flag_exclusions where flag_key='ffx_test_enabled'$q$, '1');

select pg_temp.expect_eq('audit: five rows written',
  $q$select count(*)::text from public.audit_log where changes->>'key' = 'ffx_test_enabled'$q$, '5');
select pg_temp.expect_eq('grants: anon cannot call',
  $q$select has_function_privilege('anon', 'public.fn_admin_add_flag_exclusion(text,uuid,uuid,text)', 'execute')::text$q$, 'false');

-- ── report ─────────────────────────────────────────────────────────────────
do $$
declare v_fail int; v_total int; v_out text;
begin
  select count(*) filter (where not ok), count(*),
         string_agg(format('  %s  %-48s %s', case when ok then 'PASS' else 'FAIL' end, label, detail), E'\n' order by n)
  into v_fail, v_total, v_out from _results;
  raise notice E'FEATURE FLAG EXCLUSIONS HARNESS\n%\n  passed=%  failed=%', v_out, v_total - v_fail, v_fail;
  if v_fail > 0 then raise exception 'feature flag exclusions harness: % failure(s)', v_fail; end if;
end $$;

rollback;
