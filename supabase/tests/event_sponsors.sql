-- Event sponsors harness: shared sponsor directory + event sponsor list.
--
-- Run against an ISOLATED database only (supabase db start), never live:
--   psql "$TICKETIV_CROSS_ORG_TEST_DB_URL" -X -v ON_ERROR_STOP=1 -f supabase/tests/event_sponsors.sql
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
  gen_random_uuid() as owner_a, gen_random_uuid() as staff_a, gen_random_uuid() as owner_b, gen_random_uuid() as stranger,
  gen_random_uuid() as org_a, gen_random_uuid() as org_b, gen_random_uuid() as event_a, gen_random_uuid() as event_b;
grant select on _ids to authenticated, anon;

insert into auth.users (id, email, aud, role, instance_id)
select x.id, x.email, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'
from _ids i, lateral (values
  (i.owner_a, 'sp-oa-' || left(i.owner_a::text, 8) || '@example.test'),
  (i.staff_a, 'sp-sa-' || left(i.staff_a::text, 8) || '@example.test'),
  (i.owner_b, 'sp-ob-' || left(i.owner_b::text, 8) || '@example.test'),
  (i.stranger, 'sp-x-' || left(i.stranger::text, 8) || '@example.test')
) as x(id, email);
insert into public.organizations (id, name, slug)
select org_a, 'SP Org A', 'sp-a-' || left(org_a::text, 8) from _ids union all
select org_b, 'SP Org B', 'sp-b-' || left(org_b::text, 8) from _ids;
insert into public.org_members (org_id, user_id, role)
select org_a, owner_a, 'organizer_owner'::public.app_role from _ids union all
select org_a, staff_a, 'organizer_staff'::public.app_role from _ids union all
select org_b, owner_b, 'organizer_owner'::public.app_role from _ids;
insert into public.events (id, org_id, title, slug) select event_a, org_a, 'SP Night', 'sp-night-' || left(event_a::text, 8) from _ids;
insert into public.events (id, org_id, title, slug) select event_b, org_b, 'SP Other', 'sp-other-' || left(event_b::text, 8) from _ids;

-- ── shared directory ───────────────────────────────────────────────────────
insert into public.admin_users (user_id, role_tier, active)
select stranger, 'support_admin'::public.admin_role_tier, true from _ids;

select pg_temp.as_user(staff_a) from _ids;
select pg_temp.expect('save: organiser staff refused', format($q$select public.fn_save_sponsor(%L, 'MTN')$q$, (select org_a from _ids)), false, 'forbidden');
reset role;
select pg_temp.as_user(owner_b) from _ids;
select pg_temp.expect('save: must manage the org named', format($q$select public.fn_save_sponsor(%L, 'MTN')$q$, (select org_a from _ids)), false, 'forbidden');
reset role;
select pg_temp.as_user(owner_a) from _ids;
select pg_temp.expect('save: name required', format($q$select public.fn_save_sponsor(%L, '  ')$q$, (select org_a from _ids)), false, 'name_required');
select pg_temp.expect('save: logo must be https', format($q$select public.fn_save_sponsor(%L, 'MTN', 'http://x/logo.png')$q$, (select org_a from _ids)), false, 'logo_invalid');
select pg_temp.expect('save: website checked', format($q$select public.fn_save_sponsor(%L, 'MTN', null, 'not a site')$q$, (select org_a from _ids)), false, 'website_invalid');
create temp table _s1 as select public.fn_save_sponsor((select org_a from _ids), 'MTN  Eswatini', null, 'mtn.co.sz') as id;
create temp table _s3 as select public.fn_save_sponsor((select org_a from _ids), 'Eswatini Beverages') as id;
reset role;
grant select on _s1, _s3 to authenticated, anon;

-- another organiser finds the same sponsor by name, and may fill in the missing logo
select pg_temp.as_user(owner_b) from _ids;
create temp table _s2 as select public.fn_save_sponsor((select org_b from _ids), 'mtn eswatini', 'https://cdn.example/mtn.png', 'https://other.example') as id;
reset role;
grant select on _s2 to authenticated, anon;
select pg_temp.expect_eq('shared: same name from another org is the same sponsor', $q$select ((select id from _s1) = (select id from _s2))::text$q$, 'true');
select pg_temp.expect_eq('shared: missing logo filled in', $q$select logo_url from public.sponsors where id = (select id from _s1)$q$, 'https://cdn.example/mtn.png');
select pg_temp.expect_eq('shared: existing website kept', $q$select website_url from public.sponsors where id = (select id from _s1)$q$, 'https://mtn.co.sz');

-- an organiser can't replace a logo that is already set
select pg_temp.as_user(owner_a) from _ids;
select pg_temp.expect('organiser: by id, no error', format($q$select public.fn_save_sponsor(%L, null, 'https://cdn.example/other.png', null, %L)$q$, (select org_a from _ids), (select id from _s1)), true);
reset role;
select pg_temp.expect_eq('organiser: logo unchanged', $q$select logo_url from public.sponsors where id = (select id from _s1)$q$, 'https://cdn.example/mtn.png');

-- only the super admin edits
select pg_temp.as_user(owner_a) from _ids;
select pg_temp.expect('admin edit: organiser refused', format($q$select public.fn_admin_update_sponsor(%L, 'MTN', 'https://cdn.example/new.png')$q$, (select id from _s1)), false, 'forbidden');
reset role;
select pg_temp.as_user(stranger) from _ids;
select pg_temp.expect('admin edit: support admin refused', format($q$select public.fn_admin_update_sponsor(%L, 'MTN', 'https://cdn.example/new.png')$q$, (select id from _s1)), false, 'forbidden');
reset role;
insert into public.admin_users (user_id, role_tier, active) select owner_b, 'super_admin'::public.admin_role_tier, true from _ids
on conflict (user_id) do update set role_tier = 'super_admin', active = true;
select pg_temp.as_user(owner_b) from _ids;
select pg_temp.expect('admin edit: super admin renames and changes the logo', format($q$select public.fn_admin_update_sponsor(%L, 'MTN', 'https://cdn.example/new.png', 'mtn.co.sz')$q$, (select id from _s1)), true);
select pg_temp.expect('admin edit: rename onto another sponsor refused', format($q$select public.fn_admin_update_sponsor(%L, 'Eswatini Beverages')$q$, (select id from _s1)), false, 'sponsor_exists');
reset role;
select pg_temp.expect_eq('admin edit: saved', $q$select name || '|' || logo_url from public.sponsors where id = (select id from _s1)$q$, 'MTN|https://cdn.example/new.png');
select pg_temp.as_user(owner_b) from _ids;
select pg_temp.expect('admin edit: remove the logo', format($q$select public.fn_admin_update_sponsor(%L, 'MTN', null, 'mtn.co.sz', true)$q$, (select id from _s1)), true);
reset role;
select pg_temp.expect_eq('admin edit: logo removed', $q$select coalesce(logo_url, 'none') from public.sponsors where id = (select id from _s1)$q$, 'none');
select pg_temp.expect_eq('admin edit: audited', $q$select count(*)::text from public.audit_log where table_name = 'sponsors' and record_id = (select id::text from _s1)$q$, '2');
delete from public.admin_users where user_id = (select owner_b from _ids);

select pg_temp.as_user(owner_a) from _ids;
select pg_temp.expect('tables: not readable directly', $q$select count(*) from public.sponsors$q$, false, 'permission denied');
reset role;

-- ── event list ─────────────────────────────────────────────────────────────
select pg_temp.as_user(owner_b) from _ids;
select pg_temp.expect('set: other org refused',
  format($q$select public.fn_event_set_sponsors(%L, '[]'::jsonb)$q$, (select event_a from _ids)), false, 'forbidden');
reset role;
select pg_temp.as_user(owner_a) from _ids;
select pg_temp.expect('set: unknown sponsor refused',
  format($q$select public.fn_event_set_sponsors(%L, jsonb_build_array(jsonb_build_object('sponsor_id', %L)))$q$, (select event_a from _ids), gen_random_uuid()), false, 'not_found');
select pg_temp.expect('set: duplicates refused',
  format($q$select public.fn_event_set_sponsors(%L, jsonb_build_array(jsonb_build_object('sponsor_id', %L), jsonb_build_object('sponsor_id', %L)))$q$, (select event_a from _ids), (select id from _s1), (select id from _s1)), false, 'sponsors_invalid');
select pg_temp.expect('set: bad shape refused', format($q$select public.fn_event_set_sponsors(%L, '{"a":1}'::jsonb)$q$, (select event_a from _ids)), false, 'sponsors_invalid');
select pg_temp.expect('set: two sponsors, second featured',
  format($q$select public.fn_event_set_sponsors(%L, jsonb_build_array(jsonb_build_object('sponsor_id', %L, 'featured', false), jsonb_build_object('sponsor_id', %L, 'featured', true)))$q$,
         (select event_a from _ids), (select id from _s3), (select id from _s1)), true);
reset role;
select pg_temp.expect_eq('set: order kept', $q$select string_agg(s.name, ',' order by es.sort_order) from public.event_sponsors es join public.sponsors s on s.id = es.sponsor_id where es.event_id = (select event_a from _ids)$q$, 'Eswatini Beverages,MTN');
select pg_temp.expect_eq('set: featured flag kept', $q$select string_agg(s.name, ',') from public.event_sponsors es join public.sponsors s on s.id = es.sponsor_id where es.event_id = (select event_a from _ids) and es.featured$q$, 'MTN');

select pg_temp.expect_eq('public: hidden while the event is not public',
  $q$select count(*)::text from public.fn_public_event_sponsors((select event_a from _ids))$q$, '0');
update public.events
   set venue_id = public.fn_get_or_create_venue('SP Hall ' || left((select event_a::text from _ids), 6), 'Mbabane', null, 'Africa/Mbabane', null),
       starts_at = now() + interval '7 days', ends_at = now() + interval '7 days 4 hours',
       status = 'published', visibility = 'public'
 where id = (select event_a from _ids);
select pg_temp.expect_eq('public: published event shows featured first',
  $q$select string_agg(name || ':' || featured, ',') from public.fn_public_event_sponsors((select event_a from _ids))$q$, 'MTN:true,Eswatini Beverages:false');
select pg_temp.expect_eq('public: anon may call', $q$select has_function_privilege('anon', 'public.fn_public_event_sponsors(uuid)', 'execute')::text$q$, 'true');
select pg_temp.expect_eq('grants: anon cannot write', $q$select has_function_privilege('anon', 'public.fn_event_set_sponsors(uuid,jsonb)', 'execute')::text$q$, 'false');

select pg_temp.as_user(owner_a) from _ids;
select pg_temp.expect('set: empty list clears', format($q$select public.fn_event_set_sponsors(%L, '[]'::jsonb)$q$, (select event_a from _ids)), true);
reset role;
select pg_temp.expect_eq('set: cleared', $q$select count(*)::text from public.event_sponsors where event_id = (select event_a from _ids)$q$, '0');
select pg_temp.expect_eq('directory: kept after clearing the event', $q$select count(*)::text from public.sponsors where id in ((select id from _s1), (select id from _s3))$q$, '2');

-- ── report ─────────────────────────────────────────────────────────────────
do $$
declare v_fail int; v_total int; v_out text;
begin
  select count(*) filter (where not ok), count(*),
         string_agg(format('  %s  %-52s %s', case when ok then 'PASS' else 'FAIL' end, label, detail), E'\n' order by n)
  into v_fail, v_total, v_out from _results;
  raise notice E'EVENT SPONSORS HARNESS\n%\n  passed=%  failed=%', v_out, v_total - v_fail, v_fail;
  if v_fail > 0 then raise exception 'event sponsors harness: % failure(s)', v_fail; end if;
end $$;

rollback;
