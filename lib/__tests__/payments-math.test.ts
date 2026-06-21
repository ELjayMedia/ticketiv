import { describe, expect, it } from "vitest"

import {
  buildLedgerEntries,
  evaluatePaystackWebhookOutcome,
  type LedgerOrderInput,
} from "@/lib/payments-math"

function order(overrides: Partial<LedgerOrderInput> = {}): LedgerOrderInput {
  return {
    id: "ord_1",
    org_id: "org_1",
    total_cents: 10000,
    currency: "SZL",
    subtotal_cents: 9000,
    platform_fee_cents: 650,
    processor_fee_cents: 350,
    ...overrides,
  }
}

describe("buildLedgerEntries", () => {
  it("emits gross, both fees (negative), and net", () => {
    const entries = buildLedgerEntries(order(), "pay_1")
    const byType = (t: string) => entries.filter((e) => e.type === t)

    expect(byType("order_gross")).toHaveLength(1)
    expect(byType("fee")).toHaveLength(2)
    expect(byType("payment_net")).toHaveLength(1)

    expect(byType("order_gross")[0].amount_cents).toBe(9000)
    expect(byType("fee").map((e) => e.amount_cents).sort((a, b) => a - b)).toEqual([-650, -350].sort((a, b) => a - b))
    // net = total - platform - processor = 10000 - 650 - 350 = 9000
    expect(byType("payment_net")[0].amount_cents).toBe(9000)
  })

  it("ledger nets out: gross + fees == net for the settled amount", () => {
    const entries = buildLedgerEntries(order({ subtotal_cents: 10000, platform_fee_cents: 650, processor_fee_cents: 350, total_cents: 10000 }), "pay_1")
    const gross = entries.filter((e) => e.type === "order_gross").reduce((s, e) => s + e.amount_cents, 0)
    const fees = entries.filter((e) => e.type === "fee").reduce((s, e) => s + e.amount_cents, 0)
    const net = entries.filter((e) => e.type === "payment_net").reduce((s, e) => s + e.amount_cents, 0)
    expect(gross + fees).toBe(net)
  })

  it("omits fee rows when there are no fees", () => {
    const entries = buildLedgerEntries(order({ platform_fee_cents: 0, processor_fee_cents: 0 }), "pay_1")
    expect(entries.filter((e) => e.type === "fee")).toHaveLength(0)
    expect(entries).toHaveLength(2)
  })

  it("falls back to total_cents when subtotal/fees are null", () => {
    const entries = buildLedgerEntries(order({ subtotal_cents: null, platform_fee_cents: null, processor_fee_cents: null, total_cents: 5000 }), "pay_1")
    expect(entries.find((e) => e.type === "order_gross")?.amount_cents).toBe(5000)
    expect(entries.find((e) => e.type === "payment_net")?.amount_cents).toBe(5000)
  })

  it("carries org/order/payment ids and currency onto every row", () => {
    const entries = buildLedgerEntries(order(), "pay_xyz")
    for (const e of entries) {
      expect(e.org_id).toBe("org_1")
      expect(e.order_id).toBe("ord_1")
      expect(e.payment_id).toBe("pay_xyz")
      expect(e.currency).toBe("SZL")
    }
  })
})

describe("evaluatePaystackWebhookOutcome", () => {
  it("fails when the event status is not success", () => {
    expect(evaluatePaystackWebhookOutcome({ status: "failed", orderStatus: "pending", orderTotalCents: 10000, amount: 10000 })).toBe("fail")
  })

  it("treats an already-settled order as an idempotent duplicate", () => {
    expect(evaluatePaystackWebhookOutcome({ status: "success", orderStatus: "paid", orderTotalCents: 10000, amount: 10000 })).toBe("duplicate")
    expect(evaluatePaystackWebhookOutcome({ status: "success", orderStatus: "refunded", orderTotalCents: 10000, amount: 10000 })).toBe("duplicate")
  })

  it("rejects a mismatched provider amount", () => {
    expect(evaluatePaystackWebhookOutcome({ status: "success", orderStatus: "pending", orderTotalCents: 10000, amount: 9999 })).toBe("amount_mismatch")
  })

  it("proceeds on success + pending + matching amount", () => {
    expect(evaluatePaystackWebhookOutcome({ status: "success", orderStatus: "pending", orderTotalCents: 10000, amount: 10000 })).toBe("proceed")
  })

  it("proceeds when the provider omits the amount (amount = 0)", () => {
    expect(evaluatePaystackWebhookOutcome({ status: "success", orderStatus: "pending", orderTotalCents: 10000, amount: 0 })).toBe("proceed")
  })
})
