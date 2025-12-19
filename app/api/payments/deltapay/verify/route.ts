import { NextResponse } from "next/server"
import { verifyDeltaPayPayment } from "@/lib/deltapay"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { paymentId } = body

    if (!paymentId) {
      return NextResponse.json({ error: "Payment ID is required" }, { status: 400 })
    }

    const payment = await verifyDeltaPayPayment(paymentId)

    return NextResponse.json({
      success: true,
      payment,
      verified: payment.status === "completed",
    })
  } catch (error: any) {
    console.error("[DeltaPay] Payment verification error:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to verify payment",
      },
      { status: 500 },
    )
  }
}
