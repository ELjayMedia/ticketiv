export interface PaystackReturnExpectation {
  reference: string
  amountCents: number
  currency: string
}

export interface PaystackReturnVerification {
  status: string
  reference: string
  amountCents: number
  currency: string
}

export function assertPaystackReturnMatches(
  expected: PaystackReturnExpectation,
  verified: PaystackReturnVerification,
) {
  if (verified.reference !== expected.reference) {
    throw new Error("Paystack return reference does not match the payment attempt")
  }
  if (verified.status !== "success") {
    throw new Error(`Paystack transaction is not successful: ${verified.status || "unknown"}`)
  }
  if (verified.amountCents !== expected.amountCents) {
    throw new Error("Paystack return amount does not match the order")
  }
  if (verified.currency.toUpperCase() !== expected.currency.toUpperCase()) {
    throw new Error("Paystack return currency does not match the order")
  }
}
