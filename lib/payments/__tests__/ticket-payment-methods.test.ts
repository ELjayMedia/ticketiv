import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import {
  parsePaymentProviderList,
  resolveCartPaymentProviders,
  resolveTicketTypePaymentProviders,
  ticketPaymentMethodsProblem,
  type TicketTypePaymentRule,
} from "@/lib/payments/availability-core"

const operational = ["paystack", "momo", "deltapay"] as const
const ticket = (id: string, currency: string, payment_providers: string[] = []): TicketTypePaymentRule => ({
  id,
  currency,
  payment_providers,
})

describe("per-ticket payment methods", () => {
  it("lets every ticket use every working method for its currency by default", () => {
    expect(resolveTicketTypePaymentProviders([...operational], [], ticket("a", "SZL"))).toEqual(["momo", "deltapay"])
    expect(resolveTicketTypePaymentProviders([...operational], [], ticket("b", "ZAR"))).toEqual(["paystack"])
  })

  it("limits a ticket to the methods the organiser picked", () => {
    expect(resolveTicketTypePaymentProviders([...operational], [], ticket("a", "SZL", ["momo"]))).toEqual(["momo"])
  })

  it("never lets a ticket add a method the event or platform doesn't offer", () => {
    expect(resolveTicketTypePaymentProviders([...operational], ["deltapay"], ticket("a", "SZL", ["momo"]))).toEqual([])
    expect(resolveTicketTypePaymentProviders(["deltapay"], [], ticket("a", "SZL", ["momo"]))).toEqual([])
  })

  it("offers a cart only the methods every ticket in it accepts", () => {
    const general = ticket("general", "SZL")
    const momoOnly = ticket("door", "SZL", ["momo"])
    const deltaOnly = ticket("vip", "SZL", ["deltapay"])
    expect(resolveCartPaymentProviders([...operational], [], [general, momoOnly])).toEqual(["momo"])
    expect(resolveCartPaymentProviders([...operational], [], [momoOnly, deltaOnly])).toEqual([])
    expect(resolveCartPaymentProviders([...operational], [], [])).toEqual([])
  })

  it("cleans the organiser's list: known methods, no repeats, catalog order", () => {
    expect(parsePaymentProviderList(undefined)).toEqual({ ok: true, providers: [] })
    expect(parsePaymentProviderList(["deltapay", "momo", "momo"])).toEqual({ ok: true, providers: ["momo", "deltapay"] })
    expect(parsePaymentProviderList(["manual"]).ok).toBe(false)
    expect(parsePaymentProviderList("momo").ok).toBe(false)
  })

  it("explains why a ticket's methods can't be saved", () => {
    expect(ticketPaymentMethodsProblem([], ["momo"], "SZL")).toBeNull()
    expect(ticketPaymentMethodsProblem(["momo"], [], "SZL")).toBeNull()
    expect(ticketPaymentMethodsProblem(["paystack"], [], "SZL")).toMatch(/can't take SZL/)
    expect(ticketPaymentMethodsProblem(["momo"], ["deltapay"], "SZL")).toMatch(/doesn't accept MTN MoMo/)
  })
})

describe("per-ticket payment methods are enforced on every payment path", () => {
  const read = (path: string) => readFileSync(path, "utf8")

  it("checkout passes the cart's ticket types when choosing and checking the method", () => {
    const action = read("app/(focused)/events/[id]/checkout/actions.ts")
    expect(action).toMatch(/getEffectivePaymentProvidersForEvent\(input\.eventId, ticketTypeIds\)/)
    expect(action).toMatch(/assertPaymentProviderAvailableForEvent\(input\.eventId, requestedProvider, ticketTypeIds\)/)
    const page = read("app/(focused)/events/[id]/checkout/page.tsx")
    expect(page).toMatch(/getEffectivePaymentMethodsForEvent\(\s*row\.id,\s*cart\.map/)
  })

  it("payment attempts check ticket-type lists, not just the event's", () => {
    expect(read("lib/payments/availability.ts")).toMatch(/ticketLists\.values\(\)/)
    expect(read("lib/payments.ts")).toMatch(/ticket_types\(id, payment_providers, events\(id, payment_providers\)\)/)
  })
})
