import { momoWebhookAdapter } from "@/lib/payments/webhooks/momo"
import { runPaymentWebhook } from "@/lib/payments/webhooks/run"

// MTN MoMo X-Callback-Url (MOMO_CALLBACK_URL). Same handler as
// /api/integrations/payments/momo/webhook.
export async function POST(request: Request) {
  return runPaymentWebhook(momoWebhookAdapter, request)
}
