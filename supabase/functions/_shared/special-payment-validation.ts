/** Pure, runtime-independent checks shared by the two payment callbacks. */
export type CheckoutKind = "resale_checkout" | "waitlist_checkout"

export interface VerifiedCallback {
  paymentId: string
  orderId: string
  subjectId: string
  providerReference: string
  amountCents: number
  currency: string
}

type Row = Record<string, unknown>

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function object(value: unknown): Row | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Row : null
}

/** Reject omitted status/provider/money/reference, rather than assuming success. */
export function parseSpecialPaymentCallback(raw: unknown, kind: CheckoutKind): VerifiedCallback | null {
  const data = object(raw)
  if (!data || data.provider !== "paystack" || !["succeeded", "success", "paid", "completed"].includes(String(data.status))) return null
  const subjectId = data[kind === "resale_checkout" ? "listingId" : "waitlistId"]
  if (![data.paymentId, data.orderId, subjectId].every((id) => typeof id === "string" && UUID.test(id))) return null
  if (typeof data.providerReference !== "string" || data.providerReference.trim().length < 1 || data.providerReference.length > 256) return null
  if (!Number.isSafeInteger(data.amountCents) || Number(data.amountCents) <= 0) return null
  if (typeof data.currency !== "string" || !/^[A-Z]{3}$/.test(data.currency)) return null
  return {
    paymentId: data.paymentId as string,
    orderId: data.orderId as string,
    subjectId: subjectId as string,
    providerReference: data.providerReference.trim(),
    amountCents: data.amountCents as number,
    currency: data.currency,
  }
}

/** All three independently recorded amounts/identifiers must agree with the provider. */
export function validateSpecialPaymentReconciliation(input: {
  callback: VerifiedCallback
  kind: CheckoutKind
  payment: Row
  order: Row
  attempt: Row
  providerResult: Row
}): string | null {
  const { callback: c, kind, payment: p, order: o, attempt: a, providerResult: v } = input
  const subjectKey = kind === "resale_checkout" ? "listing_id" : "waitlist_id"
  const paymentPayload = object(p.payload)
  if (p.id !== c.paymentId || p.order_id !== c.orderId || paymentPayload?.kind !== kind || paymentPayload?.[subjectKey] !== c.subjectId) return "payment_mismatch"
  if (o.id !== c.orderId || !["pending", "paid"].includes(String(o.status))) return "order_mismatch"
  if (p.amount_cents !== c.amountCents || p.currency !== c.currency || o.total_cents !== c.amountCents || o.currency !== c.currency) return "amount_or_currency_mismatch"
  if (!["manual", "paystack"].includes(String(p.provider)) || !["pending", "succeeded"].includes(String(p.status))) return "invalid_payment_state"
  if (p.ext_payment_id && p.ext_payment_id !== c.providerReference) return "reference_mismatch"
  if (p.status === "succeeded" && p.ext_payment_id !== c.providerReference) return "reference_mismatch"
  if (a.payment_id !== c.paymentId || a.order_id !== c.orderId || a.provider !== "paystack" || a.ext_ref !== c.providerReference) return "attempt_not_bound"
  if (!["pending", "succeeded"].includes(String(a.status))) return "invalid_attempt_state"
  if (v.status !== "success") return "provider_not_successful"
  if (v.reference !== c.providerReference || v.amount !== c.amountCents || v.currency !== c.currency) return "provider_mismatch"
  return null
}
