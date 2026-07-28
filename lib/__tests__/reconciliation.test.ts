import { describe, expect, it } from "vitest"

import {
  buildEventReconciliation,
  buildPayoutReconciliationBlock,
  type EventReconciliationInput,
} from "@/lib/reconciliation"

function baseInput(overrides: Partial<EventReconciliationInput> = {}): EventReconciliationInput {
  return {
    eventId: "evt_1",
    stats: {
      ticketsSold: 2,
      grossSalesCents: 10000,
      successfulPayments: 1,
      failedPayments: 0,
      checkedInCount: 0,
      updatedAt: "2026-07-17T00:00:00.000Z",
    },
    orders: [
      {
        id: "ord_1",
        status: "paid",
        totalCents: 10000,
        subtotalCents: 10000,
        platformFeeCents: 700,
        processorFeeCents: 300,
        currency: "SZL",
      },
    ],
    orderItems: [
      { id: "item_1", orderId: "ord_1", status: "issued", refundedAt: null, revokedAt: null },
      { id: "item_2", orderId: "ord_1", status: "checked_in", refundedAt: null, revokedAt: null },
    ],
    ledgerEntries: [
      { orderId: "ord_1", type: "order_gross", amountCents: 10000, currency: "SZL" },
      { orderId: "ord_1", type: "fee", amountCents: -700, currency: "SZL" },
      { orderId: "ord_1", type: "fee", amountCents: -300, currency: "SZL" },
      { orderId: "ord_1", type: "payment_net", amountCents: 9000, currency: "SZL" },
    ],
    payments: [{ id: "pay_1", orderId: "ord_1", status: "succeeded", amountCents: 10000 }],
    paymentAttempts: [{ id: "att_1", orderId: "ord_1", status: "succeeded", paymentId: "pay_1" }],
    ...overrides,
  }
}

describe("buildEventReconciliation", () => {
  it("passes when ledger, event stats and payment attempts line up", () => {
    const result = buildEventReconciliation(baseInput())

    expect(result.status).toBe("ok")
    expect(result.expectedGrossCents).toBe(10000)
    expect(result.expectedFeeCents).toBe(1000)
    expect(result.expectedNetCents).toBe(9000)
    expect(result.paidTicketCount).toBe(2)
  })

  it("reconciles buyer-paid fees where total exceeds subtotal", () => {
    // Live pricing config: fees are added on top of the ticket subtotal, so
    // total (10950) > subtotal (10000). The settlement ledger records
    // order_gross = total, negative fees and payment_net = total - fees.
    const result = buildEventReconciliation(baseInput({
      stats: {
        ticketsSold: 1,
        grossSalesCents: 10950,
        successfulPayments: 1,
        failedPayments: 0,
        checkedInCount: 0,
        updatedAt: "2026-07-20T00:00:00.000Z",
      },
      orders: [
        {
          id: "ord_1",
          status: "paid",
          totalCents: 10950,
          subtotalCents: 10000,
          platformFeeCents: 750,
          processorFeeCents: 200,
          currency: "SZL",
        },
      ],
      orderItems: [
        { id: "item_1", orderId: "ord_1", status: "issued", refundedAt: null, revokedAt: null },
      ],
      ledgerEntries: [
        { orderId: "ord_1", type: "order_gross", amountCents: 10950, currency: "SZL" },
        { orderId: "ord_1", type: "fee", amountCents: -750, currency: "SZL" },
        { orderId: "ord_1", type: "fee", amountCents: -200, currency: "SZL" },
        { orderId: "ord_1", type: "payment_net", amountCents: 10000, currency: "SZL" },
      ],
      payments: [{ id: "pay_1", orderId: "ord_1", status: "succeeded", amountCents: 10950 }],
    }))

    expect(result.status).toBe("ok")
    expect(result.expectedGrossCents).toBe(10950)
    expect(result.expectedFeeCents).toBe(950)
    expect(result.expectedNetCents).toBe(10000)
    expect(result.checks.find((check) => check.key === "ledger")?.status).toBe("ok")
  })

  it("flags ledger and stats mismatches before payout review", () => {
    const result = buildEventReconciliation(baseInput({
      stats: {
        ticketsSold: 1,
        grossSalesCents: 10000,
        successfulPayments: 1,
        failedPayments: 0,
        checkedInCount: 0,
        updatedAt: null,
      },
      ledgerEntries: [
        { orderId: "ord_1", type: "order_gross", amountCents: 10000, currency: "SZL" },
        { orderId: "ord_1", type: "fee", amountCents: -700, currency: "SZL" },
        { orderId: "ord_1", type: "payment_net", amountCents: 9300, currency: "SZL" },
      ],
    }))

    expect(result.status).toBe("danger")
    expect(result.checks.find((check) => check.key === "ledger")?.status).toBe("danger")
    expect(result.checks.find((check) => check.key === "tickets")?.status).toBe("danger")
    expect(result.checks.find((check) => check.key === "payout_review")?.status).toBe("danger")
  })

  it("flags stuck and orphaned payment attempts", () => {
    const result = buildEventReconciliation(baseInput({
      paymentAttempts: [
        { id: "att_1", orderId: "ord_1", status: "pending", paymentId: null },
        { id: "att_2", orderId: "missing_order", status: "succeeded", paymentId: "pay_missing" },
      ],
    }))

    expect(result.status).toBe("danger")
    expect(result.stuckPaymentAttemptCount).toBe(1)
    expect(result.orphanedPaymentAttemptCount).toBe(1)
    expect(result.checks.find((check) => check.key === "payments")?.status).toBe("danger")
  })

  it("builds a payout block from unresolved reconciliation evidence for the matching org", () => {
    const blockedEvent = {
      ...buildEventReconciliation(baseInput({
        ledgerEntries: [
          { orderId: "ord_1", type: "order_gross", amountCents: 10000, currency: "SZL" },
          { orderId: "ord_1", type: "fee", amountCents: -700, currency: "SZL" },
          { orderId: "ord_1", type: "payment_net", amountCents: 9300, currency: "SZL" },
        ],
      })),
      title: "Blocked launch night",
      orgId: "org_1",
      orgName: "Ticketiv",
      currency: "SZL",
      startsAt: "2026-07-16T18:00:00.000Z",
      endsAt: "2026-07-16T23:00:00.000Z",
      openPayoutCount: 1,
      openPayoutCents: 9000,
    }
    const otherOrgBlockedEvent = { ...blockedEvent, eventId: "evt_other", orgId: "org_2" }

    const block = buildPayoutReconciliationBlock({
      events: [blockedEvent, otherOrgBlockedEvent],
      orgId: "org_1",
      generatedAt: "2026-07-17T00:00:00.000Z",
    })

    expect(block.blocked).toBe(true)
    expect(block.generatedAt).toBe("2026-07-17T00:00:00.000Z")
    expect(block.blockedEvents).toHaveLength(1)
    expect(block.blockedEvents[0].title).toBe("Blocked launch night")
    expect(block.blockedEvents[0].blockingChecks.map((check) => check.key)).toContain("ledger")
    expect(block.blockedEvents[0].blockingChecks.map((check) => check.key)).not.toContain("payout_review")
  })

  it("does not block payout approval when the org's ended events reconcile", () => {
    const readyEvent = {
      ...buildEventReconciliation(baseInput()),
      title: "Ready launch night",
      orgId: "org_1",
      orgName: "Ticketiv",
      currency: "SZL",
      startsAt: "2026-07-16T18:00:00.000Z",
      endsAt: "2026-07-16T23:00:00.000Z",
      openPayoutCount: 1,
      openPayoutCents: 9000,
    }

    const block = buildPayoutReconciliationBlock({
      events: [readyEvent],
      orgId: "org_1",
    })

    expect(block.blocked).toBe(false)
    expect(block.blockedEvents).toHaveLength(0)
  })
})
