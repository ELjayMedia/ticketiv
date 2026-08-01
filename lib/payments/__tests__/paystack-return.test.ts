import { describe, expect, it } from "vitest"

import { assertPaystackReturnMatches } from "@/lib/payments/paystack-return-core"

const expected = {
  reference: "paystack_order_attempt",
  amountCents: 3500,
  currency: "ZAR",
}

describe("assertPaystackReturnMatches", () => {
  it("accepts the successful transaction recorded for the order", () => {
    expect(() =>
      assertPaystackReturnMatches(expected, {
        status: "success",
        reference: expected.reference,
        amountCents: 3500,
        currency: "zar",
      }),
    ).not.toThrow()
  })

  it.each([
    [{ reference: "other" }, "reference"],
    [{ status: "failed" }, "not successful"],
    [{ amountCents: 3400 }, "amount"],
    [{ currency: "SZL" }, "currency"],
  ])("rejects a mismatched Paystack return: %s", (override, message) => {
    expect(() =>
      assertPaystackReturnMatches(expected, {
        status: "success",
        reference: expected.reference,
        amountCents: expected.amountCents,
        currency: expected.currency,
        ...override,
      }),
    ).toThrow(message)
  })
})
