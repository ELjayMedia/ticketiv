import { spawnSync } from "node:child_process"
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
})
