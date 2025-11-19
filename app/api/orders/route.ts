import { NextResponse } from "next/server"

import { createOrder } from "@/lib/orders"
import { fetchOrdersForCurrentUser } from "@/lib/api/orders/get-orders-handler"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function GET() {
  const supabase = createServerSupabaseClient()
  const result = await fetchOrdersForCurrentUser(supabase)
  return NextResponse.json(result.body, { status: result.status })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const order = await createOrder({
      eventId: body.eventId,
      quantity: Number(body.quantity) || 1,
      attendeeName: body.attendeeName,
      attendeeEmail: body.attendeeEmail,
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Unable to create order" }, { status: 400 })
  }
}
