import { describe, expect, it } from "vitest"

import { matchRoutingRule, normaliseAllowed, type RoutingRule } from "@/lib/payments/routing"

const rule = (r: Partial<RoutingRule>): RoutingRule => ({
  priority: 100,
  country_code: null,
  currency: null,
  provider: "paystack",
  fallback_provider: null,
  is_active: true,
  ...r,
})

describe("matchRoutingRule", () => {
  it("returns null when no rule matches the currency", () => {
    const rules = [rule({ currency: "ZAR", provider: "paystack" })]
    expect(matchRoutingRule(rules, { currency: "SZL" })).toBeNull()
  })

  it("matches on currency and returns provider + fallback", () => {
    const rules = [rule({ currency: "SZL", provider: "momo", fallback_provider: "paystack" })]
    expect(matchRoutingRule(rules, { currency: "SZL" })).toEqual({ provider: "momo", fallback: "paystack" })
  })

  it("lowest priority wins", () => {
    const rules = [
      rule({ currency: "SZL", provider: "paystack", priority: 200 }),
      rule({ currency: "SZL", provider: "momo", priority: 10 }),
    ]
    expect(matchRoutingRule(rules, { currency: "SZL" })?.provider).toBe("momo")
  })

  it("treats null currency/country as wildcard", () => {
    const rules = [rule({ currency: null, country_code: null, provider: "paystack" })]
    expect(matchRoutingRule(rules, { currency: "USD" })?.provider).toBe("paystack")
  })

  it("requires country match when the rule scopes a country", () => {
    const rules = [rule({ country_code: "SZ", currency: "SZL", provider: "momo" })]
    expect(matchRoutingRule(rules, { currency: "SZL", countryCode: "SZ" })?.provider).toBe("momo")
    expect(matchRoutingRule(rules, { currency: "SZL", countryCode: "ZA" })).toBeNull()
    expect(matchRoutingRule(rules, { currency: "SZL" })).toBeNull()
  })

  it("ignores inactive rules", () => {
    const rules = [rule({ currency: "SZL", provider: "momo", is_active: false })]
    expect(matchRoutingRule(rules, { currency: "SZL" })).toBeNull()
  })

  it("is case-insensitive on currency and country", () => {
    const rules = [rule({ currency: "szl", country_code: "sz", provider: "momo" })]
    expect(matchRoutingRule(rules, { currency: "SZL", countryCode: "SZ" })?.provider).toBe("momo")
  })
})

describe("normaliseAllowed (event provider lock)", () => {
  it("drops unknown providers and empties to no-constraint", () => {
    expect(normaliseAllowed(["momo", "bogus", "paystack"])).toEqual(["momo", "paystack"])
    expect(normaliseAllowed([])).toEqual([])
    expect(normaliseAllowed(null)).toEqual([])
    expect(normaliseAllowed(["nope"])).toEqual([])
  })
})
