import { describe, expect, it } from "vitest"

import {
  formatPlatformFeeRate,
  organizerNetPerTicketCents,
  rateFromSettingRow,
  ticketFeeCents,
  type PlatformFeeRate,
} from "@/lib/fees/platform-fee"

const rate: PlatformFeeRate = { percentBps: 500, fixedPerTicketCents: 200, currency: "SZL" }

describe("platform fee math (mirrors app.recompute_order_totals)", () => {
  it("charges percent of the ticket plus the fixed amount", () => {
    // Verified against production in a rolled-back order: 2 × E250 → E29.00.
    expect(ticketFeeCents(25000, rate)).toBe(1450)
    expect(2 * ticketFeeCents(25000, rate)).toBe(2900)
    expect(organizerNetPerTicketCents(25000, rate)).toBe(23550)
  })

  it("never charges free tickets", () => {
    expect(ticketFeeCents(0, rate)).toBe(0)
  })

  it("caps the fee at the ticket price", () => {
    expect(ticketFeeCents(150, rate)).toBe(150)
    expect(organizerNetPerTicketCents(150, rate)).toBe(0)
  })

  it("rounds the percentage part to the nearest cent", () => {
    expect(ticketFeeCents(1999, { ...rate, fixedPerTicketCents: 0 })).toBe(100) // 99.95 → 100
  })

  it("is zero when no fee is set", () => {
    expect(ticketFeeCents(25000, rateFromSettingRow(null))).toBe(0)
  })

  it("describes the rate in words", () => {
    expect(formatPlatformFeeRate(rate)).toMatch(/^5% \+ .*2\.00 per ticket$/)
    expect(formatPlatformFeeRate({ ...rate, fixedPerTicketCents: 0 })).toBe("5% per ticket")
    expect(formatPlatformFeeRate({ ...rate, percentBps: 250, fixedPerTicketCents: 0 })).toBe("2.5% per ticket")
    expect(formatPlatformFeeRate({ ...rate, percentBps: 0, fixedPerTicketCents: 0 })).toBe("No fee")
  })
})
