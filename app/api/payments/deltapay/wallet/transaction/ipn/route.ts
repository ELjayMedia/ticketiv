import { NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"

import { payoutIdFromReference, verifyDeltaPayCallback } from "@/lib/payments/deltapay-wallet-core"
import { getDeltaPayWalletConfig } from "@/lib/payments/deltapay-wallet"
import { applyDeltaPayPayoutUpdate } from "@/lib/payouts/deltapay-payouts"

/**
 * DeltaPay Instant Payment Notification for the EljayMedia wallet.
 *
 * Registered base URL: https://ticketiv.app/api/payments/deltapay/wallet
 * (DeltaPay appends /transaction/ipn). Sent at least once, so duplicates are
 * expected and handled idempotently.
 *
 * Trust: only callbacks whose RSA-PSS signature verifies against the public
 * key DeltaPay returned at registration are acted on. A verified callback for
 * one of our payouts (metadata "ticketiv-payout:<id>") moves it to paid or
 * failed; anything else is acknowledged and ignored.
 */
export async function POST(request: Request) {
  const raw = await request.text()
  const { callbackPublicKey } = getDeltaPayWalletConfig()
  if (!callbackPublicKey) {
    // Not configured: refuse rather than trust an unsigned body.
    return NextResponse.json({ error: "DeltaPay callbacks are not configured" }, { status: 503 })
  }
  if (!verifyDeltaPayCallback(raw, callbackPublicKey)) {
    Sentry.captureMessage("DeltaPay wallet callback signature rejected", { level: "warning" })
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(raw) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const payoutId = payoutIdFromReference(body.metadata)
  if (!payoutId) return NextResponse.json({ status: "received" })

  try {
    const result = await applyDeltaPayPayoutUpdate({
      payoutId,
      status: typeof body.transaction_status === "string" ? body.transaction_status : null,
      transactionId: typeof body.transaction_id === "number" ? body.transaction_id : null,
      amount: typeof body.amount === "number" ? body.amount : null,
      source: "callback",
    })
    if (result === "amount_mismatch") {
      Sentry.captureMessage("DeltaPay payout callback amount mismatch", { level: "error", extra: { payoutId } })
    }
  } catch (error) {
    Sentry.captureException(error, { extra: { payoutId } })
    return NextResponse.json({ error: "Unable to process callback" }, { status: 500 })
  }

  return NextResponse.json({ status: "received" })
}
