import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
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
  // This endpoint is the only public path to the privileged preview RPC. If
  // both limiter backends fail, refuse guesses until enforcement is restored.
  const rl = await rateLimit("promo:validate", clientKey(req), 20, 60, { failClosed: true })
  if (!rl.allowed) return tooManyRequests(rl)

  const input = await req.json().catch(() => null)
  const code = typeof input?.code === "string" ? input.code.trim() : ""
  const eventId = typeof input?.eventId === "string" ? input.eventId : ""
  if (code.length < 3 || code.length > 128 || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)) {
    return NextResponse.json({ valid: false, error: "Invalid promo code or event" }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Promo codes live in price_rules (org-manager-only under RLS), so the
  // preview goes through the read-only SECURITY DEFINER RPC. Direct anon and
  // authenticated EXECUTE have been revoked so this rate-limited server path
  // is the only public promo validation entry point.
  const { data, error } = await supabase.rpc("fn_preview_promo_code", {
    p_event_id: eventId,
    p_code: code,
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
