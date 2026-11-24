import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { parsePaymentProviderList, resolveCartPaymentProviders, resolveEffectivePaymentProviders } from "@/lib/payments/availability-core"

describe("organisation default payment methods (TICK-394)", () => {
  const operational = ["paystack", "momo", "deltapay"] as const

  it("org default narrows; events and ticket types narrow further; nothing widens", () => {
    const org = ["momo", "paystack"]
    const afterOrg = resolveEffectivePaymentProviders([...operational], [org])
    expect(afterOrg).toEqual(["paystack", "momo"])
    expect(resolveEffectivePaymentProviders(afterOrg, [[]])).toEqual(["paystack", "momo"]) // event inherits
    expect(resolveEffectivePaymentProviders(afterOrg, [["momo"]])).toEqual(["momo"]) // event override
    expect(resolveEffectivePaymentProviders(afterOrg, [["deltapay"]])).toEqual([]) // can't bypass the org list
    expect(resolveCartPaymentProviders(afterOrg, [], [{ id: "t", currency: "SZL", payment_providers: ["momo"] }])).toEqual(["momo"])
  })

  it("empty org list means all available", () => {
    expect(resolveEffectivePaymentProviders([...operational], [[]])).toEqual([...operational])
  })

  it("rejects unknown providers", () => {
    expect(parsePaymentProviderList(["bitcoin"]).ok).toBe(false)
    expect(parsePaymentProviderList(["momo", "momo"])).toEqual({ ok: true, providers: ["momo"] })
  })

  it("checkout, ticket-type and order validation all apply the org list", () => {
    const src = readFileSync("lib/payments/availability.ts", "utf8")
    expect(src).toContain("organizations(payment_providers)")
    expect(src.match(/\[rules\.orgProviders\]/g)?.length).toBe(2)
    expect(src).toContain("[...orgLists.values(), ...eventLists.values(), ...ticketLists.values()]")
    expect(src).toContain("configured: false, operational: false")
  })

  it("has a settings page for managers", () => {
    expect(readFileSync("app/orgs/[orgId]/settings/payments/page.tsx", "utf8")).toContain("requireOrgManager(orgId)")
  })
})
