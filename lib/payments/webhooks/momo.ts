import "server-only"

import { NextResponse } from "next/server"

import { completeVerifiedPayment, failPaymentAttempt } from "@/lib/payments"
import { checkMomoStatus } from "@/lib/payments/momo"
import { evaluateMomoOutcome } from "@/lib/payments/momo-status"
import { createAdminClient } from "@/lib/supabase/admin"
import type { PaymentWebhookAdapter } from "@/lib/payments/webhooks/types"

/**
 * MTN MoMo Collections callback (TICK-179). MTN POSTs to the X-Callback-Url
 * set from MOMO_CALLBACK_URL. The body is never trusted for the settlement
 * decision: the authoritative status is re-fetched from MoMo (checkMomoStatus)
 * before anything is credited. Completion runs through the same idempotent
 * completeVerifiedPayment path as polling, so a callback and a client poll
 * racing each other settle once. No receipt row: the payment attempt itself is
 * the record, and MoMo has no event id of its own.
 */
export const momoWebhookAdapter: PaymentWebhookAdapter = {
  provider: "momo",
  recordsReceipt: false,

  async intake(request) {
    const body = (await request.json().catch(() => ({}))) as Record<string, any>
    const url = new URL(request.url)
    // MTN includes the reference in the body and/or the callback URL.
    const referenceId = String(body?.referenceId ?? body?.externalId ?? url.searchParams.get("referenceId") ?? "")
    if (!referenceId) {
      return NextResponse.json({ error: "referenceId is required" }, { status: 400 })
    }
    return { eventId: referenceId, signature: null, payload: body ?? {} }
  },

  async process({ eventId: referenceId }) {
    try {
      const admin = createAdminClient()
      const { data: attempt } = await admin
        .from("payment_attempts")
        .select("order_id, status")
        .eq("ext_ref", referenceId)
        .eq("provider", "momo")
        .maybeSingle<{ order_id: string; status: string }>()

      if (!attempt) {
        // Unknown reference: acknowledge so MTN stops retrying; nothing to settle.
        return { done: true, response: NextResponse.json({ ok: true, ignored: true }) }
      }

      const { data: order } = await admin
        .from("orders")
        .select("id, status")
        .eq("id", attempt.order_id)
        .maybeSingle<{ id: string; status: string }>()

      if (!order) return { done: true, response: NextResponse.json({ ok: true, ignored: true }) }

      // Authoritative re-check: do not trust the callback's own status field.
      const momoStatus = await checkMomoStatus(referenceId)
      const outcome = evaluateMomoOutcome({
        momoStatus,
        attemptStatus: attempt.status,
        orderStatus: order.status,
      })

      if (outcome === "already_settled") {
        return { done: true, response: NextResponse.json({ ok: true, duplicate: true }) }
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
        return { done: true, response: NextResponse.json({ ok: true, status: "SUCCESSFUL" }) }
      }

      if (outcome === "failed") {
        await failPaymentAttempt(order.id, "momo", referenceId).catch((error) =>
          console.error("[MoMo] callback failPaymentAttempt error", error),
        )
        return { done: true, response: NextResponse.json({ ok: true, status: "FAILED" }) }
      }

      return { done: false, response: NextResponse.json({ ok: true, status: "PENDING" }) }
    } catch (error: any) {
      // MoMo has always answered 400 here, and polling settles the order anyway.
      console.error("[MoMo] callback error", error)
      return { done: false, response: NextResponse.json({ error: error?.message ?? "callback failed" }, { status: 400 }) }
    }
  },

  failureBody(error) {
    return { error: error instanceof Error ? error.message : "callback failed" }
  },
}
