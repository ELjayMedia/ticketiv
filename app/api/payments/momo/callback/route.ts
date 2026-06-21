import { NextResponse } from "next/server"

import { checkMomoStatus } from "@/lib/payments/momo"
import { evaluateMomoOutcome } from "@/lib/payments/momo-status"
import { completeVerifiedPayment, failPaymentAttempt } from "@/lib/payments"
import { createAdminClient } from "@/lib/supabase/admin"

// MTN MoMo Collections production callback (TICK-179). Configure MTN to POST
// here via X-Callback-Url; set MOMO_CALLBACK_URL to this route's public URL.
//
// This is a server-to-server call with no user session, so it uses the service
// role to resolve the attempt. It NEVER trusts the callback body for the
// settlement decision — it re-fetches the authoritative status from MoMo
// (checkMomoStatus) before crediting anything. Completion runs through the same
// idempotent completeVerifiedPayment path as polling, so a callback + a client
// poll racing each other resolve to a single settlement.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const url = new URL(request.url)
    // MTN includes the reference in the body and/or the callback URL path.
    const referenceId = String(
      body?.referenceId ?? body?.externalId ?? url.searchParams.get("referenceId") ?? "",
    )
    if (!referenceId) {
      return NextResponse.json({ error: "referenceId is required" }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: attempt } = await admin
      .from("payment_attempts")
      .select("order_id, status")
      .eq("ext_ref", referenceId)
      .eq("provider", "momo")
      .maybeSingle<{ order_id: string; status: string }>()

    if (!attempt) {
      // Unknown reference — ack so MTN stops retrying; nothing to settle.
      return NextResponse.json({ ok: true, ignored: true })
    }

    const { data: order } = await admin
      .from("orders")
      .select("id, status")
      .eq("id", attempt.order_id)
      .maybeSingle<{ id: string; status: string }>()

    if (!order) return NextResponse.json({ ok: true, ignored: true })

    // Authoritative re-check — do not trust the callback's own status field.
    const momoStatus = await checkMomoStatus(referenceId)
    const outcome = evaluateMomoOutcome({
      momoStatus,
      attemptStatus: attempt.status,
      orderStatus: order.status,
    })

    if (outcome === "already_settled") {
      return NextResponse.json({ ok: true, duplicate: true })
    }

    if (outcome === "settled") {
      try {
        await completeVerifiedPayment({
          orderId: order.id,
          provider: "momo",
          extPaymentId: referenceId,
          payload: { gateway: "momo", referenceId, via: "callback" },
        })
      } catch (error) {
        const { data: latest } = await admin
          .from("orders")
          .select("status")
          .eq("id", order.id)
          .maybeSingle<{ status: string }>()
        if (latest?.status !== "paid") throw error
      }
      return NextResponse.json({ ok: true, status: "SUCCESSFUL" })
    }

    if (outcome === "failed") {
      await failPaymentAttempt(order.id, "momo", referenceId).catch((error) =>
        console.error("[MoMo] callback failPaymentAttempt error", error),
      )
      return NextResponse.json({ ok: true, status: "FAILED" })
    }

    return NextResponse.json({ ok: true, status: "PENDING" })
  } catch (error: any) {
    console.error("[MoMo] callback error", error)
    return NextResponse.json({ error: error?.message ?? "callback failed" }, { status: 400 })
  }
}
