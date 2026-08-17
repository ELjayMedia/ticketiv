import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const workflow = readFileSync(join(process.cwd(), ".github/workflows/shared-uat.yml"), "utf8")
const moneyPath = readFileSync(join(process.cwd(), "tests/money-path-lifecycle.test.ts"), "utf8")

describe("shared Supabase UAT workflow", () => {
  it("runs automatically only from a successful trusted main CI run and keeps manual confirmation", () => {
    expect(workflow).toContain("workflow_run:")
    expect(workflow).toContain("- CI")
    expect(workflow).toContain("github.event.workflow_run.conclusion == 'success'")
    expect(workflow).toContain("github.event.workflow_run.event == 'push'")
    expect(workflow).toContain("github.event.workflow_run.head_branch == 'main'")
    expect(workflow).toContain("github.event.workflow_run.head_repository.full_name == github.repository")
    expect(workflow).toContain("workflow_dispatch:")
    expect(workflow).toContain("inputs.run_shared_uat")
    expect(workflow).toContain("inputs.uat_confirmation == 'RUN_TICKETIV_SHARED_UAT'")
    expect(workflow).toContain("github.ref == 'refs/heads/main'")
    expect(workflow).toContain("TARGET_SHA: ${{ github.event_name == 'workflow_run' && github.event.workflow_run.head_sha || github.sha }}")
    expect(workflow).toContain("ref: ${{ env.TARGET_SHA }}")
    expect(workflow).not.toMatch(/\n\s+(pull_request|push):/)
  })

  it("pins the application, database, and exact deployed commit targets", () => {
    expect(workflow).toContain("PLAYWRIGHT_BASE_URL: https://ticketiv.app")
    expect(workflow).toContain("TEST_SUPABASE_ALLOW_PROJECT_REF: radsfmlsjznqvcpogluo")
    expect(workflow).toContain('expected_url="https://${TEST_SUPABASE_ALLOW_PROJECT_REF}.supabase.co"')
    expect(workflow).toContain('test "$PLAYWRIGHT_BASE_URL" = "https://ticketiv.app"')
    expect(workflow).toContain("deployments?sha=${TARGET_SHA}&environment=Production")
    expect(workflow).toContain("Production remained on $TARGET_SHA for the full UAT run.")
  })

  it("keeps shared fixture writers serial and always requests teardown", () => {
    expect(workflow).toContain('E2E_ALLOW_SHARED_UAT: "1"')
    expect(workflow).toContain("--project=desktop-chromium")
    expect(workflow).toContain("--workers=1")
    expect(workflow).toContain("cancel-in-progress: false")
    expect(workflow).toContain("if: always()")
    expect(workflow).toContain("run: pnpm seed:uat:teardown")
  })

  it("runs database and privilege outcomes before browser UAT and retains failure evidence", () => {
    const moneyPathStep = workflow.indexOf("tests/money-path-lifecycle.test.ts")
    const anonymousBoundary = workflow.indexOf("e2e/anonymous-privilege-boundaries.spec.ts")
    const browserUat = workflow.indexOf("e2e/authenticated-org-boundaries.spec.ts")

    expect(moneyPathStep).toBeGreaterThan(0)
    expect(anonymousBoundary).toBeGreaterThan(moneyPathStep)
    expect(browserUat).toBeGreaterThan(anonymousBoundary)
    expect(workflow).toContain("actions/upload-artifact@v4")
    expect(workflow).toContain("retention-days: 7")
  })

  it("uses a run-owned buyer and requires the shared-project acknowledgement", () => {
    expect(moneyPath).toContain('process.env.E2E_ALLOW_SHARED_UAT === "1"')
    expect(moneyPath).toContain('const PAYSTACK_CURRENCY = "ZAR"')
    expect(moneyPath).toContain("admin.auth.admin.createUser")
    expect(moneyPath).toContain("admin.auth.admin.deleteUser(buyerId)")
    expect(moneyPath).not.toContain("admin.auth.admin.listUsers")
    expect(moneyPath).not.toContain('.from("events").select("id").neq')
    expect(moneyPath).toContain('expect(wrong.data?.outcome).toBe("wrong_event")')
  })
})
