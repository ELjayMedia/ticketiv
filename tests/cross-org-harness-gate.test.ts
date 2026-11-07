import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")

describe("cross-org authorization harness", () => {
  it("fails closed if the verification environment is unavailable", () => {
    const result = spawnSync(
      process.execPath,
      [resolve(root, "scripts/check-cross-org-authorization.mjs")],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          TICKETIV_CROSS_ORG_TEST_DB_URL: "",
        },
      },
    )

    expect(result.status).toBe(2)
    expect(result.stderr).toContain("Cross-org authorization check BLOCKED")
  })

  it("refuses remote database connections without a separate opt-in", () => {
    const result = spawnSync(
      process.execPath,
      [resolve(root, "scripts/check-cross-org-authorization.mjs")],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          TICKETIV_CROSS_ORG_TEST_DB_URL: "postgresql://tester:dummy@db.example.test:5432/postgres",
          TICKETIV_CROSS_ORG_ALLOW_REMOTE: "",
        },
      },
    )
    expect(result.status).toBe(2)
    expect(result.stderr).toContain("remote DB requires explicit")
  })

  it("runs as an independent, blocking CI job against disposable local Postgres", () => {
    const workflow = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8")
    expect(workflow).toContain("cross-org-authorization:")
    expect(workflow).toContain("supabase db start")
    expect(workflow).toContain("supabase db reset --local --no-seed")
    expect(workflow).toContain("TICKETIV_CROSS_ORG_TEST_DB_URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres")
    expect(workflow).toContain("needs: [release-gate, cross-org-authorization, change-scope]")
    expect(workflow).not.toContain("continue-on-error: true")
  })
})
