import { describe, expect, it } from "vitest"

import {
  calculateLineItemPricing,
  calculateOrderPricing,
  formatCurrency,
  type PricingTicketType,
} from "@/lib/pricing"

// Minimal ticket-type factory — only the fields the preview calculator reads.
function tt(overrides: Partial<PricingTicketType> = {}): PricingTicketType {
  return {
    id: "tt_1",
    price: 100,
    currency: "SZL",
    absorb_fees: false,
    ...overrides,
  }
}

describe("calculateLineItemPricing", () => {
  it("multiplies unit price by quantity for the subtotal", () => {
    const line = calculateLineItemPricing(tt({ price: 250 }), 3, { passFeesToBuyer: false })
    expect(line.subtotal).toBe(750)
    expect(line.quantity).toBe(3)
    expect(line.unitPrice).toBe(250)
  })

  it("clamps quantity to a minimum of 1", () => {
    const line = calculateLineItemPricing(tt({ price: 100 }), 0)
    expect(line.quantity).toBe(1)
  })

  it("adds fees on top when fees are passed to the buyer", () => {
    // passFeesToBuyer: true, absorb_fees: false -> buyer pays subtotal + fees.
    const line = calculateLineItemPricing(tt({ price: 1000, absorb_fees: false }), 1, {
      passFeesToBuyer: true,
    })
    expect(line.fees).toBeGreaterThan(0)
    expect(line.total).toBe(line.subtotal + line.fees)
  })

  it("charges no buyer fee when the ticket absorbs fees", () => {
    const line = calculateLineItemPricing(tt({ price: 1000, absorb_fees: true }), 2, {
      passFeesToBuyer: true,
    })
    expect(line.fees).toBe(0)
    expect(line.total).toBe(line.subtotal)
  })
})

describe("calculateOrderPricing", () => {
  it("returns an empty breakdown for no items", () => {
    const out = calculateOrderPricing({ items: [], currency: "SZL" })
    expect(out).toMatchObject({ subtotal: 0, fees: 0, total: 0, lineItems: [] })
  })

  it("subtotal + fees always equals total (money invariant)", () => {
    const out = calculateOrderPricing({
      items: [
        { ticketType: tt({ id: "a", price: 150 }), quantity: 2 },
        { ticketType: tt({ id: "b", price: 75.5 }), quantity: 1 },
      ],
      currency: "SZL",
    })
    expect(out.total).toBeCloseTo(out.subtotal + out.fees, 2)
    expect(out.lineItems).toHaveLength(2)
  })

  it("sums line subtotals correctly", () => {
    const out = calculateOrderPricing({
      items: [{ ticketType: tt({ price: 100, absorb_fees: true }), quantity: 4 }],
    })
    expect(out.subtotal).toBe(400)
    expect(out.fees).toBe(0)
    expect(out.total).toBe(400)
  })
})

describe("formatCurrency", () => {
  it("formats with two fraction digits", () => {
    expect(formatCurrency(1234.5, "SZL")).toMatch(/1,234\.50/)
  })
})
