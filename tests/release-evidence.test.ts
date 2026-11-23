import { describe, expect, it } from "vitest"
import { isTrustedUatRun } from "../scripts/ci/release-evidence.mjs"
const revision = "a".repeat(40)
const good = { path: ".github/workflows/uat.yml", head_branch: "uat", head_sha: revision,
  repository: { full_name: "ELjayMedia/ticketiv" }, head_repository: { full_name: "ELjayMedia/ticketiv" },
  event: "push", status: "completed", conclusion: "success" }
describe("tested release evidence", () => {
  it("accepts the complete successful trusted UAT workflow", () => {
    expect(isTrustedUatRun(good, revision)).toBe(true)
  })
  it.each([
    { path: ".github/workflows/audit-environment-policy.yml" },
    { conclusion: "failure" }, { status: "in_progress" }, { head_sha: "b".repeat(40) },
    { head_branch: "main" }, { event: "pull_request" },
    { head_repository: { full_name: "someone/ticketiv" } },
  ])("rejects a deployment marker without trusted release evidence: %j", (change) => {
    expect(isTrustedUatRun({ ...good, ...change }, revision)).toBe(false)
  })
})
