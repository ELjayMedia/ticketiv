import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit"

// Buyer-facing copy for preview rejections. The RPC reasons mirror
// fn_apply_promo_code_to_order, which stays the enforcement layer at
// order time — this endpoint is UI preview only.
const REASON_COPY: Record<string, string> = {
  code_required: "Enter a promo code",
  event_not_found: "Invalid or expired promo code",
  code_invalid: "Invalid or expired promo code",
  code_exhausted: "This promo code has reached its usage limit",
}

export async function POST(req: NextRequest) {
  const rl = await rateLimit("promo:validate", clientKey(req), 20, 60)
  if (!rl.allowed) return tooManyRequests(rl)

  const { code, eventId } = await req.json()
  if (!code || !eventId) {
    return NextResponse.json({ valid: false, error: "Missing fields" }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()
  if (!supabase) return NextResponse.json({ valid: false, error: "Server error" }, { status: 500 })

  // Promo codes live in price_rules (org-manager-only under RLS), so the
  // preview goes through the read-only SECURITY DEFINER RPC rather than a
  // direct table read — a direct read in the buyer's session always came
  // back empty and made every code look invalid.
  const { data, error } = await supabase.rpc("fn_preview_promo_code", {
    p_event_id: eventId,
    p_code: String(code),
  })

  if (error) {
    console.error("fn_preview_promo_code failed", error)
    return NextResponse.json({ valid: false, error: "Could not validate code" }, { status: 500 })
  }

  const result = (data ?? {}) as {
    valid?: boolean
    reason?: string
    promoId?: string
    discountType?: "percent" | "fixed"
    discountValue?: number
  }

  if (!result.valid) {
    return NextResponse.json({
      valid: false,
      error: REASON_COPY[result.reason ?? ""] ?? "Invalid or expired promo code",
    })
  }

  return NextResponse.json({
    valid: true,
    promoId: result.promoId,
    discountType: result.discountType, // "percent" | "fixed"
    discountValue: result.discountValue, // percent: 0-100, fixed: cents
  })
}
