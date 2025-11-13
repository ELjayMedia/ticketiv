import { NextResponse } from "next/server"

import { createOrder, listOrders } from "@/lib/orders"

export async function GET() {
  return NextResponse.json({ orders: listOrders() })
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
