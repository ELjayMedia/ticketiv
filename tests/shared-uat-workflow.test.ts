import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
const source = (path: string) => readFileSync(path, "utf8")
describe("isolated UAT release boundaries", () => {
  it("retires automated mutation of shared production", () => {
    const retired = source(".github/workflows/shared-uat.yml")
    expect(retired).not.toContain("workflow_run:")
    expect(retired).toContain("exit 1")
  })
  it("deploys and tests only UAT with environment credentials", () => {
    const workflow = source(".github/workflows/uat.yml")
    expect(workflow).toContain("branches: [uat]")
    expect(workflow).toContain("name: UAT")
    expect(workflow).toContain("TEST_SUPABASE_URL: https://uat-api.ticketiv.app")
    expect(workflow).toContain('E2E_ALLOW_ISOLATED_UAT: "1"')
    expect(workflow).not.toContain("radsfmlsjznqvcpogluo")
    expect(workflow).toContain("--workers=1")
    expect(workflow).toContain("always() && steps.seed.outcome")
  })
  it("requires explicit main production release with prior UAT evidence", () => {
    const workflow = source(".github/workflows/release-production.yml")
    expect(workflow).not.toMatch(/^  push:/m)
    expect(workflow).toContain("github.ref == 'refs/heads/main'")
    expect(workflow).toContain("inputs.confirmation == 'DEPLOY_PRODUCTION'")
    expect(workflow).toContain("branches/main/protection")
    expect(workflow).toContain("require-tested-release.mjs")
    expect(workflow).toContain("name: Production")
  })
})
