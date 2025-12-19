import { NextResponse } from "next/server"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { createOrder, getOrdersForUser } from "@/lib/orders"
import { getDemoSessionFromCookie } from "@/lib/demo-auth"

export async function GET() {
  const supabase = createServerSupabaseClient()

  if (!supabase) {
    const demoSession = await getDemoSessionFromCookie()
    if (demoSession) {
      return NextResponse.json({ orders: [] })
    }
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
      const demoSession = await getDemoSessionFromCookie()
      if (!demoSession) {
        return NextResponse.json({ error: "Unauthorized - Please log in" }, { status: 401 })
      }

      // Return mock success response for demo mode
      return NextResponse.json(
        {
          order: {
            id: `order_demo_${Date.now()}`,
            event_id: body.eventId,
            purchaser_id: demoSession.id,
            purchaser_email: body.email,
            purchaser_first_name: body.firstName,
            purchaser_last_name: body.lastName,
            status: "completed",
            total_amount: 0,
            currency: "ZAR",
            created_at: new Date().toISOString(),
          },
          items: [],
          pricing: {
            subtotal: 0,
            fees: 0,
            total: 0,
            currency: "ZAR",
            lineItems: [],
          },
        },
        { status: 201 },
      )
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
