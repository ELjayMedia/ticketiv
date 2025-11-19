import { NextResponse } from "next/server"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { createOrder, getOrdersForUser } from "@/lib/orders"

export async function GET() {
  const orders = await listOrders()
  return NextResponse.json({ orders })
}

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const result = await createOrder({
      eventId: String(body.eventId),
      purchaserId: session.user.id,
      purchaserEmail: session.user.email ?? String(body.email ?? ""),
      purchaserFirstName: body.firstName,
      purchaserLastName: body.lastName,
      items: Array.isArray(body.items)
        ? body.items.map((item: any) => ({
            ticketTypeId: String(item.ticketTypeId),
            quantity: Number(item.quantity) || 1,
          }))
        : [{ ticketTypeId: String(body.ticketTypeId), quantity: Number(body.quantity) || 1 }],
      metadata: body.metadata ?? null,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Unable to create order" }, { status: 400 })
  }
}
