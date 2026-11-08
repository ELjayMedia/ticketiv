import { describe, expect, it } from "vitest"

import { providerAcceptsAmountCents, providerSupportsCurrencies } from "@/lib/payments/availability-core"
import { PRODUCTION_READINESS_PROVIDERS } from "@/lib/payments/provider-readiness-core"
import {
  CHECKOUT_PROVIDERS,
  isCheckoutProvider,
  PAYMENT_PROVIDER_CATALOG,
  phoneApprovalPath,
} from "@/lib/payments/providers/catalog"
import { REFUND_ADAPTERS } from "@/lib/payments/refunds"
import { KNOWN_PROVIDERS } from "@/lib/payments/routing"
import { PAYMENT_WEBHOOK_ADAPTERS, paymentWebhookAdapterFor } from "@/lib/payments/webhooks/registry"

describe("payment provider catalog", () => {
  it("is the one provider list for routing and the readiness gate", () => {
    expect(CHECKOUT_PROVIDERS).toEqual(Object.keys(PAYMENT_PROVIDER_CATALOG))
    expect(KNOWN_PROVIDERS).toEqual(CHECKOUT_PROVIDERS)
    expect([...PRODUCTION_READINESS_PROVIDERS]).toEqual(CHECKOUT_PROVIDERS)
  })

  it("never treats the internal manual provider as a checkout rail", () => {
    expect(isCheckoutProvider("manual")).toBe(false)
    expect(isCheckoutProvider("toString")).toBe(false)
    expect(isCheckoutProvider(undefined)).toBe(false)
    expect(isCheckoutProvider("momo")).toBe(true)
  })

  it("has a webhook adapter for every provider, keyed by its own id", () => {
    for (const id of CHECKOUT_PROVIDERS) {
      expect(PAYMENT_WEBHOOK_ADAPTERS[id].provider).toBe(id)
      expect(paymentWebhookAdapterFor(id)).toBe(PAYMENT_WEBHOOK_ADAPTERS[id])
    }
    expect(paymentWebhookAdapterFor("manual")).toBeNull()
    expect(paymentWebhookAdapterFor("../paystack")).toBeNull()
  })

  it("has a refund adapter exactly for providers whose refunds are automatic", () => {
    for (const id of CHECKOUT_PROVIDERS) {
      expect(Boolean(REFUND_ADAPTERS[id]), id).toBe(PAYMENT_PROVIDER_CATALOG[id].refunds === "automatic")
    }
  })

  it("drives currency support and the whole-unit rule", () => {
    expect(providerSupportsCurrencies("momo", ["SZL"])).toBe(true)
    expect(providerSupportsCurrencies("paystack", ["SZL"])).toBe(false)
    expect(providerSupportsCurrencies("deltapay", ["szl"])).toBe(true)
    expect(providerAcceptsAmountCents("momo", 10544)).toBe(false)
    expect(providerAcceptsAmountCents("momo", 10500)).toBe(true)
    expect(providerAcceptsAmountCents("deltapay", 10544)).toBe(true)
  })

  it("routes phone-approval providers to their own approval page", () => {
    const phone = CHECKOUT_PROVIDERS.filter((id) => PAYMENT_PROVIDER_CATALOG[id].handoff === "phone_approval")
    expect(phone).toEqual(["momo"])
    expect(phoneApprovalPath("momo", "ord_1")).toBe("/orders/ord_1/momo")
  })
})
