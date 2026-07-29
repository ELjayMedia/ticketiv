"use server"

import { cookies } from "next/headers"

import { createOrder } from "@/lib/orders"
import { createPaymentAttempt, type PaymentProvider } from "@/lib/payments"
import {
  assertPaymentProviderAvailableForEvent,
  getEffectivePaymentProvidersForEvent,
  type CheckoutPaymentProvider,
} from "@/lib/payments/availability"
import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { ensureCheckoutIdentity } from "@/lib/auth/checkout-identity"
import { APP_URL } from "@/lib/env"

const PAYMENT_PROVIDER_COOKIE = "ticketiv_payment_provider"

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
  | {
      ok: true
      orderId: string
      checkoutUrl: string | null
      provider: CheckoutPaymentProvider
      promo: PromoApplyResult | null
    }
  | { ok: false; error: string }

export async function startCheckoutAction(input: StartCheckoutInput): Promise<StartCheckoutResult> {
  // Guest checkout: mint an anonymous Supabase user when there's no session
  // so orders.buyer_id always references a real auth.uid() and RLS holds.
  // Authenticated buyers fall through unchanged.
  const identity = await ensureCheckoutIdentity()
  if (!identity) return { ok: false, error: "Sign-in is unavailable right now. Please try again." }

  const buyerEmail = (input.buyerEmail || identity.email || "").trim()
  if (!buyerEmail) return { ok: false, error: "Add an email address to receive your tickets." }

  const items = (input.items ?? []).filter((i) => i.ticketTypeId && i.quantity > 0)
  if (items.length === 0) return { ok: false, error: "Select at least one ticket." }

  const promoCode = input.promoCode?.trim() || null

  try {
    // The UI bridge writes the buyer's selection to a short-lived first-party
    // cookie. Explicit callers can still pass provider directly. Either way the
    // requested key is revalidated against the event lock and current platform
    // operational state before an order or provider attempt is created.
    const cookieStore = await cookies()
    const cookieProvider = cookieStore.get(PAYMENT_PROVIDER_COOKIE)?.value ?? null
    const effectiveProviders = await getEffectivePaymentProvidersForEvent(input.eventId)

    if (effectiveProviders.length === 0) {
      return {
        ok: false,
        error:
          "Checkout is unavailable because this event has no active payment method. Please contact the organizer.",
      }
    }

    const requestedProvider = input.provider ?? cookieProvider ?? effectiveProviders[0]
    const provider = await assertPaymentProviderAvailableForEvent(input.eventId, requestedProvider)

    const order = await createOrder({
      eventId: input.eventId,
      purchaserId: identity.userId,
      purchaserEmail: buyerEmail,
      items,
    })

    // Apply the promo code (if any) BEFORE the payment attempt so the
    // payment provider charges the discounted total. If application fails
    // we report it but still proceed with the un-discounted order — the
    // buyer can choose to abandon and retry with a corrected code.
    let promo: PromoApplyResult | null = null
    if (promoCode) {
      promo = await runApplyPromoCode(order.order.id, promoCode, identity.userId)
    }

    // MoMo needs an Eswatini MSISDN, which is collected on the dedicated
    // approval screen. Do not create a placeholder/fake provider attempt here;
    // /api/payments/momo/create creates the real request-to-pay and attempt.
    if (provider === "momo") {
      return {
        ok: true,
        orderId: order.order.id,
        checkoutUrl: `/orders/${order.order.id}/momo`,
        provider,
        promo,
      }
    }

    const attempt = await createPaymentAttempt({
      orderId: order.order.id,
      provider,
      userId: identity.userId,
      returnUrl: `${APP_URL}/orders/${order.order.id}/confirmation`,
    })

    return {
      ok: true,
      orderId: order.order.id,
      checkoutUrl: attempt.payment.checkoutUrl,
      provider,
      promo,
    }
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
