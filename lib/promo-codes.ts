import { createServerSupabaseClient } from "./supabase-server"

// Promo codes are stored as rows in `price_rules` (a coded discount/fee rule).
// Redemptions are tracked in `price_rule_redemptions`.
export interface PriceRule {
  id: string
  org_id: string
  event_id: string | null
  ticket_type_id: string | null
  code: string | null
  type: "absolute_discount" | "percent_discount" | "abs_fee" | "percent_fee" | "tax"
  value_numeric: number
  applies_to: "item" | "order"
  starts_at: string | null
  ends_at: string | null
  max_redemptions: number | null
  per_user_limit: number | null
  is_active: boolean
  created_at: string
}

export async function validatePromoCode(
  code: string,
  eventId: string,
  purchaseAmount: number,
): Promise<{ valid: boolean; discount: number; promoCode?: PriceRule; error?: string }> {
  const supabase = createServerSupabaseClient()

  if (!supabase) {
    return { valid: false, discount: 0, error: "Service unavailable" }
  }

  const { data: priceRule, error } = await supabase
    .from("price_rules")
    .select("*")
    .ilike("code", code)
    .eq("is_active", true)
    .maybeSingle()

  if (error || !priceRule) {
    return { valid: false, discount: 0, error: "Invalid promo code" }
  }

  // Event-specific codes only apply to their event (org-wide codes have a null event_id)
  if (priceRule.event_id && priceRule.event_id !== eventId) {
    return { valid: false, discount: 0, error: "Promo code not valid for this event" }
  }

  const now = new Date()
  if (priceRule.starts_at && new Date(priceRule.starts_at) > now) {
    return { valid: false, discount: 0, error: "Promo code not yet valid" }
  }
  if (priceRule.ends_at && new Date(priceRule.ends_at) < now) {
    return { valid: false, discount: 0, error: "Promo code expired" }
  }

  if (priceRule.max_redemptions != null) {
    const { count } = await supabase
      .from("price_rule_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("price_rule_id", priceRule.id)

    if ((count ?? 0) >= priceRule.max_redemptions) {
      return { valid: false, discount: 0, error: "Promo code usage limit reached" }
    }
  }

  let discount = 0
  if (priceRule.type === "percent_discount") {
    discount = (purchaseAmount * Number(priceRule.value_numeric)) / 100
  } else if (priceRule.type === "absolute_discount") {
    discount = Number(priceRule.value_numeric)
  } else {
    return { valid: false, discount: 0, error: "Promo code is not a discount" }
  }

  // Don't allow discount to exceed purchase amount
  discount = Math.min(discount, purchaseAmount)

  return { valid: true, discount, promoCode: priceRule }
}

export async function applyPromoCode(
  priceRuleId: string,
  orderId: string,
  userId?: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerSupabaseClient()

  if (!supabase) {
    return { success: false, error: "Service unavailable" }
  }

  const { error } = await supabase.from("price_rule_redemptions").insert({
    price_rule_id: priceRuleId,
    order_id: orderId,
    user_id: userId ?? null,
  })

  if (error) {
    console.error("[v0] Failed to record promo code redemption:", error)
    return { success: false, error: "Failed to apply promo code" }
  }

  return { success: true }
}

export async function getEventPromoCodes(eventId: string): Promise<PriceRule[]> {
  const supabase = createServerSupabaseClient()

  if (!supabase) {
    return []
  }

  const { data, error } = await supabase
    .from("price_rules")
    .select("*")
    .or(`event_id.eq.${eventId},event_id.is.null`)
    .eq("is_active", true)
    .not("code", "is", null)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Failed to fetch promo codes:", error)
    return []
  }

  return data || []
}
