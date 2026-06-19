import { NextResponse } from "next/server"
import { createDeltaPayPayment } from "@/lib/deltapay"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { orderId, amount, currency, customerEmail, metadata } = body

    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = user.id

    const paymentIntent = await createDeltaPayPayment({
      amount,
      currency,
      orderId,
      customerEmail,
      metadata: {
        ...metadata,
        userId,
      },
    })

    return NextResponse.json({
      success: true,
      paymentIntent,
    })
  } catch (error: any) {
    console.error("[DeltaPay] Payment creation error:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to create payment",
      },
      { status: 500 },
    )
  }
}
