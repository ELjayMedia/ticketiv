import "server-only"

import { NextResponse } from "next/server"

import { verifyDeltaPayBySession } from "@/lib/payments/deltapay-verification"
import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit"
import { createAdminClient } from "@/lib/supabase/admin"
import type { PaymentWebhookAdapter } from "@/lib/payments/webhooks/types"

const TERMINAL_STATUSES = new Set(["succeeded", "failed", "expired", "cancelled"])

// The callback is unsigned, so nothing in it is trusted: the session is
// re-verified with DeltaPay before anything settles. These limits stop an
// anonymous caller from filling the webhooks table with junk on the way.
const MAX_BODY_BYTES = 16 * 1024
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/

/** DeltaPay Hosted Checkout: unsigned callback, re-verified by session with DeltaPay. */
export const deltapayWebhookAdapter: PaymentWebhookAdapter = {
  provider: "deltapay",
  recordsReceipt: true,

  async intake(request) {
    const rl = await rateLimit("payments:deltapay-callback", clientKey(request), 120, 60)
    if (!rl.allowed) return tooManyRequests(rl)

    const raw = await request.text()
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 })
    }

    let payload: Record<string, any>
    try {
      payload = JSON.parse(raw) as Record<string, any>
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }

    const checkoutSessionId = String(payload.checkout_session_id ?? "").trim()
    if (!checkoutSessionId) {
      return NextResponse.json({ error: "Missing checkout_session_id" }, { status: 400 })
    }
    if (!SESSION_ID_PATTERN.test(checkoutSessionId)) {
      return NextResponse.json({ error: "Invalid checkout_session_id" }, { status: 400 })
    }

    // Only sessions we created get a receipt row. Unknown ids are acknowledged
    // so a provider retry stops, but nothing is stored for them.
    const admin = createAdminClient()
    const { data: knownAttempt, error: attemptError } = await admin
      .from("payment_attempts")
      .select("id")
      .eq("provider", "deltapay")
      .eq("ext_ref", checkoutSessionId)
      .limit(1)
      .maybeSingle()
    if (attemptError) {
      console.error("Failed to look up DeltaPay payment attempt", attemptError)
      return NextResponse.json({ error: "Unable to process callback" }, { status: 500 })
    }
    if (!knownAttempt) {
      return NextResponse.json({ ok: true, ignored: true })
    }

    return { eventId: checkoutSessionId, signature: null, payload }
  },

  async process(delivery) {
    const result = await verifyDeltaPayBySession(delivery.eventId)

    // DeltaPay may call back before the hosted session becomes terminal. Keep
    // the audit row unprocessed for pending/processing so a later callback can
    // reuse it and re-verify rather than being discarded as a duplicate.
    if (!TERMINAL_STATUSES.has(result.status)) {
      return {
        done: false,
        response: NextResponse.json({ ok: true, pending: true, status: result.status }, { status: 202 }),
      }
    }
    return { done: true, response: NextResponse.json({ ok: true, status: result.status }) }
  },

  failureBody() {
    return { error: "Unable to verify DeltaPay session" }
  },
}
