import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import {
  migrationColumn,
  migrationFunction,
  migrationFunctionGrants,
  migrationTable,
  migrationTableGrants,
} from "./helpers/migration-contract"

const queueTable = migrationTable("public.finance_reconciliation_issues")
const queueGrants = migrationTableGrants("public.finance_reconciliation_issues")
const operatorRpc = migrationFunction("public.fn_update_finance_reconciliation_issue")
const opsAlerts = fs.readFileSync(path.join(process.cwd(), "app/api/cron/ops-alerts/route.ts"), "utf8")
const page = fs.readFileSync(path.join(process.cwd(), "app/super-admin/reconciliation/page.tsx"), "utf8")
const actions = fs.readFileSync(path.join(process.cwd(), "app/super-admin/reconciliation/actions.ts"), "utf8")
const data = fs.readFileSync(path.join(process.cwd(), "lib/data/admin/reconciliation.ts"), "utf8")

describe("finance reconciliation queue contract", () => {
  it("keeps the queue RLS filtered and blocks direct authenticated writes", () => {
    expect(queueTable).toContain("alter table public.finance_reconciliation_issues enable row level security")
    expect(queueGrants.anon, "anon can reach the reconciliation queue directly").toBeUndefined()
    expect(queueGrants.authenticated, "the browser can write the queue directly").toEqual(["select"])
    expect(queueTable).toContain("app.is_platform_admin()")
    expect(queueTable).toContain("app.is_org_finance_viewer(org_id)")
  })

  it("keeps detector refresh service-role only", () => {
    const grants = migrationFunctionGrants("public.fn_refresh_finance_reconciliation_issues")

    expect(grants.publicExecute, "public still holds the default execute grant").toBe(false)
    expect(grants.grantees).toEqual(["service_role"])
  })

  it("requires a human finance/admin identity for manual status changes", () => {
    expect(operatorRpc).toContain("auth.uid()")
    expect(operatorRpc).toContain("au.role_tier::text in ('super_admin', 'finance_admin')")
    expect(operatorRpc).toContain("app.is_org_finance_viewer(v_issue.org_id)")

    const grants = migrationFunctionGrants("public.fn_update_finance_reconciliation_issue")

    expect(grants.publicExecute, "public still holds the default execute grant").toBe(false)
    expect(
      grants.grantees,
      "the writer must run as a signed-in operator, never as the service role",
    ).toEqual(["authenticated"])
  })

  it("refreshes persistence from the existing ops alert job, outside checkout", () => {
    expect(opsAlerts).toContain('"fn_refresh_finance_reconciliation_issues"')
    expect(opsAlerts).toContain("reconciliationQueuePersistenceCheck")
    expect(opsAlerts).toContain("Finance reconciliation queue refresh failed")
  })

  it("records terminal decisions with a note and audit entry", () => {
    expect(migrationColumn("public.finance_reconciliation_issues", "resolution_note")).toContain("text")
    expect(operatorRpc).toContain("resolution_note_required")
    expect(operatorRpc).toContain("finance_reconciliation_issue_status_changed")
  })

  it("exposes a responsive operator queue through the authenticated RPC", () => {
    expect(data).toContain('"v_finance_reconciliation_queue"')
    expect(data).toContain('.order("first_detected_at", { ascending: true })')
    expect(page).toContain("Discrepancy queue")
    expect(page).toContain("resolution_note")
    expect(actions).toContain('requireAdminRole(["super_admin", "finance_admin"])')
    expect(actions).toContain('"fn_update_finance_reconciliation_issue"')
    expect(actions).toContain("p_resolution_note")
  })
})
