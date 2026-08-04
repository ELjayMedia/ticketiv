import { describe, expect, it } from "vitest"

import {
  filterProvidersByCurrencies,
  providerSupportsCurrencies,
  resolveEffectivePaymentProviders,
} from "@/lib/payments/availability-core"

describe("provider currency support", () => {
  it("offers Paystack for its published ZAR currency but not SZL", () => {
    expect(providerSupportsCurrencies("paystack", ["ZAR"])).toBe(true)
    expect(providerSupportsCurrencies("paystack", ["SZL"])).toBe(false)
  })

  it("offers the Eswatini MoMo adapter for SZL but not ZAR", () => {
    expect(providerSupportsCurrencies("momo", ["SZL"])).toBe(true)
    expect(providerSupportsCurrencies("momo", ["ZAR"])).toBe(false)
  })

  it("rejects a provider when any order currency is unsupported", () => {
    expect(filterProvidersByCurrencies(["paystack", "momo"], ["ZAR"])).toEqual(["paystack"])
    expect(filterProvidersByCurrencies(["paystack", "momo"], ["SZL"])).toEqual(["momo"])
    expect(filterProvidersByCurrencies(["paystack", "momo"], ["ZAR", "SZL"])).toEqual([])
  })
})

describe("resolveEffectivePaymentProviders", () => {
  const operational = ["paystack", "momo"] as const

  it("offers every operational method when the organizer leaves the list empty", () => {
    expect(resolveEffectivePaymentProviders([...operational], [[]])).toEqual([
      "paystack",
      "momo",
    ])
  })

  it("honours Paystack-only, MoMo-only and both selections", () => {
    expect(resolveEffectivePaymentProviders([...operational], [["paystack"]])).toEqual([
      "paystack",
    ])
    expect(resolveEffectivePaymentProviders([...operational], [["momo"]])).toEqual([
      "momo",
    ])
    expect(
      resolveEffectivePaymentProviders([...operational], [["paystack", "momo"]]),
    ).toEqual(["paystack", "momo"])
  })

  it("never returns a provider that is not operational platform-wide", () => {
    expect(resolveEffectivePaymentProviders(["paystack"], [["paystack", "momo"]])).toEqual([
      "paystack",
    ])
    expect(resolveEffectivePaymentProviders(["paystack"], [["momo"]])).toEqual([])
  })

  it("blocks stale locks that contain only unsupported providers", () => {
    expect(resolveEffectivePaymentProviders([...operational], [["manual"]])).toEqual([])
    expect(resolveEffectivePaymentProviders([...operational], [["flutterwave"]])).toEqual([])
  })

  it("intersects provider locks when an order spans more than one event", () => {
    expect(
      resolveEffectivePaymentProviders([...operational], [
        ["paystack", "momo"],
        ["momo"],
      ]),
    ).toEqual(["momo"])

    expect(
      resolveEffectivePaymentProviders([...operational], [["paystack"], ["momo"]]),
    ).toEqual([])
  })
})
