import { NextResponse } from "next/server"

import { getAuthUser } from "@/lib/auth/session"
import { parseCheckoutItems } from "@/lib/checkout/parse-items"
import { createOrder, getOrdersForUser } from "@/lib/orders"
import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit"

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const orders = await getOrdersForUser(user.id)

  return NextResponse.json({ orders })
}

export async function POST(request: Request) {
  // createOrder runs on the service role, so the buyer id must come from a
  // verified token (getUser), never from the unverified session cookie.
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Unauthorized - Please log in" }, { status: 401 })

  const rl = await rateLimit("orders:create", clientKey(request, user.id), 10, 60)
  if (!rl.allowed) return tooManyRequests(rl)

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const eventId = typeof body.eventId === "string" ? body.eventId.trim() : ""
  if (!eventId) return NextResponse.json({ error: "eventId is required" }, { status: 400 })

  const rawItems = Array.isArray(body.items)
    ? body.items
    : [{ ticketTypeId: body.ticketTypeId, quantity: body.quantity ?? 1 }]
  const parsed = parseCheckoutItems(rawItems, "ticketTypeId")
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const purchaserEmail = (user.email ?? (typeof body.email === "string" ? body.email : "")).trim()
  if (!purchaserEmail) return NextResponse.json({ error: "Buyer email is required" }, { status: 400 })

  try {
    const result = await createOrder({
      eventId,
      purchaserId: user.id,
      purchaserEmail,
      purchaserFirstName: typeof body.firstName === "string" ? body.firstName.slice(0, 100) : undefined,
      purchaserLastName: typeof body.lastName === "string" ? body.lastName.slice(0, 100) : undefined,
      items: parsed.items,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err: any) {
    console.error("Error creating order:", err)
    // createOrder already maps database errors to buyer-safe messages.
    return NextResponse.json({ error: err?.message ?? "Unable to create order" }, { status: 400 })
  }
}
