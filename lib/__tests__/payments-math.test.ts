import { describe, expect, it } from "vitest"

import {
  buildLedgerEntries,
  evaluatePaystackWebhookOutcome,
  evaluateProviderVerification,
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
    organizer_net_cents: 9350,
    ...overrides,
  }
}

describe("buildLedgerEntries", () => {
  it("deducts one platform commission and keeps processor cost internal", () => {
    const entries = buildLedgerEntries(order(), "pay_1")
    const byType = (t: string) => entries.filter((e) => e.type === t)

    expect(byType("order_gross")).toHaveLength(1)
    expect(byType("fee")).toHaveLength(1)
    expect(byType("payment_net")).toHaveLength(1)

    expect(byType("order_gross")[0].amount_cents).toBe(10000)
    expect(byType("fee")[0]).toMatchObject({ amount_cents: -650, meta: { fee_type: "platform" } })
    expect(byType("payment_net")[0].amount_cents).toBe(9350)
  })

  it("preserves the ledger invariant when total differs from subtotal", () => {
    const entries = buildLedgerEntries(order(), "pay_1")
    const gross = entries.filter((e) => e.type === "order_gross").reduce((s, e) => s + e.amount_cents, 0)
    const fees = entries.filter((e) => e.type === "fee").reduce((s, e) => s + e.amount_cents, 0)
    const net = entries.filter((e) => e.type === "payment_net").reduce((s, e) => s + e.amount_cents, 0)
    expect(gross + fees).toBe(net)
  })

  it("omits fee rows when there are no fees", () => {
    const entries = buildLedgerEntries(order({ platform_fee_cents: 0, processor_fee_cents: 0, organizer_net_cents: 10000 }), "pay_1")
    expect(entries.filter((e) => e.type === "fee")).toHaveLength(0)
    expect(entries).toHaveLength(2)
    expect(entries.find((e) => e.type === "order_gross")?.amount_cents).toBe(10000)
    expect(entries.find((e) => e.type === "payment_net")?.amount_cents).toBe(10000)
  })

  it("uses total_cents even when subtotal metadata is null", () => {
    const entries = buildLedgerEntries(order({ subtotal_cents: null, platform_fee_cents: null, processor_fee_cents: null, organizer_net_cents: null, total_cents: 5000 }), "pay_1")
    expect(entries.find((e) => e.type === "order_gross")?.amount_cents).toBe(5000)
    expect(entries.find((e) => e.type === "payment_net")?.amount_cents).toBe(5000)
  })

  it("uses the snapshotted organizer net instead of deducting processor cost twice", () => {
    const entries = buildLedgerEntries(order({
      total_cents: 3500,
      platform_fee_cents: 228,
      processor_fee_cents: 202,
      organizer_net_cents: 3272,
      currency: "ZAR",
    }), "pay_1")

    expect(entries.find((entry) => entry.type === "payment_net")?.amount_cents).toBe(3272)
    expect(entries.filter((entry) => entry.type === "fee")).toEqual([
      expect.objectContaining({ amount_cents: -228, meta: { fee_type: "platform" } }),
    ])
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

describe("evaluateProviderVerification", () => {
  // TICK-339 — the gate in front of buyer-initiated resale/waitlist completion,
  // where there is no signed webhook body to trust.
  function verified(overrides: Partial<Parameters<typeof evaluateProviderVerification>[0]> = {}) {
    return {
      providerStatus: "success",
      providerReference: "ref_abc",
      providerAmountCents: 10000,
      providerCurrency: "SZL",
      expectedReference: "ref_abc",
      expectedAmountCents: 10000,
      expectedCurrency: "SZL",
      ...overrides,
    }
  }

  it("proceeds when status, reference, amount and currency all agree", () => {
    expect(evaluateProviderVerification(verified())).toBe("proceed")
  })

  it("accepts a differently-cased provider status and currency", () => {
    expect(evaluateProviderVerification(verified({ providerStatus: "SUCCESS", providerCurrency: "szl" }))).toBe("proceed")
  })

  it("rejects any non-success transaction state", () => {
    for (const status of ["failed", "abandoned", "pending", "reversed", ""]) {
      expect(evaluateProviderVerification(verified({ providerStatus: status }))).toBe("not_successful")
    }
  })

  it("rejects a reference that is not the one we asked about", () => {
    expect(evaluateProviderVerification(verified({ providerReference: "ref_other" }))).toBe("reference_mismatch")
  })

  it("rejects a missing reference on either side rather than treating it as a match", () => {
    expect(evaluateProviderVerification(verified({ providerReference: "" }))).toBe("reference_mismatch")
    expect(evaluateProviderVerification(verified({ expectedReference: "  " }))).toBe("reference_mismatch")
  })

  it("rejects an underpayment or an overpayment", () => {
    expect(evaluateProviderVerification(verified({ providerAmountCents: 9999 }))).toBe("amount_mismatch")
    expect(evaluateProviderVerification(verified({ providerAmountCents: 10001 }))).toBe("amount_mismatch")
  })

  it("rejects a missing amount instead of skipping the check", () => {
    // Unlike the webhook decision, this path pulled the transaction itself, so
    // an absent amount is a broken response, not an optional field.
    expect(evaluateProviderVerification(verified({ providerAmountCents: Number.NaN }))).toBe("amount_mismatch")
  })

  it("rejects a payment settled in a different currency", () => {
    expect(evaluateProviderVerification(verified({ providerCurrency: "ZAR" }))).toBe("currency_mismatch")
    expect(evaluateProviderVerification(verified({ providerCurrency: "" }))).toBe("currency_mismatch")
  })

  it("checks status before anything else so a failed transaction never reads as a mismatch", () => {
    expect(
      evaluateProviderVerification(verified({ providerStatus: "failed", providerAmountCents: 1, providerCurrency: "ZAR" })),
    ).toBe("not_successful")
  })
})
