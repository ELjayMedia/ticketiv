import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const queueSql = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/20260811133000_finance_reconciliation_issue_queue.sql"),
  "utf8",
)
const grantSql = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/20260811135000_reconciliation_status_rpc_grants.sql"),
  "utf8",
)
const opsAlerts = fs.readFileSync(path.join(process.cwd(), "app/api/cron/ops-alerts/route.ts"), "utf8")

describe("finance reconciliation queue contract", () => {
  it("keeps the queue RLS filtered and blocks direct authenticated writes", () => {
    expect(queueSql).toContain("alter table public.finance_reconciliation_issues enable row level security")
    expect(queueSql).toContain("revoke all on table public.finance_reconciliation_issues from public, anon, authenticated")
    expect(queueSql).toContain("grant select on table public.finance_reconciliation_issues to authenticated")
    expect(queueSql).toContain("app.is_platform_admin()")
    expect(queueSql).toContain("app.is_org_finance_viewer(org_id)")
  })

  it("keeps detector refresh service-role only", () => {
    expect(queueSql).toContain("revoke execute on function public.fn_refresh_finance_reconciliation_issues()")
    expect(queueSql).toContain("from public, anon, authenticated")
    expect(queueSql).toContain("grant execute on function public.fn_refresh_finance_reconciliation_issues() to service_role")
  })

  it("requires a human finance/admin identity for manual status changes", () => {
    expect(queueSql).toContain("app.is_platform_admin()")
    expect(queueSql).toContain("app.is_org_finance_viewer(v_issue.org_id)")
    expect(queueSql).toContain("grant execute on function public.fn_update_finance_reconciliation_issue(uuid, text)")
    expect(queueSql).toContain("to authenticated, service_role")
    expect(grantSql).toContain("revoke execute on function public.fn_update_finance_reconciliation_issue(uuid, text)")
    expect(grantSql).toContain("from service_role")
  })

  it("refreshes persistence from the existing ops alert job, outside checkout", () => {
    expect(opsAlerts).toContain('"fn_refresh_finance_reconciliation_issues"')
    expect(opsAlerts).toContain("reconciliationQueuePersistenceCheck")
    expect(opsAlerts).toContain("Finance reconciliation queue refresh failed")
  })
})
