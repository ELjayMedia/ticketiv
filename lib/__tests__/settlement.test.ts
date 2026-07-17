import { describe, expect, it } from "vitest"

import { buildSettlementSummary } from "@/lib/settlement"

const NOW = new Date("2026-07-17T12:00:00.000Z")

describe("buildSettlementSummary", () => {
  it("keeps recently captured net revenue pending settlement", () => {
    const summary = buildSettlementSummary({
      now: NOW,
      ledgerEntries: [
        { type: "payment_net", amountCents: 9000, occurredAt: "2026-07-16T12:00:00.000Z" },
      ],
      payouts: [],
    })

    expect(summary.capturedAvailableCents).toBe(9000)
    expect(summary.settledAvailableCents).toBe(0)
    expect(summary.pendingSettlementCents).toBe(9000)
  })

  it("marks net revenue older than the hold window as payable", () => {
    const summary = buildSettlementSummary({
      now: NOW,
      ledgerEntries: [
        { type: "payment_net", amountCents: 12000, occurredAt: "2026-07-10T12:00:00.000Z" },
      ],
      payouts: [],
    })

    expect(summary.capturedAvailableCents).toBe(12000)
    expect(summary.settledAvailableCents).toBe(12000)
    expect(summary.pendingSettlementCents).toBe(0)
  })

  it("subtracts requested, processing, and paid payouts from payable funds", () => {
    const summary = buildSettlementSummary({
      now: NOW,
      ledgerEntries: [
        { type: "payment_net", amountCents: 30000, occurredAt: "2026-07-10T12:00:00.000Z" },
      ],
      payouts: [
        { status: "requested", amountCents: 5000 },
        { status: "processing", amountCents: 3000 },
        { status: "paid", amountCents: 7000 },
        { status: "failed", amountCents: 11000 },
      ],
    })

    expect(summary.pendingPayoutCents).toBe(8000)
    expect(summary.paidOutCents).toBe(7000)
    expect(summary.settledAvailableCents).toBe(15000)
  })

  it("keeps captured and payable balances aligned after refunds", () => {
    const summary = buildSettlementSummary({
      now: NOW,
      ledgerEntries: [
        { type: "payment_net", amountCents: 20000, occurredAt: "2026-07-10T12:00:00.000Z" },
        { type: "refund", amountCents: 4500, occurredAt: "2026-07-11T12:00:00.000Z" },
      ],
      payouts: [],
    })

    expect(summary.capturedAvailableCents).toBe(15500)
    expect(summary.settledAvailableCents).toBe(15500)
    expect(summary.pendingSettlementCents).toBe(0)
  })
})
