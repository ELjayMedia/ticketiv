-- Status changes require a real authenticated platform-admin or org-finance
-- identity because the function assigns auth.uid() as the operator owner.
-- The service role does not represent a human operator; auto-resolution remains
-- available through the separate service-role refresh function.
revoke execute on function public.fn_update_finance_reconciliation_issue(uuid, text)
  from service_role;
