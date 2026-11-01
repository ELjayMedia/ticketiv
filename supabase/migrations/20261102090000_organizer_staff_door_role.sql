-- Organizer app roles (ADR 0002): organizer_staff becomes DOOR STAFF.
--
-- Before: app.is_org_manager() counted organizer_owner, organizer_admin and
-- organizer_staff, so organizer_staff could create and edit events, ticket
-- types, seat maps, venues and price rules.
--
-- After:
--   manager (owner / admin) — everything, as before.
--   door staff (organizer_staff) — scan, guestlist, box office, device
--   sessions, and the reads those need (orders, order items, seats, ticket
--   types, venues, event dates, wristband data). No event or catalogue edits.
--
-- How:
--   1. app.is_org_operator(org): exactly the previous is_org_manager rule
--      (owner, admin, organizer_staff, platform admin).
--   2. Door functions and read policies are re-pointed from is_org_manager to
--      is_org_operator, so their behaviour does not change.
--   3. app.is_org_manager is narrowed to owner + admin (+ platform admin), so
--      every remaining write path stops admitting organizer_staff.
--   4. organizer_staff is removed from the few manager checks that name it
--      directly (can_manage_event, ticket-type updates, wristband admin,
--      waitlist and seat-map writes).
--
-- Steps 2 and 4 edit the deployed definitions in place and raise if an
-- expected definition is missing or unchanged, so the migration cannot
-- half-apply.

-- 1. Operator predicate (previous is_org_manager semantics) -----------------
create or replace function app.is_org_operator(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select app.org_has_role(p_org, array['organizer_owner','organizer_admin','organizer_staff']::app_role[])
      or app.is_platform_admin()
$function$;

comment on function app.is_org_operator(uuid) is
  'Org owner, admin or door staff (organizer_staff), or platform admin. Use for door operations and the reads they need; use is_org_manager for writes.';

revoke all on function app.is_org_operator(uuid) from public;
grant execute on function app.is_org_operator(uuid) to anon, authenticated, dashboard_user;

-- 2 + 4. Re-point door paths, strip organizer_staff from manager paths -------
do $migration$
declare
  v_door_fns text[] := array[
    'app.can_manage_guestlist_entry', 'app.can_update_guestlist_entry',
    'app.can_read_tapband_credential', 'app.can_read_tapband_entitlement',
    'app.can_read_tapband_inventory', 'app.can_read_tapband_order_item',
    'app.can_record_tapband_event_tap',
    'public.fn_close_pos_shift', 'public.fn_pos_receipt',
    'public.fn_pos_shift_summary', 'public.fn_pos_shift_transactions',
    'public.fn_start_device_session', 'public.fn_end_device_session'
  ];
  v_mgr_fns text[] := array[
    'app.can_administer_tapband_event', 'public.can_update_ticket_types_by_user', 'public.can_manage_event'
  ];
  v_door_pols text[] := array[
    'credential_batches.credential_batches_select', 'device_sessions.device_sessions_select',
    'device_setup_codes.device_setup_codes_select', 'devices.devices_select',
    'event_dates.event_dates_select_authenticated', 'order_items.order_items_select_authenticated',
    'orders.orders_select', 'pos_shifts.pos_shifts_select',
    'price_rule_redemptions.price_rule_redemptions_select', 'price_rules.price_rules_select',
    'seat_maps.seat_maps_select', 'seats.seats_select',
    'tapband_alerts.tapband_alerts_select', 'tapband_feature_configs.tapband_feature_configs_select',
    'tapband_kill_switches.tapband_kill_switches_select', 'tapband_telemetry_events.tapband_telemetry_events_select',
    'ticket_types.ticket_types_read_consolidated',
    'venues.venues_dashboard_user_select', 'venues.venues_select_authenticated'
  ];
  v_mgr_pols text[] := array[
    'waitlists.waitlists_insert', 'waitlists.waitlists_update', 'waitlists.waitlists_delete',
    'seat_maps.seat_maps_update', 'seats.seats_update'
  ];
  v_name text;
  v_oid oid;
  v_old text;
  v_new text;
  v_tbl text;
  v_pol text;
  v_qual text;
  v_check text;
  v_sql text;
begin
  -- Door functions: is_org_manager -> is_org_operator.
  foreach v_name in array v_door_fns loop
    select p.oid into v_oid
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = split_part(v_name, '.', 1) and p.proname = split_part(v_name, '.', 2);
    if v_oid is null then raise exception 'organizer roles: function % not found', v_name; end if;
    v_old := pg_get_functiondef(v_oid);
    v_new := regexp_replace(v_old, '(app\.)?is_org_manager\(', 'app.is_org_operator(', 'g');
    if v_new = v_old then raise exception 'organizer roles: % does not call is_org_manager', v_name; end if;
    execute v_new;
  end loop;

  -- Manager functions: drop organizer_staff from their role lists.
  foreach v_name in array v_mgr_fns loop
    select p.oid into v_oid
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = split_part(v_name, '.', 1) and p.proname = split_part(v_name, '.', 2);
    if v_oid is null then raise exception 'organizer roles: function % not found', v_name; end if;
    v_old := pg_get_functiondef(v_oid);
    v_new := replace(replace(replace(replace(v_old,
      ',''organizer_staff''', ''), ', ''organizer_staff''', ''), '''organizer_staff'',', ''), '''organizer_staff'', ', '');
    if v_new = v_old or v_new like '%organizer_staff%' then
      raise exception 'organizer roles: could not remove organizer_staff from %', v_name;
    end if;
    execute v_new;
  end loop;

  -- Read policies: is_org_manager -> is_org_operator.
  foreach v_name in array v_door_pols loop
    v_tbl := split_part(v_name, '.', 1);
    v_pol := split_part(v_name, '.', 2);
    select qual, with_check into v_qual, v_check
    from pg_policies where schemaname = 'public' and tablename = v_tbl and policyname = v_pol;
    if not found then raise exception 'organizer roles: policy %.% not found', v_tbl, v_pol; end if;
    if coalesce(v_qual, '') || coalesce(v_check, '') !~ 'is_org_manager\(' then
      raise exception 'organizer roles: policy %.% does not call is_org_manager', v_tbl, v_pol;
    end if;
    v_sql := format('alter policy %I on public.%I', v_pol, v_tbl);
    if v_qual is not null then
      v_sql := v_sql || ' using (' || regexp_replace(v_qual, '(app\.)?is_org_manager\(', 'app.is_org_operator(', 'g') || ')';
    end if;
    if v_check is not null then
      v_sql := v_sql || ' with check (' || regexp_replace(v_check, '(app\.)?is_org_manager\(', 'app.is_org_operator(', 'g') || ')';
    end if;
    execute v_sql;
  end loop;

  -- Manager write policies: drop organizer_staff from event_staff role arrays.
  foreach v_name in array v_mgr_pols loop
    v_tbl := split_part(v_name, '.', 1);
    v_pol := split_part(v_name, '.', 2);
    select qual, with_check into v_qual, v_check
    from pg_policies where schemaname = 'public' and tablename = v_tbl and policyname = v_pol;
    if not found then raise exception 'organizer roles: policy %.% not found', v_tbl, v_pol; end if;
    v_qual := replace(v_qual, ', ''organizer_staff''::app_role', '');
    v_check := replace(v_check, ', ''organizer_staff''::app_role', '');
    if coalesce(v_qual, '') || coalesce(v_check, '') like '%organizer_staff%' then
      raise exception 'organizer roles: could not remove organizer_staff from policy %.%', v_tbl, v_pol;
    end if;
    v_sql := format('alter policy %I on public.%I', v_pol, v_tbl);
    if v_qual is not null then v_sql := v_sql || ' using (' || v_qual || ')'; end if;
    if v_check is not null then v_sql := v_sql || ' with check (' || v_check || ')'; end if;
    execute v_sql;
  end loop;
end
$migration$;

-- 3. Managers are owners and admins only -------------------------------------
create or replace function app.is_org_manager(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select app.org_has_role(p_org, array['organizer_owner','organizer_admin']::app_role[])
      or app.is_platform_admin()
$function$;

comment on function app.is_org_manager(uuid) is
  'Org owner or admin, or platform admin. organizer_staff is door staff (see app.is_org_operator).';
