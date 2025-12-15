import { createServerSupabaseClient } from "./supabase-server"
import type { PromoCodeRecord } from "@/types"

export async function validatePromoCode(
  code: string,
  eventId: string,
  purchaseAmount: number,
): Promise<{ valid: boolean; discount: number; promoCode?: PromoCodeRecord; error?: string }> {
  const supabase = createServerSupabaseClient()

  if (!supabase) {
    return { valid: false, discount: 0, error: "Service unavailable" }
  }

  // Fetch promo code
  const { data: promoCode, error } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("code", code.toUpperCase())
    .eq("active", true)
    .maybeSingle()

  if (error || !promoCode) {
    return { valid: false, discount: 0, error: "Invalid promo code" }
  }

  // Check if event-specific
  if (promoCode.event_id && promoCode.event_id !== eventId) {
    return { valid: false, discount: 0, error: "Promo code not valid for this event" }
  }

  // Check validity period
  const now = new Date()
  if (promoCode.valid_from && new Date(promoCode.valid_from) > now) {
    return { valid: false, discount: 0, error: "Promo code not yet valid" }
  }
  if (promoCode.valid_until && new Date(promoCode.valid_until) < now) {
    return { valid: false, discount: 0, error: "Promo code expired" }
  }

  // Check usage limits
  if (promoCode.max_uses && promoCode.used_count >= promoCode.max_uses) {
    return { valid: false, discount: 0, error: "Promo code usage limit reached" }
  }

  // Check minimum purchase amount
  if (promoCode.min_purchase_amount && purchaseAmount < promoCode.min_purchase_amount) {
    return {
      valid: false,
      discount: 0,
      error: `Minimum purchase of ${promoCode.currency} ${promoCode.min_purchase_amount} required`,
    }
  }

  // Calculate discount
  let discount = 0
  if (promoCode.type === "percentage") {
    discount = (purchaseAmount * promoCode.value) / 100
  } else if (promoCode.type === "fixed") {
    discount = promoCode.value
  }

  // Don't allow discount to exceed purchase amount
  discount = Math.min(discount, purchaseAmount)

  return { valid: true, discount, promoCode }
}

export async function applyPromoCode(
  promoCodeId: string,
  orderId: string,
  discountAmount: number,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerSupabaseClient()

  if (!supabase) {
    return { success: false, error: "Service unavailable" }
  }

  // Record usage
  const { error: usageError } = await supabase.from("promo_code_usage").insert({
    promo_code_id: promoCodeId,
    order_id: orderId,
    discount_amount: discountAmount,
    used_at: new Date().toISOString(),
  })

  if (usageError) {
    console.error("[v0] Failed to record promo code usage:", usageError)
    return { success: false, error: "Failed to apply promo code" }
  }

  // Increment used count
  const { error: updateError } = await supabase.rpc("increment_promo_code_usage", {
    promo_id: promoCodeId,
  })

  if (updateError) {
    console.error("[v0] Failed to increment promo code usage:", updateError)
  }

  return { success: true }
}

export async function getEventPromoCodes(eventId: string): Promise<PromoCodeRecord[]> {
  const supabase = createServerSupabaseClient()

  if (!supabase) {
    return []
  }

  const { data, error } = await supabase
    .from("promo_codes")
    .select("*")
    .or(`event_id.eq.${eventId},event_id.is.null`)
    .eq("active", true)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Failed to fetch promo codes:", error)
    return []
  }

  return data || []
}
