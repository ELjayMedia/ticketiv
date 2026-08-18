import { NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"

import { verifyDeltaPayBySession } from "@/lib/payments/deltapay-verification"
import { createAdminClient } from "@/lib/supabase/admin"

const TERMINAL_STATUSES = new Set(["succeeded", "failed", "expired", "cancelled"])

export async function POST(request: Request) {
  let payload: Record<string, any>
  try {
    payload = await request.json() as Record<string, any>
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const checkoutSessionId = String(payload.checkout_session_id ?? "").trim()
  if (!checkoutSessionId) {
    return NextResponse.json({ error: "Missing checkout_session_id" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: existing, error: existingError } = await admin
    .from("webhooks")
    .select("id, processed_at")
    .eq("provider", "deltapay")
    .eq("provider_event_id", checkoutSessionId)
    .maybeSingle()

  if (existingError) {
    console.error("Failed to check DeltaPay callback receipt", existingError)
    return NextResponse.json({ error: "Unable to process callback" }, { status: 500 })
  }

  if (existing?.processed_at) {
    return NextResponse.json({ ok: true, duplicate: true })
  }

  let webhookId = existing?.id ?? null
  if (!webhookId) {
    const { data: inserted, error: insertError } = await admin
      .from("webhooks")
      .insert({
        provider: "deltapay",
        signature: null,
        payload,
        provider_event_id: checkoutSessionId,
      })
      .select("id")
      .single()

    if (insertError || !inserted) {
      if (insertError?.code === "23505") {
        const { data: raced, error: raceError } = await admin
          .from("webhooks")
          .select("id, processed_at")
          .eq("provider", "deltapay")
          .eq("provider_event_id", checkoutSessionId)
          .single()
        if (raceError || !raced) {
          return NextResponse.json({ error: "Unable to record callback" }, { status: 500 })
        }
        if (raced.processed_at) return NextResponse.json({ ok: true, duplicate: true })
        webhookId = raced.id
      } else {
        console.error("Failed to record DeltaPay callback", insertError)
        return NextResponse.json({ error: "Unable to record callback" }, { status: 500 })
      }
    } else {
      webhookId = inserted.id
    }
  }

  try {
    const result = await verifyDeltaPayBySession(checkoutSessionId)

    // DeltaPay may callback before the hosted session becomes terminal. Keep the
    // audit row unprocessed for pending/processing so a later provider callback
    // can re-use it and re-verify rather than being discarded as a duplicate.
    if (!TERMINAL_STATUSES.has(result.status)) {
      return NextResponse.json({ ok: true, pending: true, status: result.status }, { status: 202 })
    }

    const { error: processedError } = await admin
      .from("webhooks")
      .update({ processed_at: new Date().toISOString() })
      .eq("id", webhookId!)

    if (processedError) throw new Error("DeltaPay callback was handled but audit finalization failed")

    return NextResponse.json({ ok: true, status: result.status })
  } catch (error) {
    console.error("Failed to process DeltaPay callback", error)
    Sentry.captureException(error, {
      tags: { area: "deltapay-callback", provider: "deltapay" },
      extra: { checkoutSessionId, webhookId },
    })
    // DeltaPay callbacks are best-effort; return 500 for a processing failure so
    // any provider retry can re-use the same unprocessed audit row.
    return NextResponse.json({ error: "Unable to verify DeltaPay session" }, { status: 500 })
  }
}
