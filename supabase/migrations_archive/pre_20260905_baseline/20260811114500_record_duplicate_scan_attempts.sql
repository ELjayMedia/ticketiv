-- TICK-67: preserve an audit row when a scanner retries a ticket that has
-- already been checked in.
--
-- fn_scan_ticket_unchecked deliberately returns `duplicate` without writing a
-- second successful scan. Keep that API response for the scanner UI, but have
-- the authenticated wrapper record the attempt as `already_used` so event-day
-- audit history matches what staff actually saw.

create or replace function public.fn_scan_ticket(
  p_ticket_code text,
  p_event_id uuid,
  p_scanned_by uuid,
  p_device_id uuid default null::uuid,
  p_session_id uuid default null::uuid,
  p_gate text default null::text,
  p_scanned_at timestamptz default now(),
  p_attempt_id text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'app', 'public'
as $function$
declare
  v_result jsonb;
  v_scan_id uuid;
  v_effective_scan_time timestamptz := now();
begin
  perform app.require_claimed_account();

  v_result := public.fn_scan_ticket_unchecked(
    p_ticket_code,
    p_event_id,
    p_scanned_by,
    p_device_id,
    p_session_id,
    p_gate,
    p_scanned_at,
    p_attempt_id
  );

  if coalesce(v_result ->> 'outcome', '') = 'duplicate' then
    if coalesce(auth.jwt() ->> 'role', '') = 'service_role'
       and p_scanned_at between now() - interval '7 days' and now() + interval '5 minutes'
    then
      v_effective_scan_time := p_scanned_at;
    end if;

    insert into public.scans(
      event_id,
      order_item_id,
      ticket_code,
      outcome,
      device_id,
      device_session_id,
      gate,
      scanned_at,
      notes,
      request_hash
    )
    values (
      p_event_id,
      nullif(v_result ->> 'order_item_id', '')::uuid,
      p_ticket_code,
      'already_used',
      p_device_id,
      p_session_id,
      p_gate,
      v_effective_scan_time,
      'Ticket was already scanned',
      p_attempt_id
    )
    on conflict do nothing
    returning id into v_scan_id;

    if v_scan_id is not null then
      v_result := v_result || jsonb_build_object('scan_id', v_scan_id);
    end if;
  end if;

  return v_result;
end;
$function$;

notify pgrst, 'reload schema';
