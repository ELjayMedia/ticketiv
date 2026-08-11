import { NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"

import { completeTrustedPaystackWebhook, verifyTrustedPaystackSignature } from "@/lib/payments/paystack-webhook"
import { paystackRefundWebhookEventId } from "@/lib/payments/paystack-refund-core"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get("x-paystack-signature")

  if (!(await verifyTrustedPaystackSignature(rawBody, signature))) {
    return NextResponse.json({ error: "Invalid Paystack signature" }, { status: 401 })
  }

  let payload: Record<string, any>
  try {
    payload = JSON.parse(rawBody) as Record<string, any>
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const data = payload.data ?? {}
  const providerEventId =
    paystackRefundWebhookEventId(payload) ??
    (data.id ? String(data.id) : data.reference ? String(data.reference) : null)
  if (!providerEventId) {
    return NextResponse.json({ error: "Paystack webhook missing event identifier" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: existingWebhook, error: existingError } = await admin
    .from("webhooks")
    .select("id, processed_at")
    .eq("provider", "paystack")
    .eq("provider_event_id", providerEventId)
    .maybeSingle()

  if (existingError) {
    console.error("Failed to check existing Paystack webhook", existingError)
    return NextResponse.json({ error: "Unable to check webhook" }, { status: 500 })
  }

  if (existingWebhook?.processed_at) {
    return NextResponse.json({ ok: true, duplicate: true })
  }

  let webhookId = existingWebhook?.id ?? null
  if (!webhookId) {
    const { data: inserted, error: insertError } = await admin
      .from("webhooks")
      .insert({
        provider: "paystack",
        signature,
        payload,
        provider_event_id: providerEventId,
      })
      .select("id")
      .single()

    if (insertError || !inserted) {
      // A concurrent delivery may have won the unique(provider,event) insert.
      // Reuse its unprocessed row rather than making every provider retry fail.
      if (insertError?.code === "23505") {
        const { data: raced, error: raceError } = await admin
          .from("webhooks")
          .select("id, processed_at")
          .eq("provider", "paystack")
          .eq("provider_event_id", providerEventId)
          .single()

        if (raceError || !raced) {
          console.error("Failed to recover concurrent Paystack webhook", raceError)
          return NextResponse.json({ error: "Unable to record webhook" }, { status: 500 })
        }
        if (raced.processed_at) return NextResponse.json({ ok: true, duplicate: true })
        webhookId = raced.id
      } else {
        console.error("Failed to record webhook", insertError)
        return NextResponse.json({ error: "Unable to record webhook" }, { status: 500 })
      }
    } else {
      webhookId = inserted.id
    }
  }

  try {
    const result = await completeTrustedPaystackWebhook(payload)

    const { error: processedError } = await admin
      .from("webhooks")
      .update({ processed_at: new Date().toISOString() })
      .eq("id", webhookId!)

    if (processedError) {
      console.error("Failed to mark Paystack webhook processed", processedError)
      throw new Error("Payment completed but webhook audit could not be finalized")
    }

    return NextResponse.json({ ok: true, result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to process webhook"
    console.error("Failed to process Paystack webhook", error)
    Sentry.captureException(error, {
      tags: { area: "paystack-webhook" },
      extra: { providerEventId, webhookId },
    })
    // Return 500 for transient processing failures so Paystack retries. The
    // existing unprocessed audit row is deliberately reused on the next attempt.
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
