import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { PaymentChannelUnavailableError } from "@/lib/payments/errors"
import {
  matchRoutingRule,
  normaliseAllowed,
  ProviderNotAllowedError,
  selectPaymentProvider,
  type RoutingRule,
} from "@/lib/payments/routing"

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

  it("uses specificity and provider key to resolve equal priorities deterministically", () => {
    const rules = [
      rule({ currency: null, provider: "paystack", priority: 10 }),
      rule({ currency: "ZAR", provider: "paystack", priority: 10 }),
      rule({ currency: "ZAR", provider: "momo", priority: 10 }),
    ]
    expect(matchRoutingRule(rules, { currency: "ZAR" })?.provider).toBe("momo")
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

describe("selectPaymentProvider", () => {
  it("selects an active Paystack route", () => {
    expect(
      selectPaymentProvider([rule({ currency: "ZAR", provider: "paystack" })], {
        currency: "ZAR",
      }),
    ).toBe("paystack")
  })

  it("rejects a client choice disabled by the event", () => {
    expect(() =>
      selectPaymentProvider([], {
        currency: "ZAR",
        requested: "paystack",
        allowedProviders: ["momo"],
      }),
    ).toThrow(ProviderNotAllowedError)
  })

  it("rejects an inactive provider instead of falling back to it", () => {
    expect(() =>
      selectPaymentProvider([rule({ currency: "ZAR", provider: "paystack", is_active: false })], {
        currency: "ZAR",
      }),
    ).toThrow(PaymentChannelUnavailableError)
  })

  it("returns a controlled correlation reference when routing configuration is missing", () => {
    try {
      selectPaymentProvider([], { currency: "ZAR" })
      throw new Error("Expected payment routing to fail")
    } catch (error) {
      expect(error).toBeInstanceOf(PaymentChannelUnavailableError)
      expect((error as PaymentChannelUnavailableError).reason).toBe("no_matching_route")
      expect((error as PaymentChannelUnavailableError).correlationId).toMatch(/^PAY-[A-F0-9]{8}$/)
    }
  })

  it("skips a higher-priority route excluded by the event lock", () => {
    expect(
      selectPaymentProvider(
        [
          rule({ currency: "SZL", provider: "paystack", priority: 1 }),
          rule({ currency: "SZL", provider: "momo", priority: 10 }),
        ],
        { currency: "SZL", allowedProviders: ["momo"] },
      ),
    ).toBe("momo")
  })
})

describe("SZL has a shipped route", () => {
  // The matcher above is thoroughly tested, but it can only pick from the rules
  // that actually exist in the database. TICK-355 disabled SZ/SZL → paystack
  // (Paystack cannot settle SZL) and left nothing in its place, so every SZL
  // order that did not name a provider by hand failed with `no_matching_route`
  // — the home currency had no rail at all. Guard the replacement.
  const migrations = readdirSync(join(process.cwd(), "supabase/migrations"))
  const file = migrations.find((name) => name.endsWith("_route_szl_to_momo.sql"))

  it("ships a migration routing SZL to MoMo", () => {
    expect(file, "SZL→MoMo routing migration is missing").toBeDefined()

    const sql = readFileSync(join(process.cwd(), "supabase/migrations", file!), "utf8")
    expect(sql).toContain("'SZL'")
    expect(sql).toContain("'momo'")
    expect(sql).toContain("payment_routing_rules")
  })

  it("does not fall back to a provider that cannot settle SZL", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations", file!), "utf8")
    // A paystack fallback on an SZL rule would move the buyer onto a rail that
    // must fail; `no_matching_route` is the honest outcome.
    expect(sql).not.toMatch(/'SZL',\s*'momo',\s*'paystack'/)
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
