"use server"

import { createOrder } from "@/lib/orders"
import { createPaymentAttempt, type PaymentProvider } from "@/lib/payments"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { APP_URL } from "@/lib/env"

export interface StartCheckoutInput {
  eventId: string
  items: Array<{ ticketTypeId: string; quantity: number }>
  buyerEmail: string
  provider?: PaymentProvider
}

export type StartCheckoutResult =
  | { ok: true; orderId: string; checkoutUrl: string | null }
  | { ok: false; error: string }

export async function startCheckoutAction(input: StartCheckoutInput): Promise<StartCheckoutResult> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return { ok: false, error: "Supabase is not configured" }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false, error: "Please sign in to complete your purchase." }

  const buyerEmail = (input.buyerEmail || user.email || "").trim()
  if (!buyerEmail) return { ok: false, error: "Add an email address to receive your tickets." }

  const items = (input.items ?? []).filter((i) => i.ticketTypeId && i.quantity > 0)
  if (items.length === 0) return { ok: false, error: "Select at least one ticket." }

  const provider: PaymentProvider = input.provider ?? "paystack"

  try {
    const order = await createOrder({
      eventId: input.eventId,
      purchaserId: user.id,
      purchaserEmail: buyerEmail,
      items,
    })

    const attempt = await createPaymentAttempt({
      orderId: order.order.id,
      provider,
      userId: user.id,
      returnUrl: `${APP_URL}/orders/${order.order.id}/confirmation`,
    })

    return { ok: true, orderId: order.order.id, checkoutUrl: attempt.payment.checkoutUrl }
  } catch (error: any) {
    console.error("startCheckoutAction failed", error)
    return { ok: false, error: error?.message ?? "Unable to start checkout" }
  }
}
