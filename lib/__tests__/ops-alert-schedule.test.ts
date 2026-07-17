import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

type VercelCron = {
  path: string
  schedule: string
}

type VercelConfig = {
  crons?: VercelCron[]
}

describe("ops alert scheduling", () => {
  const workflow = readFileSync(join(process.cwd(), ".github/workflows/ops-alerts.yml"), "utf8")

  it("runs operational alert checks every five minutes", () => {
    expect(workflow).toMatch(/cron:\s*"\*\/5 \* \* \* \*"/)
  })

  it("calls the secured production cron endpoint with required secrets", () => {
    expect(workflow).toContain("OPS_ALERT_CRON_URL")
    expect(workflow).toContain("CRON_SECRET")
    expect(workflow).toContain('Authorization: Bearer ${CRON_SECRET}')
  })

  it("does not use the Vercel cron cadence that fails on the current plan", () => {
    const config = JSON.parse(readFileSync(join(process.cwd(), "vercel.json"), "utf8")) as VercelConfig

    expect(config.crons ?? []).not.toContainEqual({
      path: "/api/cron/ops-alerts",
      schedule: "*/5 * * * *",
    })
  })
})
