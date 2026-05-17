import { NextResponse, type NextRequest } from "next/server"

import { createOrder } from "@/lib/orders"
import { createServerSupabaseClient } from "@/lib/supabase-server"

type RouteContext = { params: Promise<{ eventId: string }> }
type CheckoutItem = { ticket_type_id?: string; quantity?: number }

async function getUserId() {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const buyerId = await getUserId()
  if (!buyerId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const items = Array.isArray(body.items) ? (body.items as CheckoutItem[]) : []
  const buyerEmail = typeof body.buyer_email === "string" ? body.buyer_email.trim() : ""

  if (!buyerEmail) return NextResponse.json({ error: "Buyer email is required" }, { status: 400 })
  if (items.length === 0) return NextResponse.json({ error: "Select at least one ticket" }, { status: 400 })
  if (items.length > 20) return NextResponse.json({ error: "Too many line items" }, { status: 400 })

  const normalizedItems = items.map((item) => ({
    ticketTypeId: String(item.ticket_type_id ?? ""),
    quantity: Number(item.quantity ?? 0),
  }))

  if (normalizedItems.some((item) => !item.ticketTypeId || !Number.isInteger(item.quantity) || item.quantity < 1)) {
    return NextResponse.json({ error: "Select valid tickets" }, { status: 400 })
  }

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
    return NextResponse.json({ error: error?.message ?? "Unable to create order" }, { status: 400 })
  }
}
