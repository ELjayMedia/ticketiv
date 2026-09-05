-- fn_scan_ticket: atomic ticket validation, scan recording, and check-in.
--
-- All three operations (read ticket state, insert scans row, update
-- order_items.checked_in_at) happen inside one transaction under a row-level
-- lock. A phantom scan record (scan inserted but check-in failed) or a silent
-- check-in (check-in succeeded but audit row missing) are both impossible.
--
-- Idempotency: pass a client-generated p_attempt_id for offline sync retries.
-- The value is stored in scans.request_hash. The partial unique index below
-- ensures a second call with the same attempt_id returns the original result
-- without re-processing.

create unique index if not exists scans_unique_request_hash
  on public.scans (request_hash)
  where request_hash is not null;

create or replace function public.fn_scan_ticket(
  p_ticket_code  text,
  p_event_id     uuid,
  p_scanned_by   uuid,
  p_device_id    uuid        default null,
  p_session_id   uuid        default null,
  p_gate         text        default null,
  p_scanned_at   timestamptz default now(),
  p_attempt_id   text        default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_org_id     uuid;
  v_authorized boolean := false;
  v_item       record;
  v_scan_id    uuid;
  v_existing   record;
begin
  -- Idempotency: return stored result if this attempt was already processed.
  if p_attempt_id is not null then
    select * into v_existing
    from public.scans
    where request_hash = p_attempt_id
    limit 1;

    if found then
      return jsonb_build_object(
        'outcome',       v_existing.outcome,
        'valid',         v_existing.outcome = 'valid',
        'message',       'Already processed',
        'scan_id',       v_existing.id,
        'order_item_id', v_existing.order_item_id,
        'idempotent',    true
      );
    end if;
  end if;

  -- Authorization -----------------------------------------------------------

  select e.org_id into v_org_id
  from public.events e
  where e.id = p_event_id;

  if v_org_id is null then
    return jsonb_build_object('outcome', 'error', 'valid', false, 'message', 'Event not found');
  end if;

  if exists (select 1 from public.admin_users where user_id = p_scanned_by and active = true) then
    v_authorized := true;
  end if;

  if not v_authorized and exists (
    select 1 from public.org_members
    where org_id = v_org_id
      and user_id = p_scanned_by
      and role in ('admin','organizer','organizer_owner','organizer_admin','organizer_staff','scanner')
  ) then
    v_authorized := true;
  end if;

  if not v_authorized and exists (
    select 1 from public.event_staff
    where event_id = p_event_id
      and user_id = p_scanned_by
      and active = true
      and role in ('admin','organizer_admin','organizer_staff','scanner','event_staff','event_admin')
  ) then
    v_authorized := true;
  end if;

  if not v_authorized then
    return jsonb_build_object('outcome', 'unauthorized', 'valid', false, 'message', 'Not authorized to scan for this event');
  end if;

  -- Ticket lookup + row lock ------------------------------------------------
  -- FOR UPDATE OF oi locks only the order_items row. The second concurrent
  -- scan of the same ticket will wait here until the first transaction commits,
  -- then see status = 'checked_in' and return 'duplicate'.

  select oi.id,
         oi.status,
         oi.checked_in_at,
         tt.event_id  as tt_event_id,
         tt.name      as ticket_type_name,
         o.status     as order_status
  into   v_item
  from   public.order_items  oi
  join   public.ticket_types tt on tt.id  = oi.ticket_type_id
  join   public.orders        o  on  o.id = oi.order_id
  where  oi.ticket_code = p_ticket_code
  for update of oi;

  if not found then
    insert into public.scans
      (event_id, ticket_code, outcome, device_id, device_session_id, gate, scanned_at, notes, request_hash)
    values
      (p_event_id, p_ticket_code, 'invalid', p_device_id, p_session_id, p_gate, p_scanned_at, 'Ticket code not found', p_attempt_id)
    returning id into v_scan_id;

    return jsonb_build_object('outcome', 'not_found', 'valid', false, 'message', 'Ticket not found', 'scan_id', v_scan_id);
  end if;

  -- Wrong event
  if v_item.tt_event_id != p_event_id then
    insert into public.scans
      (event_id, order_item_id, ticket_code, outcome, device_id, device_session_id, gate, scanned_at, notes, request_hash)
    values
      (p_event_id, v_item.id, p_ticket_code, 'wrong_event', p_device_id, p_session_id, p_gate, p_scanned_at, 'Ticket belongs to a different event', p_attempt_id)
    returning id into v_scan_id;

    return jsonb_build_object('outcome', 'wrong_event', 'valid', false, 'message', 'Ticket is for a different event', 'scan_id', v_scan_id, 'order_item_id', v_item.id);
  end if;

  -- Unpaid order
  if v_item.order_status != 'paid' then
    insert into public.scans
      (event_id, order_item_id, ticket_code, outcome, device_id, device_session_id, gate, scanned_at, notes, request_hash)
    values
      (p_event_id, v_item.id, p_ticket_code, 'invalid', p_device_id, p_session_id, p_gate, p_scanned_at, 'Order has not been paid', p_attempt_id)
    returning id into v_scan_id;

    return jsonb_build_object('outcome', 'not_paid', 'valid', false, 'message', 'Order has not been paid', 'scan_id', v_scan_id, 'order_item_id', v_item.id);
  end if;

  -- Refunded
  if v_item.status = 'refunded' then
    insert into public.scans
      (event_id, order_item_id, ticket_code, outcome, device_id, device_session_id, gate, scanned_at, notes, request_hash)
    values
      (p_event_id, v_item.id, p_ticket_code, 'revoked', p_device_id, p_session_id, p_gate, p_scanned_at, 'Ticket has been refunded', p_attempt_id)
    returning id into v_scan_id;

    return jsonb_build_object('outcome', 'refunded', 'valid', false, 'message', 'Ticket has been refunded', 'scan_id', v_scan_id, 'order_item_id', v_item.id);
  end if;

  -- Revoked
  if v_item.status = 'revoked' then
    insert into public.scans
      (event_id, order_item_id, ticket_code, outcome, device_id, device_session_id, gate, scanned_at, notes, request_hash)
    values
      (p_event_id, v_item.id, p_ticket_code, 'revoked', p_device_id, p_session_id, p_gate, p_scanned_at, 'Ticket has been revoked', p_attempt_id)
    returning id into v_scan_id;

    return jsonb_build_object('outcome', 'revoked', 'valid', false, 'message', 'Ticket has been revoked', 'scan_id', v_scan_id, 'order_item_id', v_item.id);
  end if;

  -- Already checked in (status or timestamp — both checked so nothing slips through)
  if v_item.status = 'checked_in' or v_item.checked_in_at is not null then
    insert into public.scans
      (event_id, order_item_id, ticket_code, outcome, device_id, device_session_id, gate, scanned_at, request_hash)
    values
      (p_event_id, v_item.id, p_ticket_code, 'already_used', p_device_id, p_session_id, p_gate, p_scanned_at, p_attempt_id)
    returning id into v_scan_id;

    return jsonb_build_object('outcome', 'duplicate', 'valid', false, 'message', 'Ticket was already scanned', 'scan_id', v_scan_id, 'order_item_id', v_item.id);
  end if;

  -- Valid first-time scan: insert scan + update order_items atomically.
  -- The scans_one_success_per_ticket unique index provides a second-layer
  -- guard if two transactions somehow both reach this point.

  insert into public.scans
    (event_id, order_item_id, ticket_code, outcome, device_id, device_session_id, gate, scanned_at, request_hash)
  values
    (p_event_id, v_item.id, p_ticket_code, 'valid', p_device_id, p_session_id, p_gate, p_scanned_at, p_attempt_id)
  returning id into v_scan_id;

  update public.order_items
  set    status       = 'checked_in',
         checked_in_at = p_scanned_at,
         updated_at   = now()
  where  id = v_item.id;

  return jsonb_build_object(
    'outcome',          'validated',
    'valid',            true,
    'message',          'Ticket validated',
    'scan_id',          v_scan_id,
    'order_item_id',    v_item.id,
    'ticket_type_name', v_item.ticket_type_name,
    'checked_in_at',    p_scanned_at
  );

exception
  -- Two transactions raced past the status check. The unique partial index on
  -- (event_id, ticket_code) WHERE outcome = 'valid' stops the second insert.
  -- Return duplicate so the scanner UI behaves correctly.
  when unique_violation then
    insert into public.scans
      (event_id, order_item_id, ticket_code, outcome, device_id, device_session_id, gate, scanned_at, notes, request_hash)
    values
      (p_event_id, v_item.id, p_ticket_code, 'already_used', p_device_id, p_session_id, p_gate, p_scanned_at, 'Concurrent scan', p_attempt_id)
    on conflict do nothing;

    return jsonb_build_object('outcome', 'duplicate', 'valid', false, 'message', 'Ticket was already scanned (concurrent)', 'order_item_id', v_item.id);
end;
$fn$;
