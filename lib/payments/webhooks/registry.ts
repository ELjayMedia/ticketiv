import "server-only"

import { isCheckoutProvider, type CheckoutPaymentProvider } from "@/lib/payments/providers/catalog"
import { deltapayWebhookAdapter } from "@/lib/payments/webhooks/deltapay"
import { momoWebhookAdapter } from "@/lib/payments/webhooks/momo"
import { paystackWebhookAdapter } from "@/lib/payments/webhooks/paystack"
import type { PaymentWebhookAdapter } from "@/lib/payments/webhooks/types"

/**
 * One webhook adapter per checkout provider. The Record type makes a new
 * catalog provider a type error here until its adapter exists.
 */
export const PAYMENT_WEBHOOK_ADAPTERS: Record<CheckoutPaymentProvider, PaymentWebhookAdapter> = {
  paystack: paystackWebhookAdapter,
  momo: momoWebhookAdapter,
  deltapay: deltapayWebhookAdapter,
}

export function paymentWebhookAdapterFor(provider: string): PaymentWebhookAdapter | null {
  return isCheckoutProvider(provider) ? PAYMENT_WEBHOOK_ADAPTERS[provider] : null
}
