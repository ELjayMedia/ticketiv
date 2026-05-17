import { NextResponse } from "next/server"

import { normaliseMsisdn, requestMomoPayment } from "@/lib/payments/momo"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function POST(request: Request) {
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

    const body = await request.json()
    const orderId = String(body.orderId ?? "")
    const rawMsisdn = String(body.msisdn ?? "")

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 })
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, buyer_id, total_cents, currency, status")
      .eq("id", orderId)
      .maybeSingle()

    if (orderError) {
      console.error("[MoMo] Failed to load order", orderError)
      return NextResponse.json({ error: "Unable to load order" }, { status: 500 })
    }
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }
    if (order.buyer_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (order.status !== "pending") {
      return NextResponse.json({ error: `Order is not payable from status: ${order.status}` }, { status: 409 })
    }

    let msisdn: string
    try {
      msisdn = normaliseMsisdn(rawMsisdn)
    } catch {
      return NextResponse.json({ error: "Enter a valid Eswatini mobile number" }, { status: 400 })
    }

    // MoMo Collections amounts are whole SZL units (no cents).
    const amount = Math.round(order.total_cents / 100)

    const referenceId = await requestMomoPayment({
      amount,
      msisdn,
      externalId: order.id,
      payerMessage: "Ticketiv ticket purchase",
      payeeNote: `Order ${order.id}`,
    })

    const { count } = await supabase
      .from("payment_attempts")
      .select("id", { count: "exact", head: true })
      .eq("order_id", order.id)

    const { error: attemptError } = await supabase.from("payment_attempts").insert({
      order_id: order.id,
      provider: "momo",
      attempt_no: (count ?? 0) + 1,
      status: "pending",
      ext_ref: referenceId,
      payload: { msisdn, amount_cents: order.total_cents, currency: order.currency },
    })

    if (attemptError) {
      console.error("[MoMo] Failed to record payment attempt", attemptError)
      return NextResponse.json({ error: "Unable to record payment attempt" }, { status: 500 })
    }

    return NextResponse.json({ referenceId, status: "pending" })
  } catch (error: any) {
    console.error("[MoMo] create error", error)
    return NextResponse.json({ error: error?.message ?? "Unable to start MoMo payment" }, { status: 400 })
  }
}
