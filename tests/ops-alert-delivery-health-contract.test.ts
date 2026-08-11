import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const source = fs.readFileSync(
  path.join(process.cwd(), "app/api/health/ops-alerting/route.ts"),
  "utf8",
)

describe("operator alert delivery health", () => {
  it("fails closed when the delivery webhook is absent", () => {
    expect(source).toContain("OPS_ALERT_WEBHOOK_URL")
    expect(source).toContain("deliveryConfigured ? 200 : 503")
    expect(source).toContain('service: "ops-alerting"')
  })

  it("does not expose the configured webhook value", () => {
    expect(source).not.toContain("OPS_ALERT_WEBHOOK_URL,")
    expect(source).not.toContain("webhookUrl:")
    expect(source).not.toContain("process.env.OPS_ALERT_WEBHOOK_URL,")
  })
})
