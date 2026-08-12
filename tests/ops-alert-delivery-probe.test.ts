import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import { evaluateHealthUrls, postOpsAlert } from "@/lib/ops/health-alerts"

// TICK-262 follow-up to #400.
//
// #400 added /api/health/ops-alerting, which returns 503 when
// OPS_ALERT_WEBHOOK_URL is unset. It was correct and it caught a real
// misconfiguration on the first query — production had no webhook configured at
// all. But nothing called it, so it would have returned 503 indefinitely with
// no one reading it.
//
// That is the failure this file guards against, and it is the third time this
// project has hit the same shape: a control that exists, reports accurately,
// and is wired to nothing. Detection without a reader is not detection.

const root = process.cwd()
const ROUTE = "app/api/cron/ops-alerts/route.ts"

describe("alert-delivery probe wiring", () => {
  it("probes the delivery-health endpoint by default", () => {
    // The whole point: an operator who never sets OPS_ALERT_HEALTH_URLS must
    // still get this checked. Requiring opt-in config to notice that alerting
    // is unconfigured is circular.
    const source = fs.readFileSync(path.join(root, ROUTE), "utf8")
    const defaults = source.slice(source.indexOf("function readHealthUrls"))

    expect(defaults).toContain("/api/health/ops-alerting")
    expect(defaults).toContain("/api/health/supabase")
    expect(defaults).toContain("/api/health`")
  })
})

describe("why the probe is necessary", () => {
  it("drops the alert silently when no webhook is configured", () => {
    // This is the hole. postOpsAlert does not throw and does not report an
    // error — it returns a shape the caller currently does not act on. Without
    // the probe above, an unconfigured webhook is invisible until the moment
    // you need it, which is the worst possible moment to discover it.
    const result = postOpsAlert(undefined, { any: "payload" })

    return result.then((outcome) => {
      expect(outcome).toEqual({ sent: false, skipped: true, status: null })
    })
  })

  it("escalates a failed health URL to critical, so the probe actually pages", () => {
    // The probe is only worth adding if a 503 from it becomes an alert rather
    // than a logged curiosity.
    const check = evaluateHealthUrls([
      { url: "https://ticketiv.app/api/health", ok: true, status: 200, durationMs: 12 },
      {
        url: "https://ticketiv.app/api/health/ops-alerting",
        ok: false,
        status: 503,
        durationMs: 8,
      },
    ])

    expect(check.status).toBe("alert")
    expect(check.severity).toBe("critical")
    expect(JSON.stringify(check.details)).toContain("ops-alerting")
  })
})
