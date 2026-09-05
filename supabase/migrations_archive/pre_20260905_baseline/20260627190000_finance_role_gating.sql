-- TICK-277 (part 2): make money-surface authorization match the UI gating.
--
-- Finance/payout surfaces are Owner + Finance only. Previously the finance summary
-- RPC and the ledger read policy authorized ANY org member, so the protection was
-- UI-only — a Manager/Door member could read finance totals or raw ledger rows
-- directly. Introduce is_org_finance_viewer and gate both to it (Owner/Finance,
-- plus super admins). Legacy admin/organizer kept as owner-equivalent.

begin;

create or replace function public.is_org_finance_viewer(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1 from public.org_members om
    where om.org_id = p_org_id
      and om.user_id = (select auth.uid())
      and om.role = any (array['organizer_owner', 'admin', 'organizer', 'finance']::public.app_role[])
  ) or public.is_super_admin((select auth.uid()));
$function$;

revoke execute on function public.is_org_finance_viewer(uuid) from public, anon;
grant execute on function public.is_org_finance_viewer(uuid) to authenticated;

-- Finance summary: Owner/Finance only (was: any org member).
create or replace function public.fn_org_finance_summary(p_org_id uuid)
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
  v_available integer := 0;
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

-- Raw ledger rows: Owner/Finance only (was: any org member).
drop policy if exists ledger_org_read on public.ledger_entries;
create policy ledger_org_read on public.ledger_entries
  for select
  using (public.is_org_finance_viewer(org_id));

commit;
