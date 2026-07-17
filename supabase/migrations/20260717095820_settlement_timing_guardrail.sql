-- TICK-260: settlement-aware payout guardrail.
--
-- Paystack South Africa settles local ZAR payouts after two working days.
-- Until provider settlement imports are modeled directly, keep organizer
-- payouts behind a conservative four-calendar-day hold on payment_net rows.

begin;

drop function if exists public.fn_org_finance_summary(uuid);

create or replace function public.fn_org_finance_summary(
  p_org_id uuid,
  p_from  timestamptz default null,
  p_to    timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_currency text;
  v_gross integer := 0;
  v_fees integer := 0;
  v_net integer := 0;
  v_refunds integer := 0;
  v_committed integer := 0;
  v_pending integer := 0;
  v_paid integer := 0;
  v_captured_available integer := 0;
  v_settled_net integer := 0;
  v_available integer := 0;
  v_pending_settlement integer := 0;
  v_settlement_hold_days integer := 4;
  v_settlement_cutoff timestamptz := now() - make_interval(days => v_settlement_hold_days);
begin
  if p_org_id is null then
    raise exception 'org_id_required' using errcode = 'P0001';
  end if;

  if not public.is_org_finance_viewer(p_org_id) then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;

  select coalesce(default_currency, 'SZL') into v_currency
  from public.organizations where id = p_org_id;
  v_currency := coalesce(v_currency, 'SZL');

  select
    coalesce(sum(amount_cents) filter (where type = 'order_gross'), 0),
    coalesce(sum(abs(amount_cents)) filter (where type = 'fee'), 0),
    coalesce(sum(amount_cents) filter (where type = 'payment_net'), 0),
    coalesce(sum(amount_cents) filter (where type = 'refund'), 0),
    coalesce(sum(amount_cents) filter (where type = 'payment_net' and occurred_at <= v_settlement_cutoff), 0)
  into v_gross, v_fees, v_net, v_refunds, v_settled_net
  from public.ledger_entries
  where org_id = p_org_id
    and (p_from is null or occurred_at >= p_from)
    and (p_to   is null or occurred_at <  p_to + interval '1 day');

  -- Payout figures are not date-scoped; they reflect committed outflow.
  select
    coalesce(sum(amount_cents) filter (where status in ('requested', 'processing', 'paid')), 0),
    coalesce(sum(amount_cents) filter (where status in ('requested', 'processing')), 0),
    coalesce(sum(amount_cents) filter (where status = 'paid'), 0)
  into v_committed, v_pending, v_paid
  from public.payouts
  where org_id = p_org_id;

  v_captured_available := greatest(0, v_net - v_refunds - v_committed);
  v_available := greatest(0, v_settled_net - v_refunds - v_committed);
  v_pending_settlement := greatest(0, v_captured_available - v_available);

  return jsonb_build_object(
    'currency', v_currency,
    'gross_cents', v_gross,
    'fees_cents', v_fees,
    'net_cents', v_net,
    'refunds_cents', v_refunds,
    'paid_out_cents', v_paid,
    'pending_payout_cents', v_pending,
    'available_cents', v_available,
    'captured_available_cents', v_captured_available,
    'settled_net_cents', v_settled_net,
    'pending_settlement_cents', v_pending_settlement,
    'settlement_hold_days', v_settlement_hold_days,
    'settlement_cutoff', v_settlement_cutoff
  );
end;
$function$;

revoke execute on function public.fn_org_finance_summary(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.fn_org_finance_summary(uuid, timestamptz, timestamptz) to authenticated;

create or replace function public.fn_request_payout(p_org_id uuid, p_amount_cents integer)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_currency text;
  v_provider text;
  v_available integer;
  v_captured_available integer;
  v_pending_settlement integer;
  v_summary jsonb;
  v_payout_id uuid;
  v_actor uuid := auth.uid();
begin
  if p_org_id is null then
    raise exception 'org_id_required' using errcode = 'P0001';
  end if;

  if not (public.is_org_admin(p_org_id) or public.is_super_admin(v_actor)) then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;

  select provider into v_provider
  from public.payout_accounts
  where org_id = p_org_id
  order by created_at
  limit 1;

  if v_provider is null then
    raise exception 'no_payout_account' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.payouts
    where org_id = p_org_id and status in ('requested', 'processing')
  ) then
    raise exception 'payout_in_progress' using errcode = 'P0001';
  end if;

  v_summary := public.fn_org_finance_summary(p_org_id, null, null);
  v_available := coalesce((v_summary->>'available_cents')::integer, 0);
  v_captured_available := coalesce((v_summary->>'captured_available_cents')::integer, v_available);
  v_pending_settlement := coalesce((v_summary->>'pending_settlement_cents')::integer, 0);
  v_currency := v_summary->>'currency';

  if p_amount_cents > v_available then
    if p_amount_cents <= v_captured_available then
      raise exception 'funds_pending_settlement' using errcode = 'P0001';
    end if;

    raise exception 'insufficient_balance' using errcode = 'P0001';
  end if;

  insert into public.payouts (org_id, amount_cents, currency, provider, status)
  values (p_org_id, p_amount_cents, v_currency, v_provider, 'requested')
  returning id into v_payout_id;

  insert into public.audit_log (org_id, actor_id, table_name, record_id, action, changes)
  values (
    p_org_id, v_actor, 'payouts', v_payout_id::text, 'insert',
    jsonb_build_object(
      'amount_cents', p_amount_cents,
      'currency', v_currency,
      'status', 'requested',
      'provider', v_provider,
      'settled_available_cents', v_available,
      'captured_available_cents', v_captured_available,
      'pending_settlement_cents', v_pending_settlement,
      'settlement_hold_days', coalesce((v_summary->>'settlement_hold_days')::integer, 4)
    )
  );

  return jsonb_build_object(
    'payout_id', v_payout_id,
    'status', 'requested',
    'amount_cents', p_amount_cents,
    'currency', v_currency,
    'settled_available_cents', v_available,
    'captured_available_cents', v_captured_available,
    'pending_settlement_cents', v_pending_settlement
  );
end;
$function$;

revoke execute on function public.fn_request_payout(uuid, integer) from public, anon;
grant execute on function public.fn_request_payout(uuid, integer) to authenticated;

commit;
