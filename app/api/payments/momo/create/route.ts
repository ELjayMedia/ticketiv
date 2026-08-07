import { NextResponse } from "next/server"

import { normaliseMsisdn, requestMomoPayment } from "@/lib/payments/momo"
import { assertPaymentProviderAvailableForOrder } from "@/lib/payments/availability"
import { momoAcceptsAmountCents } from "@/lib/payments/availability-core"
import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"

const MAX_ATTEMPT_INSERT_TRIES = 3

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

    // Do not trust the fact that a buyer reached this route. Re-resolve the
    // order's event lock and current platform operational state so a crafted
    // request cannot invoke MoMo for a Paystack-only or disabled event.
    await assertPaymentProviderAvailableForOrder(order.id, "momo")

    let msisdn: string
    try {
      msisdn = normaliseMsisdn(rawMsisdn)
    } catch {
      return NextResponse.json({ error: "Enter a valid Eswatini mobile number" }, { status: 400 })
    }

    // requestMomoPayment always bills in SZL. assertPaymentProviderAvailableForOrder
    // filters on ticket_types.currency; this re-checks the order row itself, so a
    // divergence between the two can never bill a ZAR order as SZL.
    const orderCurrency = String(order.currency ?? "").trim().toUpperCase()
    if (orderCurrency !== "SZL") {
      return NextResponse.json(
        { error: "MTN MoMo can only collect SZL payments. Choose another payment method." },
        { status: 409 },
      )
    }

    // MoMo Collections has no minor unit. Rounding here would charge an amount
    // the order does not record — see momoAcceptsAmountCents.
    if (!momoAcceptsAmountCents(order.total_cents)) {
      console.error("[MoMo] Order total is not a whole SZL amount", {
        orderId: order.id,
        totalCents: order.total_cents,
      })
      return NextResponse.json(
        {
          error:
            "MTN MoMo can only collect whole Lilangeni amounts, and this order includes cents. Choose another payment method.",
        },
        { status: 409 },
      )
    }

    const amount = order.total_cents / 100

    // Record the attempt BEFORE asking for money. The reverse order loses the
    // charge if the insert fails or races the (order_id, provider, attempt_no)
    // unique constraint: MoMo would hold a real pending debit with no ext_ref
    // row for the callback or the status poll to match, and reconciliation
    // would never see it. Failing before the request costs nothing.
    const referenceId = crypto.randomUUID()
    let attemptRecorded = false
    let lastAttemptError: unknown = null

    for (let tries = 0; tries < MAX_ATTEMPT_INSERT_TRIES && !attemptRecorded; tries += 1) {
      const { count } = await supabase
        .from("payment_attempts")
        .select("id", { count: "exact", head: true })
        .eq("order_id", order.id)
        .eq("provider", "momo")

      const { error: attemptError } = await supabase.from("payment_attempts").insert({
        order_id: order.id,
        provider: "momo",
        attempt_no: (count ?? 0) + 1,
        status: "pending",
        ext_ref: referenceId,
        payload: { msisdn, amount_cents: order.total_cents, currency: orderCurrency },
      })

      if (!attemptError) {
        attemptRecorded = true
        break
      }

      lastAttemptError = attemptError
      // 23505 = unique violation: a concurrent attempt took this number. Recount.
      if (attemptError.code !== "23505") break
    }

    if (!attemptRecorded) {
      console.error("[MoMo] Failed to record payment attempt", lastAttemptError)
      return NextResponse.json({ error: "Unable to record payment attempt" }, { status: 500 })
    }

    try {
      await requestMomoPayment({
        referenceId,
        amount,
        msisdn,
        externalId: order.id,
        payerMessage: "Ticketiv ticket purchase",
        payeeNote: `Order ${order.id}`,
      })
    } catch (error) {
      // The debit was never accepted, so close the attempt rather than leaving a
      // pending row the status poll would chase forever. Buyers cannot update
      // payment_attempts under RLS, so this needs the service-role client.
      const admin = createAdminClient()
      const { error: closeError } = await admin
        .from("payment_attempts")
        .update({ status: "failed" })
        .eq("ext_ref", referenceId)
      if (closeError) console.error("[MoMo] Failed to close attempt after request error", closeError)
      throw error
    }

    return NextResponse.json({ referenceId, status: "pending" })
  } catch (error: any) {
    console.error("[MoMo] create error", error)
    return NextResponse.json({ error: error?.message ?? "Unable to start MoMo payment" }, { status: 400 })
  }
}
