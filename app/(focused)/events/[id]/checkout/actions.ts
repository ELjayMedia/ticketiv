"use server"

import { createOrder } from "@/lib/orders"
import { createPaymentAttempt, type PaymentProvider } from "@/lib/payments"
import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { APP_URL } from "@/lib/env"

export interface StartCheckoutInput {
  eventId: string
  items: Array<{ ticketTypeId: string; quantity: number }>
  buyerEmail: string
  /** Optional promo code applied to the new order before payment starts. */
  promoCode?: string | null
  provider?: PaymentProvider
}

export interface PromoApplyResult {
  applied: boolean
  label?: string
  adjustmentCents?: number
  reason?: string
}

export type StartCheckoutResult =
  | { ok: true; orderId: string; checkoutUrl: string | null; promo: PromoApplyResult | null }
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
  const promoCode = input.promoCode?.trim() || null

  try {
    const order = await createOrder({
      eventId: input.eventId,
      purchaserId: user.id,
      purchaserEmail: buyerEmail,
      items,
    })

    // Apply the promo code (if any) BEFORE the payment attempt so the
    // payment provider charges the discounted total. If application fails
    // we report it but still proceed with the un-discounted order — the
    // buyer can choose to abandon and retry with a corrected code.
    let promo: PromoApplyResult | null = null
    if (promoCode) {
      promo = await runApplyPromoCode(order.order.id, promoCode, user.id)
    }

    const attempt = await createPaymentAttempt({
      orderId: order.order.id,
      provider,
      userId: user.id,
      returnUrl: `${APP_URL}/orders/${order.order.id}/confirmation`,
    })

    return { ok: true, orderId: order.order.id, checkoutUrl: attempt.payment.checkoutUrl, promo }
  } catch (error: any) {
    console.error("startCheckoutAction failed", error)
    return { ok: false, error: error?.message ?? "Unable to start checkout" }
  }
}

/**
 * Apply a promo code to an existing pending order. Useful for the case where
 * the buyer enters a code on the checkout screen for an order that has
 * already been created. The server action mirrors the SQL RPC contract.
 */
export async function applyPromoCodeAction(orderId: string, code: string): Promise<PromoApplyResult> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return { applied: false, reason: "code_invalid" }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { applied: false, reason: "order_not_owned" }

  return runApplyPromoCode(orderId, code, user.id)
}

async function runApplyPromoCode(orderId: string, code: string, userId: string): Promise<PromoApplyResult> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc("fn_apply_promo_code_to_order", {
    p_order_id: orderId,
    p_code: code,
    p_user_id: userId,
  })

  if (error) {
    console.error("fn_apply_promo_code_to_order failed", error)
    return { applied: false, reason: "code_invalid" }
  }

  const payload = (data ?? {}) as {
    applied?: boolean
    label?: string
    adjustment_cents?: number
    reason?: string
  }

  if (!payload.applied) {
    return { applied: false, reason: payload.reason ?? "code_invalid" }
  }

  return {
    applied: true,
    label: payload.label,
    adjustmentCents: payload.adjustment_cents,
  }
}
