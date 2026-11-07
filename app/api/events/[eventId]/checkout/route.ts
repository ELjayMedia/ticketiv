import { NextResponse, type NextRequest } from "next/server"

import { getAuthUser } from "@/lib/auth/session"
import { parseCheckoutItems } from "@/lib/checkout/parse-items"
import { createOrder } from "@/lib/orders"
import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit"

type RouteContext = { params: Promise<{ eventId: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  // createOrder runs on the service role, so the buyer id must come from a
  // verified token (getUser), never from the unverified session cookie.
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const buyerId = user.id

  // Every pending order holds inventory until it expires; cap how fast one
  // account can create them so nobody can hold an event's stock hostage.
  const rl = await rateLimit("orders:create", clientKey(request, buyerId), 10, 60)
  if (!rl.allowed) return tooManyRequests(rl)

  const body = await request.json().catch(() => ({}))
  const buyerEmail = typeof body.buyer_email === "string" ? body.buyer_email.trim() : ""
  if (!buyerEmail) return NextResponse.json({ error: "Buyer email is required" }, { status: 400 })

  const parsed = parseCheckoutItems(body.items, "ticket_type_id")
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const normalizedItems = parsed.items

  try {
    const result = await createOrder({
      eventId,
      purchaserId: buyerId,
      purchaserEmail: buyerEmail,
      items: normalizedItems,
    })

    return NextResponse.json({ order: result.order, items: result.items, pricing: result.pricing }, { status: 201 })
  } catch (error: any) {
    console.error("Failed to create checkout order", error)
    // createOrder already maps database errors to buyer-safe messages.
    return NextResponse.json({ error: error?.message ?? "Unable to create order" }, { status: 400 })
  }
}
