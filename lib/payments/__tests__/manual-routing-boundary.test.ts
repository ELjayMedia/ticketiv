import { describe, expect, it } from "vitest"

import { PaymentChannelUnavailableError } from "@/lib/payments/errors"
import { normaliseAllowed, selectPaymentProvider, type RoutingRule } from "@/lib/payments/routing"

const manualRule: RoutingRule = {
  priority: 1,
  country_code: null,
  currency: "SZL",
  provider: "manual",
  fallback_provider: null,
  is_active: true,
}

describe("manual payment provider routing boundary", () => {
  it("does not expose manual as an attendee checkout provider", () => {
    expect(normaliseAllowed(["manual", "momo"])).toEqual(["momo"])
  })

  it("does not route a payment attempt to a manual-only rule", () => {
    expect(() =>
      selectPaymentProvider([manualRule], {
        currency: "SZL",
      }),
    ).toThrow(PaymentChannelUnavailableError)
  })

  it("rejects an explicit manual checkout request", () => {
    expect(() =>
      selectPaymentProvider([], {
        currency: "SZL",
        requested: "manual",
      }),
    ).toThrow(PaymentChannelUnavailableError)
  })
})
