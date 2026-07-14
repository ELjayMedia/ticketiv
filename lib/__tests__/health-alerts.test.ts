import { describe, expect, it } from "vitest"

import {
  buildOpsAlertPayload,
  evaluateHealthUrls,
  evaluatePaymentSuccessRate,
  evaluateWebhookLag,
  hasAlert,
} from "@/lib/ops/health-alerts"

describe("health-alerts", () => {
  it("skips payment success checks when the window has too few attempts", () => {
    const check = evaluatePaymentSuccessRate([{ status: "failed" }], {
      minAttempts: 5,
      minSuccessRate: 0.85,
    })

    expect(check.status).toBe("skipped")
    expect(check.severity).toBe("info")
    expect(check.details.totalAttempts).toBe(1)
  })

  it("alerts when payment success rate falls below the configured threshold", () => {
    const check = evaluatePaymentSuccessRate(
      [
        { status: "succeeded" },
        { status: "failed" },
        { status: "timed_out" },
        { status: "cancelled" },
        { status: "pending" },
      ],
      { minAttempts: 5, minSuccessRate: 0.85 }
    )

    expect(check.status).toBe("alert")
    expect(check.severity).toBe("critical")
    expect(check.details.successRate).toBe(0.2)
  })

  it("keeps payment success checks healthy above the threshold", () => {
    const check = evaluatePaymentSuccessRate(
      [
        { status: "succeeded" },
        { status: "succeeded" },
        { status: "succeeded" },
        { status: "succeeded" },
        { status: "failed" },
      ],
      { minAttempts: 5, minSuccessRate: 0.8 }
    )

    expect(check.status).toBe("ok")
    expect(check.details.successRate).toBe(0.8)
  })

  it("alerts when stale unprocessed webhooks are present", () => {
    const check = evaluateWebhookLag(
      [
        { provider: "paystack", provider_event_id: "evt_1", received_at: "2026-07-14T18:00:00.000Z" },
        { provider: "momo", provider_event_id: "evt_2", received_at: "2026-07-14T18:01:00.000Z" },
      ],
      5
    )

    expect(check.status).toBe("alert")
    expect(check.details.staleCount).toBe(2)
    expect(check.details.providers).toEqual(["paystack", "momo"])
  })

  it("alerts when a configured health URL fails", () => {
    const check = evaluateHealthUrls([
      { url: "https://ticketiv.test/api/health", ok: true, status: 200, durationMs: 20 },
      { url: "https://ticketiv.test/api/health/supabase", ok: false, status: 500, durationMs: 40 },
    ])

    expect(check.status).toBe("alert")
    expect(check.details.checked).toBe(2)
  })

  it("builds a compact payload from alerting checks only", () => {
    const checks = [
      evaluatePaymentSuccessRate([{ status: "succeeded" }, { status: "failed" }], {
        minAttempts: 2,
        minSuccessRate: 0.8,
      }),
      evaluateWebhookLag([], 5),
    ]

    expect(hasAlert(checks)).toBe(true)
    const payload = buildOpsAlertPayload(checks, "https://ticketiv.test")
    expect(payload.source).toBe("ticketiv")
    expect(payload.alerts).toHaveLength(1)
    expect(payload.alerts[0].key).toBe("payment-success-rate")
  })
})
