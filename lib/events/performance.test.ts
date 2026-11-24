import { describe, expect, it } from "vitest"

import { calculateEventPerformance } from "./performance"

describe("calculateEventPerformance", () => {
  it("does not turn missing data into fabricated zero values", () => {
    const result = calculateEventPerformance(null)
    expect(result.grossCents).toBeNull()
    expect(result.sold).toBeNull()
    expect(result.sellThroughPct).toBeNull()
    expect(result.paymentSuccessPct).toBeNull()
    expect(result.averageGrossTicketCents).toBeNull()
  })

  it("calculates inventory sell-through, gross per ticket and recorded payment success", () => {
    const result = calculateEventPerformance({
      tickets_sold: 120,
      tickets_available: 30,
      gross_sales_cents: 2_400_000,
      successful_payments: 24,
      failed_payments: 6,
      checked_in_count: 98,
    })
    expect(result.sellThroughPct).toBe(80)
    expect(result.averageGrossTicketCents).toBe(20_000)
    expect(result.paymentSuccessPct).toBe(80)
    expect(result.checkedIn).toBe(98)
  })

  it("does not divide by zero or guess at missing payment failures", () => {
    const empty = calculateEventPerformance({
      tickets_sold: 0,
      tickets_available: 0,
      gross_sales_cents: 0,
      successful_payments: 0,
      failed_payments: 0,
    })
    expect(empty.sellThroughPct).toBeNull()
    expect(empty.averageGrossTicketCents).toBeNull()
    expect(empty.paymentSuccessPct).toBeNull()

    const incomplete = calculateEventPerformance({ successful_payments: 4 })
    expect(incomplete.paymentSuccessPct).toBeNull()
  })

  it("never presents more than 100% sell-through for inconsistent live stats", () => {
    const result = calculateEventPerformance({
      tickets_sold: 100,
      tickets_available: -10,
    })
    expect(result.sellThroughPct).toBe(100)
  })
})
