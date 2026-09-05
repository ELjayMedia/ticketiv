alter table public.finance_reconciliation_issues alter column runbook_key set default 'docs/FINANCE_RECONCILIATION.md';
update public.finance_reconciliation_issues set runbook_key = 'docs/FINANCE_RECONCILIATION.md', updated_at = now() where runbook_key = 'docs/OPERATIONS.md#money-reconciliation';;
