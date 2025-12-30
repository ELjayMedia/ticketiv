import { NextResponse } from "next/server"
import { createDeltaPayPayment } from "@/lib/deltapay"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getDemoSessionFromCookie } from "@/lib/demo-auth"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { orderId, amount, currency, customerEmail, metadata } = body

    const demoSession = await getDemoSessionFromCookie()
    const supabase = createServerSupabaseClient()

    let userId: string | null = null

    if (demoSession) {
      userId = demoSession.id
    } else if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      userId = user.id
    } else {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

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
