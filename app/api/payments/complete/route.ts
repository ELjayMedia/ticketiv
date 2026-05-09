import { NextResponse } from "next/server"

import { completeVerifiedPayment } from "@/lib/payments"

function isAuthorized(request: Request) {
  const expectedSecret = process.env.INTERNAL_PAYMENT_WEBHOOK_SECRET
  if (!expectedSecret) return false

  const providedSecret = request.headers.get("x-ticketiv-payment-secret")
  return providedSecret === expectedSecret
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
