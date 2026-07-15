-- TICK-288 — TapBand credential lifecycle RPCs.
--
-- These functions are intentionally service_role-only. App routes and server
-- actions must call the server-only lifecycle wrapper, which supplies the
-- authenticated actor and device context. Direct browser/client writes remain
-- blocked by table RLS.

begin;

create unique index if not exists credential_taps_operator_attempt_uidx
  on public.credential_taps (operator_user_id, client_attempt_id)
  where operator_user_id is not null and client_attempt_id is not null;

create or replace function public.fn_tapband_actor_is_platform_admin(p_actor_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = p_actor_id
      and au.active is true
  )
$function$;

create or replace function public.fn_tapband_actor_can_manage_event(p_actor_id uuid, p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select p_event_id is not null
    and (
      public.fn_tapband_actor_is_platform_admin(p_actor_id)
      or exists (
        select 1
        from public.events e
        join public.org_members om on om.org_id = e.org_id
        where e.id = p_event_id
          and om.user_id = p_actor_id
          and om.role in ('organizer_owner','organizer_admin','organizer_staff','organizer_scanner','admin','organizer','scanner')
      )
      or exists (
        select 1
        from public.event_staff es
        where es.event_id = p_event_id
          and es.user_id = p_actor_id
          and es.active is true
          and es.role in ('organizer_admin','organizer_staff','scanner','organizer_scanner','admin')
      )
    )
$function$;

create or replace function public.fn_tapband_audit_lifecycle(
  p_org_id uuid,
  p_actor_id uuid,
  p_table_name text,
  p_record_id uuid,
  p_action text,
  p_changes jsonb
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.audit_log (org_id, actor_id, table_name, record_id, action, changes)
  values (
    p_org_id,
    p_actor_id,
    p_table_name,
    p_record_id::text,
    p_action::public.audit_action,
    coalesce(p_changes, '{}'::jsonb) || jsonb_build_object('business_action', 'tapband_lifecycle')
  );
end
$function$;

create or replace function public.fn_tapband_issue_credential(
  p_inventory_id uuid,
  p_user_id uuid,
  p_credential_public_id text,
  p_actor_id uuid,
  p_device_id uuid default null,
  p_session_id uuid default null,
  p_attempt_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_inventory record;
  v_credential record;
  v_existing record;
  v_now timestamptz := now();
begin
  if p_actor_id is null or not public.fn_tapband_actor_is_platform_admin(p_actor_id) then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_unauthorized', 'message', 'Not authorized to issue credentials');
  end if;

  if p_attempt_id is not null then
    select credential_id into v_existing
    from public.credential_taps
    where operator_user_id = p_actor_id
      and client_attempt_id = p_attempt_id
      and tap_type = 'provision'
      and outcome = 'issued'
    limit 1;

    if found then
      return jsonb_build_object('ok', true, 'status', 'issued', 'credential_id', v_existing.credential_id, 'idempotent', true);
    end if;
  end if;

  select *
    into v_inventory
  from public.credential_inventory
  where id = p_inventory_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_inventory_not_found', 'message', 'Inventory item not found');
  end if;

  if v_inventory.inventory_status not in ('inspected', 'available', 'reserved') then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_inventory_not_available', 'message', 'Inventory item is not available for issue');
  end if;

  if v_inventory.current_credential_id is not null then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_inventory_already_issued', 'message', 'Inventory item already has a current credential');
  end if;

  insert into public.physical_credentials (
    inventory_id,
    user_id,
    credential_public_id,
    credential_type,
    chip_family,
    key_version,
    authentication_mode,
    status,
    issued_by,
    issued_at,
    verification_metadata
  )
  values (
    p_inventory_id,
    p_user_id,
    p_credential_public_id,
    case when v_inventory.chip_family ilike '%desfire%' then 'desfire_ev3' else 'ntag_pilot' end,
    v_inventory.chip_family,
    v_inventory.key_version,
    case when v_inventory.chip_family ilike '%desfire%' then 'desfire_mutual_auth' else 'server_entitlement' end,
    'issued',
    p_actor_id,
    v_now,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into v_credential;

  update public.credential_inventory
  set inventory_status = 'issued',
      current_credential_id = v_credential.id,
      issued_at = v_now,
      updated_by = p_actor_id
  where id = p_inventory_id;

  insert into public.credential_taps (
    credential_id, inventory_id, device_id, device_session_id, operator_user_id,
    tap_type, outcome, reason_code, occurred_at, client_attempt_id, metadata
  )
  values (
    v_credential.id, p_inventory_id, p_device_id, p_session_id, p_actor_id,
    'provision', 'issued', 'tapband_credential_issued', v_now, p_attempt_id,
    jsonb_build_object('user_id', p_user_id) || coalesce(p_metadata, '{}'::jsonb)
  );

  perform public.fn_tapband_audit_lifecycle(
    v_inventory.org_id,
    p_actor_id,
    'physical_credentials',
    v_credential.id,
    'insert',
    jsonb_build_object('status', 'issued', 'inventory_id', p_inventory_id)
  );

  return jsonb_build_object(
    'ok', true,
    'status', 'issued',
    'credential_id', v_credential.id,
    'inventory_id', p_inventory_id,
    'user_id', p_user_id,
    'idempotent', false
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_duplicate_credential', 'message', 'Credential already exists or inventory is already active');
end
$function$;

create or replace function public.fn_tapband_activate_credential(
  p_credential_id uuid,
  p_actor_id uuid,
  p_device_id uuid default null,
  p_session_id uuid default null,
  p_attempt_id text default null,
  p_verification_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_credential record;
  v_inventory record;
  v_existing record;
  v_now timestamptz := now();
begin
  select pc.*, ci.org_id, ci.event_id
    into v_credential
  from public.physical_credentials pc
  join public.credential_inventory ci on ci.id = pc.inventory_id
  where pc.id = p_credential_id
  for update of pc;

  if not found then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_credential_not_found', 'message', 'Credential not found');
  end if;

  if not (public.fn_tapband_actor_is_platform_admin(p_actor_id) or v_credential.user_id = p_actor_id) then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_unauthorized', 'message', 'Not authorized to activate credential');
  end if;

  if p_attempt_id is not null then
    select id into v_existing
    from public.credential_taps
    where operator_user_id = p_actor_id
      and client_attempt_id = p_attempt_id
      and tap_type = 'activate'
      and credential_id = p_credential_id
    limit 1;

    if found then
      return jsonb_build_object('ok', true, 'status', v_credential.status, 'credential_id', p_credential_id, 'idempotent', true);
    end if;
  end if;

  if v_credential.status = 'active' then
    return jsonb_build_object('ok', true, 'status', 'active', 'credential_id', p_credential_id, 'idempotent', true);
  end if;

  if v_credential.status <> 'issued' then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_invalid_state', 'message', 'Only issued credentials can be activated');
  end if;

  update public.physical_credentials
  set status = 'active',
      activated_by = p_actor_id,
      activated_at = v_now,
      verification_metadata = verification_metadata || coalesce(p_verification_metadata, '{}'::jsonb),
      updated_at = v_now
  where id = p_credential_id
  returning * into v_credential;

  update public.credential_inventory
  set inventory_status = 'active',
      activated_at = v_now,
      updated_by = p_actor_id
  where id = v_credential.inventory_id
  returning * into v_inventory;

  insert into public.credential_taps (
    credential_id, inventory_id, device_id, device_session_id, operator_user_id,
    tap_type, outcome, reason_code, occurred_at, client_attempt_id, metadata
  )
  values (
    p_credential_id, v_credential.inventory_id, p_device_id, p_session_id, p_actor_id,
    'activate', 'active', 'tapband_credential_active', v_now, p_attempt_id,
    coalesce(p_verification_metadata, '{}'::jsonb)
  );

  perform public.fn_tapband_audit_lifecycle(
    v_inventory.org_id,
    p_actor_id,
    'physical_credentials',
    p_credential_id,
    'update',
    jsonb_build_object('status', 'active')
  );

  return jsonb_build_object('ok', true, 'status', 'active', 'credential_id', p_credential_id, 'idempotent', false);
end
$function$;

create or replace function public.fn_tapband_assign_entitlement(
  p_credential_id uuid,
  p_order_item_id uuid,
  p_event_id uuid,
  p_actor_id uuid,
  p_assignment_source text default 'support',
  p_attempt_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_credential record;
  v_item record;
  v_entitlement record;
  v_existing record;
  v_now timestamptz := now();
begin
  if not public.fn_tapband_actor_can_manage_event(p_actor_id, p_event_id) then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_unauthorized', 'message', 'Not authorized to assign entitlement');
  end if;

  select * into v_credential
  from public.physical_credentials
  where id = p_credential_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_credential_not_found', 'message', 'Credential not found');
  end if;

  if v_credential.status <> 'active' then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_credential_inactive', 'message', 'Credential is not active');
  end if;

  select oi.id, oi.holder_user_id, oi.current_owner_id, o.buyer_id, o.org_id, tt.event_id
    into v_item
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  join public.ticket_types tt on tt.id = oi.ticket_type_id
  where oi.id = p_order_item_id
  for update of oi;

  if not found then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_order_item_not_found', 'message', 'Order item not found');
  end if;

  if v_item.event_id <> p_event_id then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_wrong_event', 'message', 'Order item belongs to a different event');
  end if;

  select * into v_existing
  from public.credential_entitlements
  where order_item_id = p_order_item_id
    and status = 'active'
  limit 1;

  if found then
    if v_existing.credential_id = p_credential_id then
      return jsonb_build_object('ok', true, 'status', 'active', 'entitlement_id', v_existing.id, 'credential_id', p_credential_id, 'order_item_id', p_order_item_id, 'idempotent', true);
    end if;
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_entitlement_conflict', 'message', 'Order item already has an active credential entitlement');
  end if;

  insert into public.credential_entitlements (
    credential_id,
    order_item_id,
    event_id,
    holder_user_id,
    status,
    valid_from,
    assigned_by,
    assignment_source,
    assigned_at,
    metadata
  )
  values (
    p_credential_id,
    p_order_item_id,
    p_event_id,
    coalesce(v_item.holder_user_id, v_item.current_owner_id, v_item.buyer_id),
    'active',
    v_now,
    p_actor_id,
    p_assignment_source,
    v_now,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into v_entitlement;

  insert into public.credential_taps (
    credential_id, inventory_id, event_id, order_item_id, operator_user_id,
    tap_type, outcome, reason_code, occurred_at, client_attempt_id, metadata
  )
  values (
    p_credential_id, v_credential.inventory_id, p_event_id, p_order_item_id, p_actor_id,
    case when p_assignment_source = 'outlet_sale' then 'outlet_sale' else 'support_lookup' end,
    'entitlement_assigned', 'tapband_entitlement_assigned', v_now, p_attempt_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  perform public.fn_tapband_audit_lifecycle(
    v_item.org_id,
    p_actor_id,
    'credential_entitlements',
    v_entitlement.id,
    'insert',
    jsonb_build_object('credential_id', p_credential_id, 'order_item_id', p_order_item_id, 'event_id', p_event_id)
  );

  return jsonb_build_object('ok', true, 'status', 'active', 'entitlement_id', v_entitlement.id, 'credential_id', p_credential_id, 'order_item_id', p_order_item_id, 'idempotent', false);
end
$function$;

create or replace function public.fn_tapband_revoke_credential(
  p_credential_id uuid,
  p_actor_id uuid,
  p_reason text,
  p_new_status text default 'revoked',
  p_attempt_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_credential record;
  v_inventory record;
  v_now timestamptz := now();
  v_status text := coalesce(nullif(p_new_status, ''), 'revoked');
begin
  select pc.*, ci.org_id
    into v_credential
  from public.physical_credentials pc
  join public.credential_inventory ci on ci.id = pc.inventory_id
  where pc.id = p_credential_id
  for update of pc;

  if not found then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_credential_not_found', 'message', 'Credential not found');
  end if;

  if v_status not in ('revoked', 'lost', 'replaced', 'defective', 'retired', 'destroyed') then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_invalid_status', 'message', 'Unsupported revocation status');
  end if;

  if not (
    public.fn_tapband_actor_is_platform_admin(p_actor_id)
    or (v_status = 'lost' and v_credential.user_id = p_actor_id)
  ) then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_unauthorized', 'message', 'Not authorized to revoke credential');
  end if;

  if v_credential.status in ('revoked', 'lost', 'replaced', 'defective', 'retired', 'destroyed') then
    return jsonb_build_object('ok', true, 'status', v_credential.status, 'credential_id', p_credential_id, 'idempotent', true);
  end if;

  update public.physical_credentials
  set status = v_status,
      revoked_by = p_actor_id,
      revoked_at = v_now,
      revocation_reason = p_reason,
      updated_at = v_now
  where id = p_credential_id
  returning * into v_credential;

  update public.credential_inventory
  set inventory_status = case when v_status = 'replaced' then 'retired' else v_status end,
      current_credential_id = null,
      retired_at = case when v_status in ('retired','destroyed','replaced') then v_now else retired_at end,
      updated_by = p_actor_id
  where id = v_credential.inventory_id
  returning * into v_inventory;

  update public.credential_entitlements
  set status = 'removed',
      removed_by = p_actor_id,
      removed_at = v_now,
      removal_reason = p_reason,
      updated_at = v_now
  where credential_id = p_credential_id
    and status in ('active', 'suspended');

  insert into public.credential_taps (
    credential_id, inventory_id, operator_user_id, tap_type, outcome,
    reason_code, occurred_at, client_attempt_id, metadata
  )
  values (
    p_credential_id, v_credential.inventory_id, p_actor_id, 'revoke_check', v_status,
    'tapband_credential_' || v_status, v_now, p_attempt_id,
    jsonb_build_object('reason', p_reason) || coalesce(p_metadata, '{}'::jsonb)
  );

  perform public.fn_tapband_audit_lifecycle(
    v_inventory.org_id,
    p_actor_id,
    'physical_credentials',
    p_credential_id,
    'update',
    jsonb_build_object('status', v_status, 'reason', p_reason)
  );

  return jsonb_build_object('ok', true, 'status', v_status, 'credential_id', p_credential_id, 'idempotent', false);
end
$function$;

create or replace function public.fn_tapband_replace_credential(
  p_old_credential_id uuid,
  p_new_inventory_id uuid,
  p_new_credential_public_id text,
  p_actor_id uuid,
  p_attempt_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_old record;
  v_inventory record;
  v_new record;
  v_existing record;
  v_now timestamptz := now();
begin
  if p_actor_id is null or not public.fn_tapband_actor_is_platform_admin(p_actor_id) then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_unauthorized', 'message', 'Not authorized to replace credentials');
  end if;

  if p_attempt_id is not null then
    select credential_id into v_existing
    from public.credential_taps
    where operator_user_id = p_actor_id
      and client_attempt_id = p_attempt_id
      and tap_type = 'replacement'
      and outcome = 'replacement_issued'
    limit 1;

    if found then
      return jsonb_build_object('ok', true, 'status', 'issued', 'credential_id', v_existing.credential_id, 'idempotent', true);
    end if;
  end if;

  select pc.*, ci.org_id
    into v_old
  from public.physical_credentials pc
  join public.credential_inventory ci on ci.id = pc.inventory_id
  where pc.id = p_old_credential_id
  for update of pc;

  if not found then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_credential_not_found', 'message', 'Old credential not found');
  end if;

  select * into v_inventory
  from public.credential_inventory
  where id = p_new_inventory_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_inventory_not_found', 'message', 'Replacement inventory item not found');
  end if;

  if v_inventory.inventory_status not in ('inspected', 'available', 'reserved') or v_inventory.current_credential_id is not null then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_inventory_not_available', 'message', 'Replacement inventory item is not available');
  end if;

  update public.physical_credentials
  set status = 'replaced',
      revoked_by = p_actor_id,
      revoked_at = v_now,
      revocation_reason = coalesce((p_metadata ->> 'reason'), 'Credential replaced'),
      updated_at = v_now
  where id = p_old_credential_id;

  update public.credential_inventory
  set inventory_status = case when v_old.status = 'lost' then 'lost' else 'retired' end,
      current_credential_id = null,
      retired_at = case when v_old.status = 'lost' then retired_at else v_now end,
      updated_by = p_actor_id
  where id = v_old.inventory_id;

  update public.credential_entitlements
  set status = 'removed',
      removed_by = p_actor_id,
      removed_at = v_now,
      removal_reason = 'Credential replaced',
      updated_at = v_now
  where credential_id = p_old_credential_id
    and status in ('active', 'suspended');

  insert into public.physical_credentials (
    inventory_id,
    user_id,
    credential_public_id,
    credential_type,
    chip_family,
    key_version,
    authentication_mode,
    status,
    issued_by,
    issued_at,
    replacement_of_id,
    verification_metadata
  )
  values (
    p_new_inventory_id,
    v_old.user_id,
    p_new_credential_public_id,
    case when v_inventory.chip_family ilike '%desfire%' then 'desfire_ev3' else 'ntag_pilot' end,
    v_inventory.chip_family,
    v_inventory.key_version,
    case when v_inventory.chip_family ilike '%desfire%' then 'desfire_mutual_auth' else 'server_entitlement' end,
    'issued',
    p_actor_id,
    v_now,
    p_old_credential_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into v_new;

  update public.physical_credentials
  set replaced_by_id = v_new.id
  where id = p_old_credential_id;

  update public.credential_inventory
  set inventory_status = 'issued',
      current_credential_id = v_new.id,
      issued_at = v_now,
      updated_by = p_actor_id
  where id = p_new_inventory_id;

  insert into public.credential_entitlements (
    credential_id,
    order_item_id,
    event_id,
    holder_user_id,
    status,
    valid_from,
    valid_until,
    assigned_by,
    assignment_source,
    assigned_at,
    metadata
  )
  select
    v_new.id,
    ce.order_item_id,
    ce.event_id,
    ce.holder_user_id,
    'active',
    v_now,
    ce.valid_until,
    p_actor_id,
    'replacement',
    v_now,
    jsonb_build_object('replacement_of_id', p_old_credential_id)
  from public.credential_entitlements ce
  where ce.credential_id = p_old_credential_id
    and ce.status in ('removed', 'expired')
    and ce.removed_at = v_now;

  insert into public.credential_taps (
    credential_id, inventory_id, operator_user_id, tap_type, outcome,
    reason_code, occurred_at, client_attempt_id, metadata
  )
  values (
    v_new.id, p_new_inventory_id, p_actor_id, 'replacement', 'replacement_issued',
    'tapband_replacement_issued', v_now, p_attempt_id,
    jsonb_build_object('replacement_of_id', p_old_credential_id) || coalesce(p_metadata, '{}'::jsonb)
  );

  perform public.fn_tapband_audit_lifecycle(
    v_inventory.org_id,
    p_actor_id,
    'physical_credentials',
    v_new.id,
    'insert',
    jsonb_build_object('status', 'issued', 'replacement_of_id', p_old_credential_id)
  );

  return jsonb_build_object('ok', true, 'status', 'issued', 'credential_id', v_new.id, 'replacement_of_id', p_old_credential_id, 'idempotent', false);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_replacement_conflict', 'message', 'Replacement would create a duplicate active entitlement or credential');
end
$function$;

create or replace function public.fn_tapband_resolve_credential_for_event(
  p_credential_public_id text,
  p_event_id uuid,
  p_actor_id uuid,
  p_device_id uuid default null,
  p_session_id uuid default null,
  p_attempt_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_credential record;
  v_entitlement record;
  v_existing record;
  v_now timestamptz := now();
  v_outcome text;
  v_reason text;
  v_order_item_id uuid := null;
  v_ticket_type_name text := null;
begin
  if not public.fn_tapband_actor_can_manage_event(p_actor_id, p_event_id) then
    return jsonb_build_object('ok', false, 'valid', false, 'reason_code', 'tapband_unauthorized', 'message', 'Not authorized to resolve credential for this event');
  end if;

  if p_attempt_id is not null then
    select * into v_existing
    from public.credential_taps
    where operator_user_id = p_actor_id
      and client_attempt_id = p_attempt_id
      and tap_type in ('identify', 'check_in')
    limit 1;

    if found then
      return jsonb_build_object(
        'ok', v_existing.outcome = 'valid',
        'valid', v_existing.outcome = 'valid',
        'reason_code', v_existing.reason_code,
        'outcome', v_existing.outcome,
        'credential_id', v_existing.credential_id,
        'inventory_id', v_existing.inventory_id,
        'event_id', v_existing.event_id,
        'order_item_id', v_existing.order_item_id,
        'idempotent', true
      );
    end if;
  end if;

  select pc.*
    into v_credential
  from public.physical_credentials pc
  where pc.credential_public_id = p_credential_public_id
  limit 1;

  if not found then
    insert into public.credential_taps (
      event_id, device_id, device_session_id, operator_user_id, presented_credential_hash,
      tap_type, outcome, reason_code, occurred_at, client_attempt_id
    )
    values (
      p_event_id, p_device_id, p_session_id, p_actor_id, p_credential_public_id,
      'identify', 'unknown', 'tapband_unknown', v_now, p_attempt_id
    );

    return jsonb_build_object('ok', false, 'valid', false, 'reason_code', 'tapband_unknown', 'message', 'Credential not found');
  end if;

  if v_credential.status <> 'active' then
    v_outcome := v_credential.status;
    v_reason := 'tapband_' || v_credential.status;
  else
    select ce.id as entitlement_id,
           ce.order_item_id,
           oi.status as order_item_status,
           oi.checked_in_at,
           o.status as order_status,
           tt.name as ticket_type_name
      into v_entitlement
    from public.credential_entitlements ce
    join public.order_items oi on oi.id = ce.order_item_id
    join public.orders o on o.id = oi.order_id
    join public.ticket_types tt on tt.id = oi.ticket_type_id
    where ce.credential_id = v_credential.id
      and ce.event_id = p_event_id
      and ce.status = 'active'
      and ce.valid_from <= v_now
      and (ce.valid_until is null or ce.valid_until > v_now)
    order by ce.assigned_at
    limit 1
    for update of oi;

    if not found then
      v_outcome := 'no_entitlement';
      v_reason := 'tapband_no_entitlement';
    else
      v_order_item_id := v_entitlement.order_item_id;
      v_ticket_type_name := v_entitlement.ticket_type_name;

      if v_entitlement.order_status <> 'paid' then
        v_outcome := 'not_paid';
        v_reason := 'tapband_not_paid';
      elsif v_entitlement.order_item_status in ('revoked', 'refunded') then
        v_outcome := v_entitlement.order_item_status;
        v_reason := 'tapband_ticket_' || v_entitlement.order_item_status;
      elsif v_entitlement.order_item_status = 'checked_in' or v_entitlement.checked_in_at is not null then
        v_outcome := 'already_used';
        v_reason := 'tapband_already_used';
      else
        v_outcome := 'valid';
        v_reason := 'tapband_valid_entitlement';
      end if;
    end if;
  end if;

  insert into public.credential_taps (
    credential_id, inventory_id, event_id, order_item_id, device_id, device_session_id,
    operator_user_id, tap_type, outcome, reason_code, occurred_at, client_attempt_id
  )
  values (
    v_credential.id,
    v_credential.inventory_id,
    p_event_id,
    v_order_item_id,
    p_device_id,
    p_session_id,
    p_actor_id,
    'check_in',
    v_outcome,
    v_reason,
    v_now,
    p_attempt_id
  );

  if v_outcome = 'valid' and v_order_item_id is not null then
    update public.order_items
    set status = 'checked_in',
        checked_in_at = v_now,
        updated_at = v_now
    where id = v_order_item_id;

    update public.physical_credentials
    set last_used_at = v_now,
        updated_at = v_now
    where id = v_credential.id;
  end if;

  return jsonb_build_object(
    'ok', v_outcome = 'valid',
    'valid', v_outcome = 'valid',
    'reason_code', v_reason,
    'outcome', v_outcome,
    'credential_id', v_credential.id,
    'inventory_id', v_credential.inventory_id,
    'event_id', p_event_id,
    'order_item_id', v_order_item_id,
    'ticket_type_name', v_ticket_type_name,
    'checked_in_at', case when v_outcome = 'valid' then v_now else null end
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'valid', false, 'reason_code', 'tapband_attempt_conflict', 'outcome', 'attempt_conflict', 'message', 'TapBand attempt was already processed');
end
$function$;

create or replace function public.fn_tapband_customer_credentials(p_user_id uuid)
returns jsonb
language sql
security definer
set search_path to 'public'
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
    'credential_id', pc.id,
    'credential_public_id', pc.credential_public_id,
    'inventory_id', pc.inventory_id,
    'status', pc.status,
    'credential_type', pc.credential_type,
    'chip_family', pc.chip_family,
    'key_version', pc.key_version,
    'issued_at', pc.issued_at,
    'activated_at', pc.activated_at,
    'last_used_at', pc.last_used_at,
    'revoked_at', pc.revoked_at,
    'replacement_of_id', pc.replacement_of_id,
    'replaced_by_id', pc.replaced_by_id
  ) order by pc.created_at desc), '[]'::jsonb)
  from public.physical_credentials pc
  where pc.user_id = p_user_id
$function$;

revoke execute on function public.fn_tapband_actor_is_platform_admin(uuid) from public;
revoke execute on function public.fn_tapband_actor_can_manage_event(uuid, uuid) from public;
revoke execute on function public.fn_tapband_audit_lifecycle(uuid, uuid, text, uuid, text, jsonb) from public;
revoke execute on function public.fn_tapband_issue_credential(uuid, uuid, text, uuid, uuid, uuid, text, jsonb) from public;
revoke execute on function public.fn_tapband_activate_credential(uuid, uuid, uuid, uuid, text, jsonb) from public;
revoke execute on function public.fn_tapband_assign_entitlement(uuid, uuid, uuid, uuid, text, text, jsonb) from public;
revoke execute on function public.fn_tapband_revoke_credential(uuid, uuid, text, text, text, jsonb) from public;
revoke execute on function public.fn_tapband_replace_credential(uuid, uuid, text, uuid, text, jsonb) from public;
revoke execute on function public.fn_tapband_resolve_credential_for_event(text, uuid, uuid, uuid, uuid, text) from public;
revoke execute on function public.fn_tapband_customer_credentials(uuid) from public;

grant execute on function public.fn_tapband_issue_credential(uuid, uuid, text, uuid, uuid, uuid, text, jsonb) to service_role;
grant execute on function public.fn_tapband_activate_credential(uuid, uuid, uuid, uuid, text, jsonb) to service_role;
grant execute on function public.fn_tapband_assign_entitlement(uuid, uuid, uuid, uuid, text, text, jsonb) to service_role;
grant execute on function public.fn_tapband_revoke_credential(uuid, uuid, text, text, text, jsonb) to service_role;
grant execute on function public.fn_tapband_replace_credential(uuid, uuid, text, uuid, text, jsonb) to service_role;
grant execute on function public.fn_tapband_resolve_credential_for_event(text, uuid, uuid, uuid, uuid, text) to service_role;
grant execute on function public.fn_tapband_customer_credentials(uuid) to service_role;

commit;
