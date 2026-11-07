import { describe, expect, it } from "vitest"
import { parseSpecialPaymentCallback, validateSpecialPaymentReconciliation } from "../supabase/functions/_shared/special-payment-validation"

const paymentId = "00000000-0000-4000-8000-000000000001"
const orderId = "00000000-0000-4000-8000-000000000002"
const subjectId = "00000000-0000-4000-8000-000000000003"
const reference = "paystack-test-reference"
const kind = "resale_checkout" as const
const validPayload = { paymentId, orderId, listingId: subjectId, provider: "paystack", providerReference: reference, status: "success", amountCents: 4500, currency: "ZAR" }

function bound() {
  return {
    callback: parseSpecialPaymentCallback(validPayload, kind)!, kind,
    payment: { id: paymentId, order_id: orderId, provider: "manual", status: "pending", amount_cents: 4500, currency: "ZAR", ext_payment_id: null, payload: { kind, listing_id: subjectId } },
    order: { id: orderId, status: "pending", total_cents: 4500, currency: "ZAR" },
    attempt: { payment_id: paymentId, order_id: orderId, status: "pending", provider: "paystack", ext_ref: reference },
    providerResult: { status: "success", reference, amount: 4500, currency: "ZAR" },
  }
}

describe("TICK-465 provider-verified resale and waitlist callbacks", () => {
  it("requires explicit provider, success status, reference, amount, currency and IDs", () => {
    expect(parseSpecialPaymentCallback(validPayload, kind)).not.toBeNull()
    for (const field of ["provider", "providerReference", "status", "amountCents", "currency", "paymentId", "orderId", "listingId"] as const) {
      const tampered = { ...validPayload, [field]: undefined }
      expect(parseSpecialPaymentCallback(tampered, kind), field).toBeNull()
    }
    expect(parseSpecialPaymentCallback({ ...validPayload, status: "pending" }, kind)).toBeNull()
    expect(parseSpecialPaymentCallback({ ...validPayload, amountCents: 0 }, kind)).toBeNull()
    expect(parseSpecialPaymentCallback({ ...validPayload, amountCents: 4500.5 }, kind)).toBeNull()
    expect(parseSpecialPaymentCallback({ ...validPayload, provider: "manual" }, kind)).toBeNull()
    expect(parseSpecialPaymentCallback({ ...validPayload, waitlistId: subjectId }, "waitlist_checkout")).not.toBeNull()
    expect(parseSpecialPaymentCallback(validPayload, "waitlist_checkout")).toBeNull()
  })

  it("accepts only a provider-verified attempt pre-bound to this payment and reference", () => {
    expect(validateSpecialPaymentReconciliation(bound())).toBeNull()
    const a = bound()
    a.attempt.ext_ref = "other-ref"
    expect(validateSpecialPaymentReconciliation(a)).toBe("attempt_not_bound")
  })

  it("rejects forged status, amount, currency, reference, subject, or cross-order replay", () => {
    const cases = [
      (b: ReturnType<typeof bound>) => { b.providerResult.status = "pending" },
      (b: ReturnType<typeof bound>) => { b.providerResult.reference = "stolen-reference" },
      (b: ReturnType<typeof bound>) => { b.providerResult.amount = 4400 },
      (b: ReturnType<typeof bound>) => { b.providerResult.currency = "SZL" },
      (b: ReturnType<typeof bound>) => { b.order.total_cents = 4400 },
      (b: ReturnType<typeof bound>) => { b.order.id = "someone-elses-order" },
      (b: ReturnType<typeof bound>) => { b.payment.payload.listing_id = "other-listing" },
      (b: ReturnType<typeof bound>) => { b.attempt.payment_id = "someone-elses-payment" },
    ]
    for (const tamper of cases) {
      const b = bound()
      tamper(b)
      expect(validateSpecialPaymentReconciliation(b)).not.toBeNull()
    }
  })

  it("permits idempotent replay only for the identical successful transaction", () => {
    const b = bound()
    b.payment.status = "succeeded"
    b.payment.ext_payment_id = reference as never
    b.order.status = "paid"
    b.attempt.status = "succeeded"
    expect(validateSpecialPaymentReconciliation(b)).toBeNull()
    b.payment.ext_payment_id = "different-reference" as never
    expect(validateSpecialPaymentReconciliation(b)).toBe("reference_mismatch")
  })
})
