-- Read-only platform admins must not move money state. fn_transition_payout and
-- fn_transition_refund gated on app.is_platform_admin(), which accepts any
-- active admin tier, so a read_only_admin could call them directly over
-- PostgREST and mark payouts paid or refunds processed. Gate on
-- app.can_platform_mutate() (20261113100000_role_mutation_boundaries) instead.
-- Function bodies are otherwise unchanged.

create or replace function public.fn_transition_payout(
  p_payout_id uuid,
  p_new_status public.payout_status,
  p_destination_ref text default null
)
returns public.payouts
language plpgsql
security definer
set search_path = pg_catalog, app, public
as $function$
declare v_payout public.payouts;
begin
  perform app.require_claimed_account();
  if not app.can_platform_mutate() then raise exception 'not_authorized' using errcode='42501'; end if;
  if p_new_status not in ('processing','paid','failed','cancelled') then raise exception 'invalid_payout_status' using errcode='22023'; end if;
  update public.payouts
  set status = p_new_status,
      destination_ref = coalesce(p_destination_ref, destination_ref),
      paid_at = case when p_new_status = 'paid' then now() else paid_at end
  where id = p_payout_id
  returning * into v_payout;
  if not found then raise exception 'payout_not_found' using errcode='P0002'; end if;
  return v_payout;
end;
$function$;

create or replace function public.fn_transition_refund(
  p_refund_id uuid,
  p_new_status public.refund_status,
  p_provider_ref text default null,
  p_provider_payload jsonb default null
)
returns public.refunds
language plpgsql
security definer
set search_path = pg_catalog, app, public
as $function$
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
    if not (v_is_service or app.can_platform_mutate()) then
      raise exception 'provider_or_platform_admin_required' using errcode = '42501';
    end if;
  elsif not (v_is_service or app.is_org_finance_viewer(v_org) or app.can_platform_mutate()) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  update public.refunds
  set status = p_new_status,
      provider_ref = case
        when v_is_service or app.can_platform_mutate()
          then coalesce(p_provider_ref, provider_ref)
        else provider_ref
      end,
      provider_payload = case
        when v_is_service or app.can_platform_mutate()
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
$function$;
