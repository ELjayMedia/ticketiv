-- Org admins can see finance and payouts (product decision, 2026-11-02).
--
-- Before: the finance-viewer checks admitted owners (plus legacy owner-
-- equivalent roles) and the finance role, but not organizer_admin, while
-- admins could already request payouts (fn_request_payout uses is_org_admin)
-- and manage payout accounts (app.is_org_admin_of). So an admin could move
-- money but not see the balance, ledger or refunds.
--
-- After: organizer_admin is a finance viewer too. This widens read access only
-- (finance summary, ledger_entries, refunds, finance_reconciliation_issues,
-- payout_accounts select). Write paths are unchanged.
--
-- CREATE OR REPLACE keeps each function's existing grants and signature.

create or replace function public.is_org_finance_viewer(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.org_members om
    where om.org_id = p_org_id
      and om.user_id = (select auth.uid())
      and om.role = any (array['organizer_owner', 'organizer_admin', 'admin', 'organizer', 'finance']::public.app_role[])
  )
  or public.is_super_admin((select auth.uid()));
$function$;

create or replace function app.is_org_finance_viewer(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select app.org_has_role(p_org, array['organizer_owner', 'organizer_admin', 'finance']::app_role[])
      or app.is_platform_admin()
$function$;
