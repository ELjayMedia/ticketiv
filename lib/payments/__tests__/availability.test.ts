import { describe, expect, it } from "vitest"

import {
  evaluateMomoConfig,
  filterProvidersByCurrencies,
  momoAcceptsAmountCents,
  providerSupportsCurrencies,
  resolveEffectivePaymentProviders,
} from "@/lib/payments/availability-core"

// A complete production MoMo configuration, as docs/PAYMENTS.md specifies.
const PROD_MOMO = {
  collectionsPrimaryKey: "key",
  apiUser: "user",
  apiKey: "secret",
  baseUrl: "https://proxy.momoapi.mtn.com",
  environment: "mtnswaziland",
  deploymentEnv: "production",
}

describe("evaluateMomoConfig", () => {
  it("accepts a complete production configuration", () => {
    expect(evaluateMomoConfig(PROD_MOMO)).toEqual({ operational: true, problems: [] })
  })

  it("rejects the legacy target name that MTN does not accept", () => {
    const state = evaluateMomoConfig({
      ...PROD_MOMO,
      environment: "swaziland",
    })

    expect(state.operational).toBe(false)
    expect(state.problems.join(" ")).toContain(
      'MOMO_ENVIRONMENT must be "mtnswaziland"',
    )
  })

  it("refuses to call MoMo operational when only the credentials are set", () => {
    // The exact shape of the old check. lib/payments/momo.ts defaults
    // MOMO_BASE_URL to the sandbox host and MOMO_ENVIRONMENT to "sandbox", so
    // treating credentials alone as sufficient sends live buyers to the sandbox.
    const state = evaluateMomoConfig({
      collectionsPrimaryKey: "key",
      apiUser: "user",
      apiKey: "secret",
      deploymentEnv: "production",
    })

    expect(state.operational).toBe(false)
    expect(state.problems.join(" ")).toContain("MOMO_ENVIRONMENT is not set")
    expect(state.problems.join(" ")).toContain("MOMO_BASE_URL is not set")
  })

  it("names each missing credential", () => {
    const state = evaluateMomoConfig({ ...PROD_MOMO, apiKey: "  ", collectionsPrimaryKey: undefined })

    expect(state.operational).toBe(false)
    expect(state.problems[0]).toContain("MOMO_COLLECTIONS_PRIMARY_KEY")
    expect(state.problems[0]).toContain("MOMO_API_KEY")
    expect(state.problems[0]).not.toContain("MOMO_API_USER")
  })

  it("blocks a production deployment pointed at the sandbox", () => {
    const viaEnvironment = evaluateMomoConfig({
      ...PROD_MOMO,
      environment: "sandbox",
      baseUrl: "https://sandbox.momodeveloper.mtn.com",
    })
    expect(viaEnvironment.operational).toBe(false)
    expect(viaEnvironment.problems.join(" ")).toContain("pointed at the MTN sandbox")
  })

  it("catches a half-migrated configuration where the two settings disagree", () => {
    const state = evaluateMomoConfig({
      ...PROD_MOMO,
      environment: "mtnswaziland",
      baseUrl: "https://sandbox.momodeveloper.mtn.com",
    })

    expect(state.operational).toBe(false)
    expect(state.problems.join(" ")).toContain("disagree about sandbox vs production")
  })

  it("still allows a coherent sandbox setup outside production", () => {
    const state = evaluateMomoConfig({
      collectionsPrimaryKey: "key",
      apiUser: "user",
      apiKey: "secret",
      baseUrl: "https://sandbox.momodeveloper.mtn.com",
      environment: "sandbox",
      deploymentEnv: "development",
    })

    expect(state).toEqual({ operational: true, problems: [] })
  })
})

describe("momoAcceptsAmountCents", () => {
  it("accepts whole Lilangeni amounts", () => {
    expect(momoAcceptsAmountCents(10_000)).toBe(true)
    expect(momoAcceptsAmountCents(100)).toBe(true)
  })

  it("rejects totals carrying cents, rather than rounding them", () => {
    // SZL 99.00 + a 6.5% buyer-paid platform fee = 10,544 cents. Rounding to
    // SZL 105 would charge 44c less than orders.total_cents records, so the
    // provider settlement could never reconcile against the order.
    expect(momoAcceptsAmountCents(10_544)).toBe(false)
    expect(momoAcceptsAmountCents(1)).toBe(false)
  })

  it("rejects zero, negative and non-integer totals", () => {
    expect(momoAcceptsAmountCents(0)).toBe(false)
    expect(momoAcceptsAmountCents(-100)).toBe(false)
    expect(momoAcceptsAmountCents(100.5)).toBe(false)
  })
})

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
