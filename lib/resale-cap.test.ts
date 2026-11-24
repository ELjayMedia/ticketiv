import { describe, expect, it } from "vitest"

import { capForListing, isListingPriceAllowed, resaleCapMessage } from "@/lib/resale-cap"

describe("resale cap", () => {
  it("matches the database rule: event override, else 110% of face value", () => {
    expect(capForListing(10000, 10000)).toBe(10000)
    expect(capForListing(10000, null)).toBe(11000)
    expect(isListingPriceAllowed(11000, 10000, null)).toBe(true)
    expect(isListingPriceAllowed(11001, 10000, null)).toBe(false)
    expect(capForListing(0, null)).toBe(0)
  })

  it("explains the cap returned by fn_publish_resale_listing", () => {
    expect(resaleCapMessage("11000")).toBe("The organiser caps resale for this ticket at 110.00. Lower your price and try again.")
    expect(resaleCapMessage("0")).toMatch(/can't be resold for money/)
    expect(resaleCapMessage(null)).toMatch(/can't be resold for money/)
  })
})
