import { NextResponse } from "next/server"

import { paymentWebhookAdapterFor } from "@/lib/payments/webhooks/registry"
import { runPaymentWebhook } from "@/lib/payments/webhooks/run"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * POST /api/integrations/payments/:provider/webhook
 *
 * The single entry point for payment provider notifications. Each provider's
 * adapter authenticates the request (signature or re-query) and the shared
 * runner handles receipts and deduplication. The older provider-specific URLs
 * (/api/payments/paystack/webhook, /api/payments/deltapay/callback,
 * /api/payments/momo/callback) stay registered with providers and run the same
 * adapters.
 */
export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params
  const adapter = paymentWebhookAdapterFor(provider)
  if (!adapter) return NextResponse.json({ error: "Unknown payment provider" }, { status: 404 })
  return runPaymentWebhook(adapter, request)
}
