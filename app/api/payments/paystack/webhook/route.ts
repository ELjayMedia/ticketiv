import { NextResponse } from "next/server"

import { completePaystackPaymentFromWebhook, verifyPaystackWebhookSignature } from "@/lib/payments"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get("x-paystack-signature")

  if (!(await verifyPaystackWebhookSignature(rawBody, signature))) {
    return NextResponse.json({ error: "Invalid Paystack signature" }, { status: 401 })
  }

  let payload: Record<string, any>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 })
  }

  const providerEventId = payload?.data?.id ? String(payload.data.id) : payload?.data?.reference ? String(payload.data.reference) : null

  const { data: existingWebhook, error: existingError } = await supabase
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

  const { data: webhook, error: webhookError } = await supabase
    .from("webhooks")
    .insert({
      provider: "paystack",
      signature,
      payload,
      provider_event_id: providerEventId,
    })
    .select("id")
    .single()

  if (webhookError || !webhook) {
    console.error("Failed to record Paystack webhook", webhookError)
    return NextResponse.json({ error: "Unable to record webhook" }, { status: 500 })
  }

  try {
    const result = await completePaystackPaymentFromWebhook(payload)

    const { error: processedError } = await supabase
      .from("webhooks")
      .update({ processed_at: new Date().toISOString() })
      .eq("id", webhook.id)

    if (processedError) {
      console.error("Failed to mark Paystack webhook processed", processedError)
    }

    return NextResponse.json({ ok: true, result })
  } catch (error: any) {
    console.error("Failed to process Paystack webhook", error)
    return NextResponse.json({ error: error?.message ?? "Unable to process webhook" }, { status: 400 })
  }
}
