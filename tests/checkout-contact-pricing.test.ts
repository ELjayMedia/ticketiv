import { describe, expect, it } from "vitest"

import { contactErrors, isContactComplete } from "@/components/quiet/screens/checkout/contact-section"
import { cartSubtotalMinor, promoDiscountMinor } from "@/lib/checkout/pricing"
import { calendarLinks } from "@/lib/calendar-links"

const complete = { firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", confirmEmail: "ADA@example.com " }

describe("checkout contact validation", () => {
  it("accepts a complete guest contact (confirm email is case/space-insensitive)", () => {
    expect(isContactComplete(complete, true)).toBe(true)
  })

  it("flags missing names, bad email and mismatched confirmation for guests", () => {
    const errors = contactErrors({ firstName: " ", lastName: "", email: "ada@", confirmEmail: "x@y.z" }, true)
    expect(errors.firstName).toBeTruthy()
    expect(errors.lastName).toBeTruthy()
    expect(errors.email).toBeTruthy()
    expect(errors.confirmEmail).toBe("Email addresses don't match")
  })

  it("does not ask signed-in buyers to confirm their account email", () => {
    expect(isContactComplete({ ...complete, confirmEmail: "" }, false)).toBe(true)
  })
})

describe("checkout pricing", () => {
  const lines = [
    { ticketTypeId: "a", name: "GA", priceMinor: 25000, currency: "SZL" as const, quantity: 2 },
    { ticketTypeId: "b", name: "VIP", priceMinor: 60000, currency: "SZL" as const, quantity: 1 },
  ]

  it("totals the ticket subtotal", () => {
    expect(cartSubtotalMinor(lines)).toBe(110000)
  })

  it("previews percent and fixed promos, never below zero", () => {
    expect(promoDiscountMinor(110000, { discountType: "percent", discountValue: 10 })).toBe(11000)
    expect(promoDiscountMinor(110000, { discountType: "fixed", discountValue: 5000 })).toBe(5000)
    expect(promoDiscountMinor(3000, { discountType: "fixed", discountValue: 5000 })).toBe(3000)
    expect(promoDiscountMinor(110000, null)).toBe(0)
  })
})

describe("calendarLinks", () => {
  it("builds a Google template link and an .ics with a 3h default duration", () => {
    const { google, ics } = calendarLinks({
      uid: "order-1",
      title: "Sunset; Sessions",
      start: new Date("2026-11-08T15:00:00Z"),
      location: "House on Fire, Malkerns",
    })
    expect(google).toContain("dates=20261108T150000Z%2F20261108T180000Z")
    const body = decodeURIComponent(ics.replace("data:text/calendar;charset=utf-8,", ""))
    expect(body).toContain("DTSTART:20261108T150000Z")
    expect(body).toContain("DTEND:20261108T180000Z")
    expect(body).toContain("SUMMARY:Sunset\\; Sessions")
    expect(body).toContain("LOCATION:House on Fire\\, Malkerns")
  })
})
