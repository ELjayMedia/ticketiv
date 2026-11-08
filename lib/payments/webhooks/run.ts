import "server-only"

import { NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"

import { createAdminClient } from "@/lib/supabase/admin"
import { claimWebhookReceipt, markWebhookProcessed } from "@/lib/payments/webhooks/receipts"
import type { PaymentWebhookAdapter } from "@/lib/payments/webhooks/types"

/**
 * The one pipeline every payment provider notification goes through:
 *
 *   intake (authenticate + parse) → receipt (deduplicate) → process (settle)
 *   → mark the receipt processed once the event is final.
 *
 * A processing failure answers 500 and leaves the receipt unprocessed, so the
 * provider's retry reuses the same row and tries again.
 */
export async function runPaymentWebhook(adapter: PaymentWebhookAdapter, request: Request): Promise<Response> {
  const intake = await adapter.intake(request)
  if (intake instanceof Response) return intake

  const admin = adapter.recordsReceipt ? createAdminClient() : null
  let receiptId: string | null = null

  if (admin) {
    const claim = await claimWebhookReceipt(admin, {
      provider: adapter.provider,
      eventId: intake.eventId,
      signature: intake.signature,
      payload: intake.payload,
    })
    if (claim.kind === "duplicate") return NextResponse.json({ ok: true, duplicate: true })
    if (claim.kind === "error") {
      console.error(`[webhooks:${adapter.provider}] receipt ${claim.stage} failed`, claim.error)
      return NextResponse.json(
        { error: claim.stage === "check" ? "Unable to check webhook" : "Unable to record webhook" },
        { status: 500 },
      )
    }
    receiptId = claim.id
  }

  try {
    const outcome = await adapter.process(intake)
    if (outcome.done && admin && receiptId) {
      await markWebhookProcessed(
        admin,
        receiptId,
        `${adapter.provider} webhook was handled but audit finalization failed`,
      )
    }
    return outcome.response
  } catch (error) {
    console.error(`[webhooks:${adapter.provider}] processing failed`, error)
    Sentry.captureException(error, {
      tags: { area: `${adapter.provider}-webhook`, provider: adapter.provider },
      extra: { providerEventId: intake.eventId, webhookId: receiptId },
    })
    return NextResponse.json(adapter.failureBody(error), { status: 500 })
  }
}
