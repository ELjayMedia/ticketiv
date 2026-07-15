-- TICK-294 - TapBand online scanner check-in.
--
-- Keep TapBand entry atomic with the normal scanner audit trail: each online
-- credential resolution writes both credential_taps and scans in the same RPC.

begin;

drop function if exists public.fn_tapband_resolve_credential_for_event(text, uuid, uuid, uuid, uuid, text);

create or replace function public.fn_tapband_resolve_credential_for_event(
  p_credential_public_id text,
  p_event_id uuid,
  p_actor_id uuid,
  p_device_id uuid default null,
  p_session_id uuid default null,
  p_attempt_id text default null,
  p_gate text default null,
  p_scanned_at timestamptz default now()
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
  v_existing_scan_id uuid := null;
  v_now timestamptz := coalesce(p_scanned_at, now());
  v_authorized boolean := false;
  v_outcome text;
  v_reason text;
  v_order_item_id uuid := null;
  v_ticket_type_name text := null;
  v_ticket_code text := null;
  v_scan_id uuid := null;
  v_scan_outcome text := 'invalid';
  v_scan_ticket_code text;
  v_scan_notes text;
  v_request_hash text := case when p_attempt_id is null then null else 'tapband:' || p_attempt_id end;
  v_presented_hash text := md5(coalesce(p_credential_public_id, ''));
begin
  if p_credential_public_id is null or btrim(p_credential_public_id) = '' then
    return jsonb_build_object('ok', false, 'valid', false, 'reason_code', 'tapband_reader_error', 'outcome', 'reader_error', 'message', 'TapBand credential could not be read');
  end if;

  if public.fn_tapband_actor_can_manage_event(p_actor_id, p_event_id) then
    v_authorized := true;
  end if;

  if not v_authorized and p_device_id is not null and p_session_id is not null and exists (
    select 1
    from public.device_sessions ds
    join public.devices d on d.id = ds.device_id
    join public.events e on e.id = p_event_id
    where ds.id = p_session_id
      and ds.device_id = p_device_id
      and ds.ended_at is null
      and d.org_id = e.org_id
      and d.event_id = p_event_id
      and d.device_role in ('organizer_scanner', 'organizer_kiosk')
  ) then
    v_authorized := true;

    update public.devices
    set last_seen_at = now()
    where id = p_device_id;
  end if;

  if not v_authorized then
    return jsonb_build_object('ok', false, 'valid', false, 'reason_code', 'tapband_unauthorized', 'outcome', 'unauthorized', 'message', 'Not authorized to resolve credential for this event');
  end if;

  if p_attempt_id is not null then
    select * into v_existing
    from public.credential_taps
    where client_attempt_id = p_attempt_id
      and tap_type in ('identify', 'check_in')
      and (
        (p_actor_id is not null and operator_user_id = p_actor_id)
        or (p_actor_id is null and p_device_id is not null and device_id = p_device_id)
      )
    limit 1;

    if found then
      select id into v_existing_scan_id
      from public.scans
      where request_hash = v_request_hash
      limit 1;

      return jsonb_build_object(
        'ok', v_existing.outcome = 'valid',
        'valid', v_existing.outcome = 'valid',
        'reason_code', v_existing.reason_code,
        'outcome', v_existing.outcome,
        'credential_id', v_existing.credential_id,
        'inventory_id', v_existing.inventory_id,
        'event_id', v_existing.event_id,
        'order_item_id', v_existing.order_item_id,
        'scan_id', v_existing_scan_id,
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
    v_outcome := 'unknown';
    v_reason := 'tapband_unknown';
    v_scan_ticket_code := 'tapband:' || left(v_presented_hash, 16);
    v_scan_notes := 'TapBand credential not found';

    insert into public.credential_taps (
      event_id, device_id, device_session_id, operator_user_id, presented_credential_hash,
      tap_type, outcome, reason_code, occurred_at, client_attempt_id
    )
    values (
      p_event_id, p_device_id, p_session_id, p_actor_id, v_presented_hash,
      'identify', v_outcome, v_reason, v_now, p_attempt_id
    );

    insert into public.scans
      (event_id, ticket_code, outcome, device_id, device_session_id, gate, scanned_at, notes, request_hash)
    values
      (p_event_id, v_scan_ticket_code, 'invalid', p_device_id, p_session_id, p_gate, v_now, v_scan_notes, v_request_hash)
    returning id into v_scan_id;

    return jsonb_build_object('ok', false, 'valid', false, 'reason_code', v_reason, 'outcome', v_outcome, 'message', 'TapBand credential not found', 'scan_id', v_scan_id);
  end if;

  if v_credential.status <> 'active' then
    v_outcome := v_credential.status;
    v_reason := 'tapband_' || v_credential.status;
  else
    select ce.id as entitlement_id,
           ce.order_item_id,
           oi.ticket_code,
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
      v_ticket_code := v_entitlement.ticket_code;

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

  v_scan_outcome := case
    when v_outcome = 'valid' then 'valid'
    when v_outcome = 'already_used' then 'already_used'
    when v_outcome in ('revoked', 'lost', 'replaced', 'retired', 'destroyed', 'defective', 'refunded') then 'revoked'
    else 'invalid'
  end;
  v_scan_ticket_code := coalesce(v_ticket_code, 'tapband:' || left(v_presented_hash, 16));
  v_scan_notes := 'TapBand: ' || v_reason;

  insert into public.scans
    (event_id, order_item_id, ticket_code, outcome, device_id, device_session_id, gate, scanned_at, notes, request_hash)
  values
    (p_event_id, v_order_item_id, v_scan_ticket_code, v_scan_outcome, p_device_id, p_session_id, p_gate, v_now, v_scan_notes, v_request_hash)
  returning id into v_scan_id;

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
    'scan_id', v_scan_id,
    'ticket_type_name', v_ticket_type_name,
    'checked_in_at', case when v_outcome = 'valid' then v_now else null end
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'valid', false, 'reason_code', 'tapband_attempt_conflict', 'outcome', 'attempt_conflict', 'message', 'TapBand attempt was already processed');
end
$function$;

revoke execute on function public.fn_tapband_resolve_credential_for_event(text, uuid, uuid, uuid, uuid, text, text, timestamptz) from public;
grant execute on function public.fn_tapband_resolve_credential_for_event(text, uuid, uuid, uuid, uuid, text, text, timestamptz) to service_role;

commit;
