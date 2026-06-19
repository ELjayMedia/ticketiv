import { NextResponse } from "next/server"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { createOrder, getOrdersForUser } from "@/lib/orders"

export async function GET() {
  const supabase = createServerSupabaseClient()

  if (!supabase) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) {
    return NextResponse.json({ error: "Failed to get session" }, { status: 500 })
  }

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orders = await getOrdersForUser(session.user.id)

  return NextResponse.json({ orders })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const supabase = createServerSupabaseClient()

    if (!supabase) {
      return NextResponse.json({ error: "Unauthorized - Please log in" }, { status: 401 })
    }

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) {
      return NextResponse.json({ error: "Failed to get session" }, { status: 500 })
    }

    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Please log in" }, { status: 401 })
    }

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
        : [
            {
              ticketTypeId: String(body.ticketTypeId),
              quantity: Number(body.quantity) || 1,
            },
          ],
      metadata: body.metadata ?? null,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err: any) {
    console.error("Error creating order:", err)
    return NextResponse.json({ error: err?.message ?? "Unable to create order" }, { status: 400 })
  }
}
