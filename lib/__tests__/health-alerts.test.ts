import { describe, expect, it } from "vitest"

import {
  buildOpsAlertPayload,
  evaluateHealthUrls,
  evaluateOrderStateConsistency,
  evaluatePaymentSuccessRate,
  evaluatePayoutIntegrity,
  evaluateProviderSettlement,
  evaluateStuckAsyncWork,
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

  it("keeps order-state consistency healthy when all counts are zero", () => {
    const check = evaluateOrderStateConsistency({})
    expect(check.status).toBe("ok")
    expect(check.details.total).toBe(0)
  })

  it("raises a critical alert with only the non-zero order-state categories", () => {
    const check = evaluateOrderStateConsistency({
      paid_order_no_settlement_ledger: 2,
      issued_ticket_on_unpaid_order: 1,
      succeeded_payment_order_not_paid: 0,
    })
    expect(check.status).toBe("alert")
    expect(check.severity).toBe("critical")
    expect(check.details.total).toBe(3)
    expect(check.details.categories).toEqual({
      paid_order_no_settlement_ledger: 2,
      issued_ticket_on_unpaid_order: 1,
    })
  })

  it("treats payout over-draw as critical and failed payouts as a warning", () => {
    expect(evaluatePayoutIntegrity({ payout_overdraw_orgs: 1, failed_payouts: 3 })).toMatchObject({
      status: "alert",
      severity: "critical",
    })
    expect(evaluatePayoutIntegrity({ payout_overdraw_orgs: 0, failed_payouts: 2 })).toMatchObject({
      status: "alert",
      severity: "warning",
    })
    expect(evaluatePayoutIntegrity({}).status).toBe("ok")
  })

  it("flags a stuck payment outbox as critical, other async backlog as warning", () => {
    expect(evaluateStuckAsyncWork({ stuck_payment_outbox: 1 })).toMatchObject({
      status: "alert",
      severity: "critical",
    })
    expect(evaluateStuckAsyncWork({ stuck_notifications: 3, deadletter_jobs: 1 })).toMatchObject({
      status: "alert",
      severity: "warning",
    })
    expect(evaluateStuckAsyncWork({}).status).toBe("ok")
  })

  it("skips the settlement check until data has been ingested", () => {
    const check = evaluateProviderSettlement({ hours_since_last_settlement_ingest: -1 })
    expect(check.status).toBe("skipped")
    expect(check.severity).toBe("info")
  })

  it("treats any provider settlement mismatch as critical", () => {
    const check = evaluateProviderSettlement({
      settlement_items_unmatched: 1,
      settlement_amount_mismatch: 2,
      hours_since_last_settlement_ingest: 1,
    })
    expect(check.status).toBe("alert")
    expect(check.severity).toBe("critical")
    expect(check.details.total).toBe(3)
    expect(check.details.categories).toEqual({
      settlement_items_unmatched: 1,
      settlement_amount_mismatch: 2,
    })
  })

  it("warns (not criticals) when settlement data is merely stale", () => {
    const check = evaluateProviderSettlement({ hours_since_last_settlement_ingest: 72 }, 48)
    expect(check.status).toBe("alert")
    expect(check.severity).toBe("warning")
  })

  it("is healthy when settlement matches and ingest is current", () => {
    const check = evaluateProviderSettlement({ hours_since_last_settlement_ingest: 3 }, 48)
    expect(check.status).toBe("ok")
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
