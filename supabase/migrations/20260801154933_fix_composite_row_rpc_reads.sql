-- TICK-337: make device-session and refund authorization paths reach their
-- caller checks when the target row exists.

begin;

create or replace function public.fn_end_device_session(p_session_id uuid)
returns public.device_sessions
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
declare
  v_session public.device_sessions;
  v_org uuid;
begin
  perform app.require_claimed_account();

  select ds.* into v_session
  from public.device_sessions ds
  where ds.id = p_session_id
  for update;

  if not found then
    raise exception 'device_session_not_found' using errcode = 'P0002';
  end if;

  select d.org_id into v_org
  from public.devices d
  where d.id = v_session.device_id;

  if not (v_session.user_id = auth.uid() or app.is_org_manager(v_org)) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  update public.device_sessions
  set ended_at = coalesce(ended_at, now())
  where id = p_session_id
  returning * into v_session;

  return v_session;
end;
$$;

revoke all on function public.fn_end_device_session(uuid) from public, anon;
grant execute on function public.fn_end_device_session(uuid) to authenticated, service_role;

create or replace function public.fn_transition_refund(
  p_refund_id uuid,
  p_new_status public.refund_status,
  p_provider_ref text default null,
  p_provider_payload jsonb default null
)
returns public.refunds
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
declare
  v_refund public.refunds;
  v_org uuid;
  v_is_service boolean := coalesce(auth.jwt() ->> 'role', '') = 'service_role';
begin
  if not v_is_service then
    perform app.require_claimed_account();
  end if;

  select r.* into v_refund
  from public.refunds r
  where r.id = p_refund_id
  for update;

  if not found then
    raise exception 'refund_not_found' using errcode = 'P0002';
  end if;

  select o.org_id into v_org
  from public.payments py
  join public.orders o on o.id = py.order_id
  where py.id = v_refund.payment_id;

  if p_new_status not in ('processing', 'processed', 'failed', 'cancelled') then
    raise exception 'invalid_refund_status' using errcode = '22023';
  end if;

  if p_new_status in ('processed', 'failed') then
    if not (v_is_service or app.is_platform_admin()) then
      raise exception 'provider_or_platform_admin_required' using errcode = '42501';
    end if;
  elsif not (v_is_service or app.is_org_finance_viewer(v_org) or app.is_platform_admin()) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  update public.refunds
  set status = p_new_status,
      provider_ref = case
        when v_is_service or app.is_platform_admin()
          then coalesce(p_provider_ref, provider_ref)
        else provider_ref
      end,
      provider_payload = case
        when v_is_service or app.is_platform_admin()
          then coalesce(p_provider_payload, provider_payload)
        else provider_payload
      end,
      processed_at = case
        when p_new_status in ('processed', 'failed', 'cancelled') then now()
        else processed_at
      end
  where id = p_refund_id
  returning * into v_refund;

  return v_refund;
end;
$$;

revoke all on function public.fn_transition_refund(
  uuid,
  public.refund_status,
  text,
  jsonb
) from public, anon;
grant execute on function public.fn_transition_refund(
  uuid,
  public.refund_status,
  text,
  jsonb
) to authenticated, service_role;

commit;
