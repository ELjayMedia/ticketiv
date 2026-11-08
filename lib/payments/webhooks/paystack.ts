import "server-only"

import { NextResponse } from "next/server"

import { completeTrustedPaystackWebhook, verifyTrustedPaystackSignature } from "@/lib/payments/paystack-webhook"
import { paystackRefundWebhookEventId } from "@/lib/payments/paystack-refund-core"
import type { PaymentWebhookAdapter } from "@/lib/payments/webhooks/types"

/** Paystack: HMAC-signed over the raw body (x-paystack-signature). */
export const paystackWebhookAdapter: PaymentWebhookAdapter = {
  provider: "paystack",
  recordsReceipt: true,

  async intake(request) {
    const rawBody = await request.text()
    const signature = request.headers.get("x-paystack-signature")

    if (!(await verifyTrustedPaystackSignature(rawBody, signature))) {
      return NextResponse.json({ error: "Invalid Paystack signature" }, { status: 401 })
    }

    let payload: Record<string, any>
    try {
      payload = JSON.parse(rawBody) as Record<string, any>
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }

    const data = payload.data ?? {}
    const eventId =
      paystackRefundWebhookEventId(payload) ??
      (data.id ? String(data.id) : data.reference ? String(data.reference) : null)
    if (!eventId) {
      return NextResponse.json({ error: "Paystack webhook missing event identifier" }, { status: 400 })
    }

    return { eventId, signature, payload }
  },

  async process(delivery) {
    const result = await completeTrustedPaystackWebhook(delivery.payload as Record<string, any>)
    return { done: true, response: NextResponse.json({ ok: true, result }) }
  },

  failureBody(error) {
    return { error: error instanceof Error ? error.message : "Unable to process webhook" }
  },
}
