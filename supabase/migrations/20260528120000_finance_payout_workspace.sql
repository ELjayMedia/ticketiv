-- TICK-39: finance & payout workspace.
--
-- Adds a single source of truth for an organizer's balance plus two
-- server-mediated actions:
--   * fn_org_finance_summary  — gross / fees / refunds / net / paid-out /
--     pending / available, derived from ledger_entries + payouts.
--   * fn_request_payout       — organizer requests a payout when eligible.
--
-- Admin-side payout transitions already live in
-- app/super-admin/finance-actions.ts (super_admin-gated, audited), so this
-- migration does not duplicate that state machine.
--
-- Balance model (kept deliberately simple and internally consistent so the
-- dashboard figure and the payout-eligibility check never disagree):
--   net earned     = Σ ledger_entries.amount_cents WHERE type='payment_net'
--   refunds        = Σ ledger_entries.amount_cents WHERE type='refund'
--   committed out  = Σ payouts.amount_cents WHERE status IN
--                      ('requested','processing','paid')
--   available      = net earned − refunds − committed out
-- The payouts table itself records committed outflow, so no payout ledger
-- rows are written here (avoids double-entry reconciliation drift).

begin;

-- ----------------------------------------------------------------------------
-- 1. Finance summary
-- ----------------------------------------------------------------------------
create or replace function public.fn_org_finance_summary(p_org_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
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
  v_available integer := 0;
begin
  if p_org_id is null then
    raise exception 'org_id_required' using errcode = 'P0001';
  end if;

  if not (public.is_org_member(p_org_id, auth.uid()) or public.is_super_admin(auth.uid())) then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;

  select coalesce(default_currency, 'SZL') into v_currency
  from public.organizations where id = p_org_id;
  v_currency := coalesce(v_currency, 'SZL');

  select
    coalesce(sum(amount_cents) filter (where type = 'order_gross'), 0),
    coalesce(sum(abs(amount_cents)) filter (where type = 'fee'), 0),
    coalesce(sum(amount_cents) filter (where type = 'payment_net'), 0),
    coalesce(sum(amount_cents) filter (where type = 'refund'), 0)
  into v_gross, v_fees, v_net, v_refunds
  from public.ledger_entries
  where org_id = p_org_id;

  select
    coalesce(sum(amount_cents) filter (where status in ('requested', 'processing', 'paid')), 0),
    coalesce(sum(amount_cents) filter (where status in ('requested', 'processing')), 0),
    coalesce(sum(amount_cents) filter (where status = 'paid'), 0)
  into v_committed, v_pending, v_paid
  from public.payouts
  where org_id = p_org_id;

  v_available := greatest(0, v_net - v_refunds - v_committed);

  return jsonb_build_object(
    'currency', v_currency,
    'gross_cents', v_gross,
    'fees_cents', v_fees,
    'net_cents', v_net,
    'refunds_cents', v_refunds,
    'paid_out_cents', v_paid,
    'pending_payout_cents', v_pending,
    'available_cents', v_available
  );
end;
$function$;

revoke execute on function public.fn_org_finance_summary(uuid) from public, anon;
grant execute on function public.fn_org_finance_summary(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 2. Request payout
-- ----------------------------------------------------------------------------
create or replace function public.fn_request_payout(p_org_id uuid, p_amount_cents integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_currency text;
  v_provider text;
  v_available integer;
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

  -- A payout account must exist before money can be requested.
  select provider into v_provider
  from public.payout_accounts
  where org_id = p_org_id
  order by created_at
  limit 1;

  if v_provider is null then
    raise exception 'no_payout_account' using errcode = 'P0001';
  end if;

  -- Only one in-flight payout at a time keeps the balance unambiguous.
  if exists (
    select 1 from public.payouts
    where org_id = p_org_id and status in ('requested', 'processing')
  ) then
    raise exception 'payout_in_progress' using errcode = 'P0001';
  end if;

  v_summary := public.fn_org_finance_summary(p_org_id);
  v_available := (v_summary->>'available_cents')::integer;
  v_currency := v_summary->>'currency';

  if p_amount_cents > v_available then
    raise exception 'insufficient_balance' using errcode = 'P0001';
  end if;

  insert into public.payouts (org_id, amount_cents, currency, provider, status)
  values (p_org_id, p_amount_cents, v_currency, v_provider, 'requested')
  returning id into v_payout_id;

  insert into public.audit_log (org_id, actor_id, table_name, record_id, action, changes)
  values (
    p_org_id, v_actor, 'payouts', v_payout_id::text, 'insert',
    jsonb_build_object('amount_cents', p_amount_cents, 'currency', v_currency, 'status', 'requested', 'provider', v_provider)
  );

  return jsonb_build_object('payout_id', v_payout_id, 'status', 'requested', 'amount_cents', p_amount_cents, 'currency', v_currency);
end;
$function$;

revoke execute on function public.fn_request_payout(uuid, integer) from public, anon;
grant execute on function public.fn_request_payout(uuid, integer) to authenticated;

commit;
