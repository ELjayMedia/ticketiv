import { deltapayWebhookAdapter } from "@/lib/payments/webhooks/deltapay"
import { runPaymentWebhook } from "@/lib/payments/webhooks/run"

// Registered with DeltaPay. Same handler as /api/integrations/payments/deltapay/webhook.
export async function POST(request: Request) {
  return runPaymentWebhook(deltapayWebhookAdapter, request)
}
