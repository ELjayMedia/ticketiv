-- event_live_stats trigger assertions (regression for the event-delete abort).
--
-- Runnable by hand (psql -f) or a future pgTAP/CI harness. Wrapped in a
-- transaction that ROLLS BACK, so it never persists test data. All assertions
-- must hold; any failure raises and aborts. If it completes with no error, pass.
--
-- Covers 20260725130000_fix_event_live_stats_recalc_on_event_delete.sql:
--   1. an event with ticket types can be deleted (the actual regression),
--   2. an event with scans can be deleted,
--   3. deleting a ticket type on a live event still recalculates its stats,
--   4. inserting/updating ticket types still maintains stats,
--   5. fn_recalculate_event_live_stats still raises for an unknown event id.
--
-- Before the fix, (1) and (2) aborted with 'event <uuid> not found': PostgreSQL
-- deletes the parent row before firing ON DELETE CASCADE triggers on children,
-- so the AFTER DELETE recalc ran against an event that was already gone.

begin;
do $$
declare
  v_s text := substr(md5(random()::text),1,8);
  v_org uuid := gen_random_uuid();
  v_event uuid := gen_random_uuid();
  v_event2 uuid := gen_random_uuid();
  v_live uuid := gen_random_uuid();
  v_tt uuid := gen_random_uuid();
  v_tt_keep uuid := gen_random_uuid();
  v_available integer;
  v_raised boolean;
begin
  insert into public.organizations (id, name, slug)
  values (v_org, 'els test '||v_s, 'els-test-'||v_s);

  -- 1. event with ticket types is deletable -------------------------------
  insert into public.events (id, org_id, title, slug)
  values (v_event, v_org, 'ELS delete '||v_s, 'els-delete-'||v_s);
  insert into public.ticket_types (id, event_id, name, price_cents, quota)
  values (v_tt, v_event, 'GA', 10000, 50);

  -- The insert above must have maintained stats via the same trigger.
  if not exists (select 1 from public.event_live_stats where event_id = v_event) then
    raise exception 'FAIL: ticket_type insert did not create event_live_stats';
  end if;

  delete from public.events where id = v_event;

  if exists (select 1 from public.events where id = v_event) then
    raise exception 'FAIL: event survived delete';
  end if;
  if exists (select 1 from public.event_live_stats where event_id = v_event) then
    raise exception 'FAIL: event_live_stats orphaned after event delete';
  end if;
  if exists (select 1 from public.ticket_types where event_id = v_event) then
    raise exception 'FAIL: ticket_types orphaned after event delete';
  end if;

  -- 2. event with scans is deletable --------------------------------------
  insert into public.events (id, org_id, title, slug)
  values (v_event2, v_org, 'ELS scans '||v_s, 'els-scans-'||v_s);
  insert into public.ticket_types (event_id, name, price_cents, quota)
  values (v_event2, 'GA', 5000, 10);
  insert into public.scans (event_id, ticket_code, outcome)
  values (v_event2, 'TST-'||v_s, 'valid');

  delete from public.events where id = v_event2;

  if exists (select 1 from public.events where id = v_event2) then
    raise exception 'FAIL: event with scans survived delete';
  end if;
  if exists (select 1 from public.scans where event_id = v_event2) then
    raise exception 'FAIL: scans orphaned after event delete';
  end if;

  -- 3 & 4. stats maintenance on a surviving event is unchanged ------------
  insert into public.events (id, org_id, title, slug)
  values (v_live, v_org, 'ELS live '||v_s, 'els-live-'||v_s);
  insert into public.ticket_types (id, event_id, name, price_cents, quota)
  values (v_tt_keep, v_live, 'Keep', 2000, 30),
         (gen_random_uuid(), v_live, 'Drop', 2000, 70);

  -- No sales, so tickets_available tracks total quota: 30 + 70.
  select tickets_available into v_available
  from public.event_live_stats where event_id = v_live;
  if v_available is distinct from 100 then
    raise exception 'FAIL: expected tickets_available 100 after inserts, got %', v_available;
  end if;

  -- Quota update must be picked up (trigger watches the quota column).
  update public.ticket_types set quota = 40 where id = v_tt_keep;
  select tickets_available into v_available
  from public.event_live_stats where event_id = v_live;
  if v_available is distinct from 110 then
    raise exception 'FAIL: expected tickets_available 110 after quota update, got %', v_available;
  end if;

  -- Deleting one ticket type on a live event must still recalculate, which is
  -- exactly the path the fix must not have disabled.
  delete from public.ticket_types where event_id = v_live and name = 'Drop';
  select tickets_available into v_available
  from public.event_live_stats where event_id = v_live;
  if v_available is distinct from 40 then
    raise exception 'FAIL: expected tickets_available 40 after ticket_type delete, got %', v_available;
  end if;

  -- 5. strict contract preserved for direct calls -------------------------
  v_raised := false;
  begin
    perform public.fn_recalculate_event_live_stats(gen_random_uuid());
  exception when others then
    v_raised := true;
  end;
  if not v_raised then
    raise exception 'FAIL: fn_recalculate_event_live_stats accepted an unknown event id';
  end if;

  v_raised := false;
  begin
    perform public.fn_recalculate_event_live_stats(null);
  exception when others then
    v_raised := true;
  end;
  if not v_raised then
    raise exception 'FAIL: fn_recalculate_event_live_stats accepted a null event id';
  end if;
end $$;
rollback;
