import { paystackWebhookAdapter } from "@/lib/payments/webhooks/paystack"
import { runPaymentWebhook } from "@/lib/payments/webhooks/run"

// Registered with Paystack. Same handler as /api/integrations/payments/paystack/webhook.
export async function POST(request: Request) {
  return runPaymentWebhook(paystackWebhookAdapter, request)
}
