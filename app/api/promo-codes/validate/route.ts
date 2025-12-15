import { NextResponse } from "next/server"
import { validatePromoCode } from "@/lib/promo-codes"

export async function POST(request: Request) {
  try {
    const { code, eventId, purchaseAmount } = await request.json()

    if (!code || !eventId || purchaseAmount === undefined) {
      return NextResponse.json({ valid: false, error: "Missing required fields" }, { status: 400 })
    }

    const result = await validatePromoCode(code, eventId, purchaseAmount)

    return NextResponse.json(result)
  } catch (error) {
    console.error("[v0] Promo code validation error:", error)
    return NextResponse.json({ valid: false, error: "Failed to validate promo code" }, { status: 500 })
  }
}
