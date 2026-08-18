import { NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"

import { APP_URL } from "@/lib/env"
import { verifyDeltaPayByReturn } from "@/lib/payments/deltapay-verification"

function confirmationUrl(orderId: string, status?: string) {
  const url = new URL(`/orders/${encodeURIComponent(orderId)}/confirmation`, APP_URL)
  if (status) url.searchParams.set("payment_status", status)
  return url
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const orderId = url.searchParams.get("order_id")?.trim() ?? ""
  const merchantReference = url.searchParams.get("merchant_reference")?.trim() ?? ""

  if (!orderId || !merchantReference) {
    return NextResponse.redirect(new URL("/", APP_URL), 303)
  }

  try {
    const result = await verifyDeltaPayByReturn(orderId, merchantReference)
    return NextResponse.redirect(confirmationUrl(orderId, result.status), 303)
  } catch (error) {
    console.error("Failed to verify DeltaPay return", error)
    Sentry.captureException(error, {
      tags: { area: "deltapay-return", provider: "deltapay" },
      extra: { orderId, merchantReference },
    })
    return NextResponse.redirect(confirmationUrl(orderId, "verification_failed"), 303)
  }
}
