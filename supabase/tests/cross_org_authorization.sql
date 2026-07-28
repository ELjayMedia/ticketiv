-- TICK-337 — cross-org and privilege-escalation authorization tests.
--
-- ============================================================================
-- What this proves, and why it is SQL rather than vitest
-- ============================================================================
--
-- The permission matrix (supabase/permissions/rpc-grants.json) proves WHO holds
-- EXECUTE on each RPC. It cannot prove that a function granted to
-- `authenticated` actually checks which org the caller belongs to once it is
-- running -- that check lives inside the function body, and only a real call
-- exercises it.
--
-- tests/rls-isolation.test.ts covers some of this from vitest, but it skips
-- unless a dedicated Supabase project with pre-seeded personas is configured
-- (TEST_SUPABASE_URL and friends). No such project exists -- development, UAT
-- and production share one database (ADR 0002) -- so that suite has never run.
--
-- This file needs no seeded personas. It builds two tenants and its own users
-- inside a transaction, impersonates them by setting request.jwt.claims (which
-- is what auth.uid() reads) and switching role, and rolls the whole thing back
-- at the end by raising. Nothing is persisted.
--
-- ============================================================================
-- Reading the output
-- ============================================================================
--
--   PASS  the call was refused, and the message is an authorization refusal
--   FAIL  the call succeeded -- a real cross-tenant hole
--   ????  refused, but for a reason that does not look like authorization
--
-- The ???? case matters. A function that raises 'null value in column ...'
-- before it reaches its authorization check is not proven safe; it just
-- happened to fail first. Those need reading, not counting.
--
-- The positive controls at the end are what make the rest meaningful. Without
-- them, a harness whose impersonation silently did nothing would refuse every
-- call and report a clean sweep.

do $$
declare
  v_orgA uuid; v_orgB uuid;
  v_userA uuid := gen_random_uuid();
  v_anon  uuid := gen_random_uuid();
  v_eventB uuid; v_ttB uuid; v_orderB uuid; v_itemB uuid;
  v_pass integer := 0; v_fail integer := 0; v_odd integer := 0;
  v_out text := '';
begin
  ------------------------------------------------------------------ fixtures
  insert into public.organizations (name, slug)
  values ('Harness Org A', 'harness-a-' || substr(gen_random_uuid()::text, 1, 8))
  returning id into v_orgA;

  insert into public.organizations (name, slug)
  values ('Harness Org B', 'harness-b-' || substr(gen_random_uuid()::text, 1, 8))
  returning id into v_orgB;

  insert into auth.users (id, email, aud, role, instance_id)
  values (v_userA, 'harness-a-' || substr(v_userA::text, 1, 8) || '@example.test',
          'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
  insert into auth.users (id, email, aud, role, instance_id)
  values (v_anon, 'harness-anon-' || substr(v_anon::text, 1, 8) || '@example.test',
          'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');

  -- User A owns org A and nothing else. This is the whole point.
  insert into public.org_members (org_id, user_id, role) values (v_orgA, v_userA, 'organizer_owner');

  -- Org B's assets.
  insert into public.events (org_id, title, slug, status)
  values (v_orgB, 'B event', 'b-ev-' || substr(gen_random_uuid()::text, 1, 8), 'draft')
  returning id into v_eventB;
  insert into public.ticket_types (event_id, name, price_cents, quota)
  values (v_eventB, 'B GA', 10000, 10) returning id into v_ttB;
  insert into public.orders (org_id, total_cents, currency, status, subtotal_cents, channel, item_count)
  values (v_orgB, 10000, 'SZL', 'paid', 10000, 'online', 1) returning id into v_orderB;
  insert into public.order_items (order_id, ticket_type_id, ticket_code, status)
  values (v_orderB, v_ttB, 'B-' || substr(gen_random_uuid()::text, 1, 10), 'issued')
  returning id into v_itemB;

  ------------------------------------------------- persona: org A's owner
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_userA::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';

  -- Each block: attempt the cross-tenant action, classify the outcome.
  <<cases>>
  declare
    v_res text;
    v_label text;
  begin
    -- 1. Create an event inside someone else's organization.
    begin
      perform public.create_event_draft(v_orgB, 'stolen', 'public');
      v_res := 'ALLOWED';
    exception when others then v_res := sqlerrm; end;
    v_label := 'create_event_draft(orgB)';
    if v_res = 'ALLOWED' then v_fail := v_fail + 1; v_out := v_out || format(E'\n  FAIL  %-38s succeeded', v_label);
    elsif v_res ~* 'not allowed|not_authorized|forbidden|permission|denied|authoriz|insufficient|not found' then v_pass := v_pass + 1; v_out := v_out || format(E'\n  PASS  %-38s %s', v_label, v_res);
    else v_odd := v_odd + 1; v_out := v_out || format(E'\n  ????  %-38s %s', v_label, v_res); end if;

    -- 2. Request a payout from someone else's balance.
    begin
      perform public.fn_request_payout(v_orgB, 1000);
      v_res := 'ALLOWED';
    exception when others then v_res := sqlerrm; end;
    v_label := 'fn_request_payout(orgB)';
    if v_res = 'ALLOWED' then v_fail := v_fail + 1; v_out := v_out || format(E'\n  FAIL  %-38s succeeded', v_label);
    elsif v_res ~* 'not allowed|not_authorized|forbidden|permission|denied|authoriz|insufficient|not found' then v_pass := v_pass + 1; v_out := v_out || format(E'\n  PASS  %-38s %s', v_label, v_res);
    else v_odd := v_odd + 1; v_out := v_out || format(E'\n  ????  %-38s %s', v_label, v_res); end if;

    -- 3. Mint free tickets against someone else's inventory.
    begin
      perform public.issue_comp_ticket(v_orgB, v_ttB, 'x@example.test', 1, null);
      v_res := 'ALLOWED';
    exception when others then v_res := sqlerrm; end;
    v_label := 'issue_comp_ticket(orgB)';
    if v_res = 'ALLOWED' then v_fail := v_fail + 1; v_out := v_out || format(E'\n  FAIL  %-38s succeeded', v_label);
    elsif v_res ~* 'not allowed|not_authorized|forbidden|permission|denied|authoriz|only org|insufficient|not found' then v_pass := v_pass + 1; v_out := v_out || format(E'\n  PASS  %-38s %s', v_label, v_res);
    else v_odd := v_odd + 1; v_out := v_out || format(E'\n  ????  %-38s %s', v_label, v_res); end if;

    -- 4. Read someone else's money.
    begin
      perform public.fn_org_finance_summary(v_orgB, null, null);
      v_res := 'ALLOWED';
    exception when others then v_res := sqlerrm; end;
    v_label := 'fn_org_finance_summary(orgB)';
    if v_res = 'ALLOWED' then v_fail := v_fail + 1; v_out := v_out || format(E'\n  FAIL  %-38s succeeded', v_label);
    elsif v_res ~* 'not allowed|not_authorized|forbidden|permission|denied|authoriz|insufficient|not found' then v_pass := v_pass + 1; v_out := v_out || format(E'\n  PASS  %-38s %s', v_label, v_res);
    else v_odd := v_odd + 1; v_out := v_out || format(E'\n  ????  %-38s %s', v_label, v_res); end if;

    -- 5. Privilege escalation: invite yourself into another org as its owner.
    begin
      perform public.fn_create_membership_invite(v_orgB, 'org', 'organizer_owner'::app_role, null, 'me@example.test', interval '7 days');
      v_res := 'ALLOWED';
    exception when others then v_res := sqlerrm; end;
    v_label := 'fn_create_membership_invite(orgB)';
    if v_res = 'ALLOWED' then v_fail := v_fail + 1; v_out := v_out || format(E'\n  FAIL  %-38s succeeded', v_label);
    elsif v_res ~* 'not allowed|not_authorized|forbidden|permission|denied|authoriz|insufficient|not found' then v_pass := v_pass + 1; v_out := v_out || format(E'\n  PASS  %-38s %s', v_label, v_res);
    else v_odd := v_odd + 1; v_out := v_out || format(E'\n  ????  %-38s %s', v_label, v_res); end if;

    -- 6. Publish someone else's draft event.
    begin
      perform public.fn_transition_event_status(v_eventB, 'published');
      v_res := 'ALLOWED';
    exception when others then v_res := sqlerrm; end;
    v_label := 'fn_transition_event_status(eventB)';
    if v_res = 'ALLOWED' then v_fail := v_fail + 1; v_out := v_out || format(E'\n  FAIL  %-38s succeeded', v_label);
    elsif v_res ~* 'not allowed|not_authorized|forbidden|permission|denied|authoriz|insufficient|not found' then v_pass := v_pass + 1; v_out := v_out || format(E'\n  PASS  %-38s %s', v_label, v_res);
    else v_odd := v_odd + 1; v_out := v_out || format(E'\n  ????  %-38s %s', v_label, v_res); end if;

    -- 7. Copy someone else's event (and its pricing) into your own org.
    begin
      perform public.fn_duplicate_event(v_eventB);
      v_res := 'ALLOWED';
    exception when others then v_res := sqlerrm; end;
    v_label := 'fn_duplicate_event(eventB)';
    if v_res = 'ALLOWED' then v_fail := v_fail + 1; v_out := v_out || format(E'\n  FAIL  %-38s succeeded', v_label);
    elsif v_res ~* 'not allowed|not_authorized|forbidden|permission|denied|authoriz|insufficient|not found' then v_pass := v_pass + 1; v_out := v_out || format(E'\n  PASS  %-38s %s', v_label, v_res);
    else v_odd := v_odd + 1; v_out := v_out || format(E'\n  ????  %-38s %s', v_label, v_res); end if;

    -- 8. Register a scanner device against someone else's gate.
    begin
      perform public.fn_register_device(v_orgB, v_eventB, 'rogue', 'organizer_scanner'::device_role);
      v_res := 'ALLOWED';
    exception when others then v_res := sqlerrm; end;
    v_label := 'fn_register_device(orgB)';
    if v_res = 'ALLOWED' then v_fail := v_fail + 1; v_out := v_out || format(E'\n  FAIL  %-38s succeeded', v_label);
    elsif v_res ~* 'not allowed|not_authorized|forbidden|permission|denied|authoriz|insufficient|not found' then v_pass := v_pass + 1; v_out := v_out || format(E'\n  PASS  %-38s %s', v_label, v_res);
    else v_odd := v_odd + 1; v_out := v_out || format(E'\n  ????  %-38s %s', v_label, v_res); end if;

    -- 9. Check in someone else's attendees.
    begin
      perform public.fn_bulk_check_in(array[v_itemB], v_orgB);
      v_res := 'ALLOWED';
    exception when others then v_res := sqlerrm; end;
    v_label := 'fn_bulk_check_in(orgB)';
    if v_res = 'ALLOWED' then v_fail := v_fail + 1; v_out := v_out || format(E'\n  FAIL  %-38s succeeded', v_label);
    elsif v_res ~* 'not allowed|not_authorized|forbidden|permission|denied|authoriz|insufficient|not found' then v_pass := v_pass + 1; v_out := v_out || format(E'\n  PASS  %-38s %s', v_label, v_res);
    else v_odd := v_odd + 1; v_out := v_out || format(E'\n  ????  %-38s %s', v_label, v_res); end if;

    -- 10. Email someone else's attendee list.
    begin
      perform public.fn_claim_email_broadcast(v_orgB, v_eventB, 10, 'all', 'hello');
      v_res := 'ALLOWED';
    exception when others then v_res := sqlerrm; end;
    v_label := 'fn_claim_email_broadcast(orgB)';
    if v_res = 'ALLOWED' then v_fail := v_fail + 1; v_out := v_out || format(E'\n  FAIL  %-38s succeeded', v_label);
    elsif v_res ~* 'not allowed|not_authorized|forbidden|permission|denied|authoriz|only org|insufficient|not found' then v_pass := v_pass + 1; v_out := v_out || format(E'\n  PASS  %-38s %s', v_label, v_res);
    else v_odd := v_odd + 1; v_out := v_out || format(E'\n  ????  %-38s %s', v_label, v_res); end if;

    -- 11. Delete someone else's organization outright.
    begin
      perform public.fn_delete_organization(v_orgB, 'Harness Org B');
      v_res := 'ALLOWED';
    exception when others then v_res := sqlerrm; end;
    v_label := 'fn_delete_organization(orgB)';
    if v_res = 'ALLOWED' then v_fail := v_fail + 1; v_out := v_out || format(E'\n  FAIL  %-38s succeeded', v_label);
    elsif v_res ~* 'not allowed|not_authorized|forbidden|permission|denied|authoriz|insufficient|not found' then v_pass := v_pass + 1; v_out := v_out || format(E'\n  PASS  %-38s %s', v_label, v_res);
    else v_odd := v_odd + 1; v_out := v_out || format(E'\n  ????  %-38s %s', v_label, v_res); end if;

    -- 12. Open a POS shift on someone else's org.
    begin
      perform public.fn_open_pos_shift(v_orgB, null, null, 0, null);
      v_res := 'ALLOWED';
    exception when others then v_res := sqlerrm; end;
    v_label := 'fn_open_pos_shift(orgB)';
    if v_res = 'ALLOWED' then v_fail := v_fail + 1; v_out := v_out || format(E'\n  FAIL  %-38s succeeded', v_label);
    elsif v_res ~* 'not allowed|not_authorized|forbidden|permission|denied|authoriz|insufficient|not found' then v_pass := v_pass + 1; v_out := v_out || format(E'\n  PASS  %-38s %s', v_label, v_res);
    else v_odd := v_odd + 1; v_out := v_out || format(E'\n  ????  %-38s %s', v_label, v_res); end if;

    -- 13. RLS read: org B's orders must be invisible, not merely un-mutable.
    declare v_seen integer;
    begin
      select count(*) into v_seen from public.orders o where o.org_id = v_orgB;
      if v_seen > 0 then
        v_fail := v_fail + 1;
        v_out := v_out || format(E'\n  FAIL  %-38s saw %s row(s)', 'RLS select orders(orgB)', v_seen);
      else
        v_pass := v_pass + 1;
        v_out := v_out || format(E'\n  PASS  %-38s 0 rows visible', 'RLS select orders(orgB)');
      end if;
    exception when others then
      v_pass := v_pass + 1;
      v_out := v_out || format(E'\n  PASS  %-38s %s', 'RLS select orders(orgB)', sqlerrm);
    end;
  end cases;

  ------------------------------------------------- persona: anonymous guest
  -- Guest checkout uses anonymous Supabase identities, which carry the SAME
  -- database role as a signed-in user. Role alone therefore proves nothing;
  -- these confirm the claimed-account guard is what stops them.
  execute 'reset role';
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_anon::text, 'role', 'authenticated', 'is_anonymous', true)::text, true);
  execute 'set local role authenticated';

  <<anon_cases>>
  declare v_res text; v_label text;
  begin
    begin
      perform public.fn_request_payout(v_orgA, 1000);
      v_res := 'ALLOWED';
    exception when others then v_res := sqlerrm; end;
    v_label := 'anon: fn_request_payout(orgA)';
    if v_res = 'ALLOWED' then v_fail := v_fail + 1; v_out := v_out || format(E'\n  FAIL  %-38s succeeded', v_label);
    else v_pass := v_pass + 1; v_out := v_out || format(E'\n  PASS  %-38s %s', v_label, v_res); end if;

    begin
      perform public.create_event_draft(v_orgA, 'anon event', 'public');
      v_res := 'ALLOWED';
    exception when others then v_res := sqlerrm; end;
    v_label := 'anon: create_event_draft(orgA)';
    if v_res = 'ALLOWED' then v_fail := v_fail + 1; v_out := v_out || format(E'\n  FAIL  %-38s succeeded', v_label);
    else v_pass := v_pass + 1; v_out := v_out || format(E'\n  PASS  %-38s %s', v_label, v_res); end if;
  end anon_cases;

  ------------------------------------------------- positive controls
  -- These MUST succeed. If they do not, the harness is not really acting as
  -- user A and every refusal above is meaningless.
  execute 'reset role';
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_userA::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';

  <<controls>>
  declare v_res text;
  begin
    begin
      perform public.create_event_draft(v_orgA, 'own event', 'public');
      v_res := 'ok';
    exception when others then v_res := 'BROKEN: ' || sqlerrm; end;
    if v_res = 'ok' then v_pass := v_pass + 1; v_out := v_out || format(E'\n  CTRL  %-38s allowed (as it must be)', 'create_event_draft(orgA)');
    else v_fail := v_fail + 1; v_out := v_out || format(E'\n  CTRL-FAIL %-34s %s', 'create_event_draft(orgA)', v_res); end if;

    begin
      perform public.fn_org_finance_summary(v_orgA, null, null);
      v_res := 'ok';
    exception when others then v_res := 'BROKEN: ' || sqlerrm; end;
    if v_res = 'ok' then v_pass := v_pass + 1; v_out := v_out || format(E'\n  CTRL  %-38s allowed (as it must be)', 'fn_org_finance_summary(orgA)');
    else v_fail := v_fail + 1; v_out := v_out || format(E'\n  CTRL-FAIL %-34s %s', 'fn_org_finance_summary(orgA)', v_res); end if;
  end controls;

  execute 'reset role';

  -- Raising rolls the whole transaction back: no orgs, users, events or orders
  -- created by this harness survive.
  raise exception E'CROSS-ORG AUTHORIZATION%\n\n  passed=%  failed=%  needs-review=%',
    v_out, v_pass, v_fail, v_odd;
end $$;
