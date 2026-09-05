-- Helper RPC: enqueue webhook deliveries for an event type. Called from
-- app code (or future triggers) when an event occurs. Selects all active
-- subscribers and inserts one webhook_deliveries row per endpoint with
-- next_retry_at = now() (i.e. ready for the dispatch worker).

create or replace function public.fn_enqueue_webhook(
  p_event_type text,
  p_payload jsonb,
  p_org_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted int;
begin
  if p_event_type is null or length(trim(p_event_type)) = 0 then
    raise exception 'event_type required';
  end if;

  insert into public.webhook_deliveries (
    endpoint_id, event_type, payload, attempt_no, next_retry_at, created_at
  )
  select
    e.id,
    p_event_type,
    p_payload,
    1,
    now(),
    now()
  from public.webhook_endpoints e
  where e.is_active = true
    and p_event_type = any(e.events)
    and (
      e.org_id is null  -- platform-level subscriber
      or e.org_id = p_org_id
    );

  get diagnostics v_inserted = row_count;
  return coalesce(v_inserted, 0);
end
$$;

revoke execute on function public.fn_enqueue_webhook(text, jsonb, uuid) from public, anon;
grant execute on function public.fn_enqueue_webhook(text, jsonb, uuid) to service_role;

comment on function public.fn_enqueue_webhook is
  'Enqueue webhook deliveries for an event. Service-role only; app code or DB triggers call this.';
;
