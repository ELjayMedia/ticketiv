import { createHash, timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"

import { completeVerifiedPayment } from "@/lib/payments"

// This endpoint marks an order paid without asking a provider, so its secret
// is effectively a "mark paid" key. Refuse short secrets outright and compare
// in constant time (hashing first gives equal-length buffers and hides the
// expected length).
const MIN_SECRET_LENGTH = 32

function digest(value: string) {
  return createHash("sha256").update(value).digest()
}

function isAuthorized(request: Request) {
  const expectedSecret = process.env.INTERNAL_PAYMENT_WEBHOOK_SECRET
  if (!expectedSecret || expectedSecret.length < MIN_SECRET_LENGTH) return false

  const providedSecret = request.headers.get("x-ticketiv-payment-secret")
  if (!providedSecret) return false
  return timingSafeEqual(digest(providedSecret), digest(expectedSecret))
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()

    const result = await completeVerifiedPayment({
      orderId: String(body.orderId ?? ""),
      provider: String(body.provider ?? "").toLowerCase() as any,
      extPaymentId: String(body.extPaymentId ?? body.reference ?? ""),
      payload: body.payload ?? body,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Failed to complete verified payment", error)
    return NextResponse.json({ error: error?.message ?? "Unable to complete payment" }, { status: 400 })
  }
}
