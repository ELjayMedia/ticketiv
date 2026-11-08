// The one list of attendee checkout providers.
//
// Everything that needs to know "which providers exist and what can they do"
// reads this: checkout availability and copy, routing, currency support, the
// production-readiness gate, refund dispatch and the webhook registry. Adding
// a provider starts here; the consistency tests in
// lib/payments/__tests__/provider-catalog.test.ts then point at every adapter
// that still needs to be written.
//
// Pure data, no server-only imports, so client components can use it too.

/** How the buyer finishes paying once the order exists. */
export type PaymentHandoff =
  /** Send the buyer to the provider's hosted page; they come back to a return URL. */
  | "hosted_redirect"
  /** The buyer approves a prompt on their phone; we collect the number on our own page. */
  | "phone_approval"

export interface PaymentProviderDescriptor {
  /** Buyer-facing name on the payment step. */
  label: string
  /** One line under the name. */
  sub: string
  /** Groups the method in the picker. */
  type: "card" | "mobile_money"
  /** ISO 4217 codes the processor contract supports. */
  currencies: readonly string[]
  handoff: PaymentHandoff
  /** "automatic" when a refund adapter submits and reconciles refunds; otherwise staff finish them by hand. */
  refunds: "automatic" | "manual"
  /** The processor only takes whole major units (no cents). */
  wholeMajorUnitsOnly: boolean
}

export const PAYMENT_PROVIDER_CATALOG = {
  paystack: {
    label: "Card / bank payment",
    sub: "Secure hosted checkout powered by Paystack",
    type: "card",
    // Paystack's published list does not include SZL.
    currencies: ["GHS", "KES", "NGN", "USD", "XOF", "ZAR"],
    handoff: "hosted_redirect",
    refunds: "automatic",
    wholeMajorUnitsOnly: false,
  },
  momo: {
    label: "MTN MoMo",
    sub: "Approve the payment on your MTN mobile wallet",
    type: "mobile_money",
    currencies: ["SZL"],
    handoff: "phone_approval",
    refunds: "automatic",
    // Collections `requesttopay` has no minor unit.
    wholeMajorUnitsOnly: true,
  },
  deltapay: {
    label: "DeltaPay",
    sub: "Pay securely in Emalangeni with DeltaPay",
    type: "mobile_money",
    // Hosted Checkout accepts decimal SZL amounts.
    currencies: ["SZL"],
    handoff: "hosted_redirect",
    refunds: "manual",
    wholeMajorUnitsOnly: false,
  },
} as const satisfies Record<string, PaymentProviderDescriptor>

export type CheckoutPaymentProvider = keyof typeof PAYMENT_PROVIDER_CATALOG

export const CHECKOUT_PROVIDERS = Object.keys(PAYMENT_PROVIDER_CATALOG) as CheckoutPaymentProvider[]

export function isCheckoutProvider(value: unknown): value is CheckoutPaymentProvider {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(PAYMENT_PROVIDER_CATALOG, value)
}

export function paymentProvider(id: CheckoutPaymentProvider): PaymentProviderDescriptor {
  return PAYMENT_PROVIDER_CATALOG[id]
}

/** Where a phone-approval provider collects the buyer's number for an order. */
export function phoneApprovalPath(provider: CheckoutPaymentProvider, orderId: string): string {
  return `/orders/${encodeURIComponent(orderId)}/${provider}`
}
