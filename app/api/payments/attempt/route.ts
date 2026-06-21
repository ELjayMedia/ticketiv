import { NextResponse } from "next/server"

import { createPaymentAttempt } from "@/lib/payments"
import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 })
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      return NextResponse.json({ error: "Failed to verify session" }, { status: 500 })
    }

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rl = await rateLimit("payments:attempt", clientKey(request, session.user.id), 10, 60)
    if (!rl.allowed) return tooManyRequests(rl)

    const body = await request.json()
    // Provider is now optional — payment_routing_rules resolves it when the
    // client doesn't force a specific (known) one.
    const provider = body.provider ? String(body.provider).toLowerCase() : null

    const result = await createPaymentAttempt({
      orderId: String(body.orderId ?? ""),
      provider,
      userId: session.user.id,
      returnUrl: body.returnUrl ? String(body.returnUrl) : null,
      countryCode: body.countryCode ? String(body.countryCode) : null,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    console.error("Failed to create payment attempt", error)
    return NextResponse.json({ error: error?.message ?? "Unable to create payment attempt" }, { status: 400 })
  }
}
