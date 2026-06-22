import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function POST(req: NextRequest) {
  const { code, eventId } = await req.json()
  if (!code || !eventId) {
    return NextResponse.json({ valid: false, error: "Missing fields" }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()
  if (!supabase) return NextResponse.json({ valid: false, error: "Server error" }, { status: 500 })

  // Check for promo_codes table — if it doesn't exist, return a graceful "invalid code" response
  // Query: find an active promo code for this event or org-wide that matches the code
  const { data, error } = await supabase
    .from("promo_codes")
    .select("id, code, discount_type, discount_value, max_uses, used_count, expires_at, event_id, org_id")
    .ilike("code", code.trim())
    .eq("is_active", true)
    .or(`event_id.eq.${eventId},event_id.is.null`)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ valid: false, error: "Invalid or expired promo code" })
  }

  // Check expiry
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, error: "This promo code has expired" })
  }

  // Check max uses
  if (data.max_uses !== null && data.used_count >= data.max_uses) {
    return NextResponse.json({ valid: false, error: "This promo code has reached its usage limit" })
  }

  return NextResponse.json({
    valid: true,
    promoId: data.id,
    discountType: data.discount_type, // "percent" | "fixed"
    discountValue: data.discount_value, // percent: 0-100, fixed: cents
  })
}
