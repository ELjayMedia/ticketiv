import { NextResponse } from "next/server"

import { getAuthUser } from "@/lib/auth/session"
import { createPaymentAttempt } from "@/lib/payments"
import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit"

export async function POST(request: Request) {
  try {
    // Order ownership is checked on the service role against this id, so it
    // must come from a verified token (getUser), not the raw session cookie.
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const rl = await rateLimit("payments:attempt", clientKey(request, user.id), 10, 60)
    if (!rl.allowed) return tooManyRequests(rl)

    const body = await request.json()
    // Provider is now optional — payment_routing_rules resolves it when the
    // client doesn't force a specific (known) one.
    const provider = body.provider ? String(body.provider).toLowerCase() : null

    const result = await createPaymentAttempt({
      orderId: String(body.orderId ?? ""),
      provider,
      userId: user.id,
      returnUrl: body.returnUrl ? String(body.returnUrl) : null,
      countryCode: body.countryCode ? String(body.countryCode) : null,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    console.error("Failed to create payment attempt", error)
    return NextResponse.json({ error: error?.message ?? "Unable to create payment attempt" }, { status: 400 })
  }
}
