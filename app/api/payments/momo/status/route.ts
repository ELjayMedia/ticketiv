import { NextResponse } from "next/server"

import { checkMomoStatus } from "@/lib/payments/momo"
import { completeVerifiedPayment, failPaymentAttempt } from "@/lib/payments"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 })
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      return NextResponse.json({ error: "Failed to verify session" }, { status: 500 })
    }
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const referenceId = new URL(request.url).searchParams.get("referenceId")
    if (!referenceId) {
      return NextResponse.json({ error: "referenceId is required" }, { status: 400 })
    }

    const { data: attempt } = await supabase
      .from("payment_attempts")
      .select("order_id, status")
      .eq("ext_ref", referenceId)
      .eq("provider", "momo")
      .maybeSingle()

    if (!attempt) {
      return NextResponse.json({ error: "Payment attempt not found" }, { status: 404 })
    }

    const { data: order } = await supabase
      .from("orders")
      .select("id, buyer_id, status")
      .eq("id", attempt.order_id)
      .maybeSingle()

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }
    if (order.buyer_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Already settled — short-circuit before hitting MoMo again.
    if (attempt.status === "succeeded" || order.status === "paid") {
      return NextResponse.json({ status: "SUCCESSFUL" })
    }
    if (attempt.status === "failed") {
      return NextResponse.json({ status: "FAILED" })
    }

    const status = await checkMomoStatus(referenceId)

    if (status === "SUCCESSFUL") {
      try {
        await completeVerifiedPayment({
          orderId: order.id,
          provider: "momo",
          extPaymentId: referenceId,
          payload: { gateway: "momo", referenceId },
        })
      } catch (error) {
        // A concurrent poll may have already completed the order.
        const { data: latest } = await supabase
          .from("orders")
          .select("status")
          .eq("id", order.id)
          .maybeSingle()
        if (latest?.status !== "paid") throw error
      }
      return NextResponse.json({ status: "SUCCESSFUL" })
    }

    if (status === "FAILED") {
      await failPaymentAttempt(order.id, "momo", referenceId).catch((error) =>
        console.error("[MoMo] failPaymentAttempt error", error),
      )
      return NextResponse.json({ status: "FAILED" })
    }

    return NextResponse.json({ status: "PENDING" })
  } catch (error: any) {
    console.error("[MoMo] status error", error)
    return NextResponse.json({ error: error?.message ?? "Unable to check MoMo status" }, { status: 400 })
  }
}
