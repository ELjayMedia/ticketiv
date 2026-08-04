"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { ADMIN_ROLE_TIERS } from "@/lib/super-admin/permissions"
import { getSupabasePublicConfig } from "@/lib/env"
import { completeTrustedPaystackWebhook } from "@/lib/payments/paystack-webhook"

export interface WebhookEndpointInput {
  id?: string
  url: string
  description: string | null
  events: string[]
  is_active: boolean
  secret?: string | null
  org_id?: string | null // null = platform-level
}

export async function upsertWebhookEndpoint(input: WebhookEndpointInput): Promise<{ id: string }> {
  const { user } = await requireAdminRole(ADMIN_ROLE_TIERS)
  if (!input.url.trim()) throw new Error("url required")
  if (!input.url.startsWith("https://") && !input.url.startsWith("http://")) {
    throw new Error("url must start with http:// or https://")
  }

  const admin = createAdminClient()
  const payload: Record<string, unknown> = {
    url: input.url.trim(),
    description: input.description?.trim() || null,
    events: input.events.map((e) => e.trim()).filter(Boolean),
    is_active: input.is_active,
    org_id: input.org_id ?? null,
    created_by: user.id,
  }
  if (typeof input.secret === "string" && input.secret.trim()) {
    payload.secret = input.secret.trim()
  }

  if (input.id) {
    const { error } = await admin.from("webhook_endpoints").update(payload as any).eq("id", input.id)
    if (error) throw new Error(error.message)
    revalidatePath("/super-admin/webhooks")
    return { id: input.id }
  } else {
    const { data, error } = await admin
      .from("webhook_endpoints")
      .insert(payload as any)
      .select("id")
      .single()
    if (error || !data) throw new Error(error?.message ?? "insert failed")
    revalidatePath("/super-admin/webhooks")
    return { id: data.id }
  }
}

export async function deleteWebhookEndpoint(id: string): Promise<void> {
  await requireAdminRole(ADMIN_ROLE_TIERS)
  const admin = createAdminClient()
  const { error } = await admin.from("webhook_endpoints").delete().eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/super-admin/webhooks")
}

export async function toggleWebhookEndpoint(id: string, isActive: boolean): Promise<void> {
  await requireAdminRole(ADMIN_ROLE_TIERS)
  const admin = createAdminClient()
  const { error } = await admin
    .from("webhook_endpoints")
    .update({ is_active: isActive })
    .eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/super-admin/webhooks")
}

export interface ReplayWebhookResult {
  ok: boolean
  message: string
}

/**
 * Reprocess a dead-lettered inbound webhook (operational control #2).
 *
 * Safety rests on three things:
 *  1. The payload is read from `webhooks.payload` — the body this system already
 *     HMAC-verified at receipt. Nothing about the event comes from the caller,
 *     who supplies only a row id, so an admin cannot inject or edit a payment
 *     event. (This is why there is no "replay arbitrary JSON" affordance.)
 *  2. It re-runs the exact same trusted completion path as the live route
 *     (`completeTrustedPaystackWebhook`), so replay cannot take a shortcut the
 *     normal delivery would not.
 *  3. Replay is safe by construction: completion is idempotent — `payments
 *     (provider, ext_payment_id)` is unique and `fn_complete_order_payment`
 *     returns `already_completed` rather than double-crediting.
 *
 * Only unprocessed rows are eligible: a processed row would be a no-op, so
 * refusing it keeps the button honest about what it did.
 */
export async function replayInboundWebhook(webhookId: string): Promise<ReplayWebhookResult> {
  const { user, roleTier } = await requireAdminRole(ADMIN_ROLE_TIERS)
  if (roleTier === "read_only_admin") {
    return { ok: false, message: "Read-only admins cannot reprocess webhooks" }
  }
  if (!webhookId?.trim()) return { ok: false, message: "webhook id required" }

  const admin = createAdminClient()
  const { data: webhook, error: loadError } = await admin
    .from("webhooks")
    .select("id, provider, payload, processed_at, provider_event_id")
    .eq("id", webhookId)
    .maybeSingle<{
      id: string
      provider: string
      payload: Record<string, unknown> | null
      processed_at: string | null
      provider_event_id: string | null
    }>()

  if (loadError) return { ok: false, message: loadError.message }
  if (!webhook) return { ok: false, message: "Webhook not found" }
  if (webhook.processed_at) return { ok: false, message: "Already processed — nothing to replay" }
  if (webhook.provider !== "paystack") {
    return { ok: false, message: `No replay handler for provider "${webhook.provider}"` }
  }
  if (!webhook.payload) return { ok: false, message: "Stored webhook has no payload to replay" }

  try {
    await completeTrustedPaystackWebhook(webhook.payload as Record<string, any>)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Replay failed"
    // Leave processed_at NULL so the row stays in the dead-letter list.
    await admin.from("audit_log").insert({
      actor_id: user.id,
      table_name: "webhooks",
      record_id: webhook.id,
      action: "other",
      changes: {
        business_action: "webhook_replay_failed",
        provider: webhook.provider,
        provider_event_id: webhook.provider_event_id,
        error: message,
      },
    })
    return { ok: false, message }
  }

  const { error: markError } = await admin
    .from("webhooks")
    .update({ processed_at: new Date().toISOString() })
    .eq("id", webhook.id)

  if (markError) {
    // The money path completed; only the audit stamp failed. Say so plainly
    // rather than reporting a failure that would invite a pointless retry.
    return { ok: false, message: `Replayed, but marking it processed failed: ${markError.message}` }
  }

  await admin.from("audit_log").insert({
    actor_id: user.id,
    table_name: "webhooks",
    record_id: webhook.id,
    action: "other",
    changes: {
      business_action: "webhook_replay",
      provider: webhook.provider,
      provider_event_id: webhook.provider_event_id,
    },
  })

  revalidatePath("/super-admin/webhooks")
  return { ok: true, message: "Reprocessed" }
}

/**
 * One-time setup: schedule pg_cron to invoke the webhook-dispatch edge
 * function every minute so retries flow through. Idempotent — re-running
 * replaces any existing schedule.
 */
export async function scheduleWebhookDispatcher(): Promise<{
  ok: boolean
  message: string
}> {
  await requireAdminRole(ADMIN_ROLE_TIERS)
  const config = getSupabasePublicConfig()
  if (!config) return { ok: false, message: "Supabase config missing" }
  const ref = config.url.match(/^https:\/\/([^.]+)\.supabase\.co/)?.[1]
  if (!ref) return { ok: false, message: "Couldn't parse project ref from SUPABASE_URL" }
  const functionUrl = `https://${ref}.functions.supabase.co/webhook-dispatch`

  const admin = createAdminClient()
  const { data, error } = await admin.rpc("fn_admin_schedule_webhook_dispatch", {
    p_function_url: functionUrl,
    p_anon_jwt: config.anonKey,
    p_schedule: "* * * * *",
  })
  if (error) return { ok: false, message: error.message }

  return {
    ok: true,
    message: `Scheduled · cron job ${(data as { job_id?: number } | null)?.job_id ?? "?"}`,
  }
}

/**
 * Manual trigger: invoke the dispatcher right now (for testing without
 * waiting for cron).
 */
export async function triggerWebhookDispatch(): Promise<{
  ok: boolean
  processed: number
  message: string
}> {
  await requireAdminRole(ADMIN_ROLE_TIERS)
  const config = getSupabasePublicConfig()
  if (!config) return { ok: false, processed: 0, message: "Supabase config missing" }
  const ref = config.url.match(/^https:\/\/([^.]+)\.supabase\.co/)?.[1]
  if (!ref) return { ok: false, processed: 0, message: "Couldn't parse project ref" }

  try {
    const res = await fetch(`https://${ref}.functions.supabase.co/webhook-dispatch`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.anonKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })
    const json = (await res.json().catch(() => ({}))) as { processed?: number; error?: string }
    if (!res.ok) {
      return { ok: false, processed: 0, message: json.error ?? `HTTP ${res.status}` }
    }
    return { ok: true, processed: json.processed ?? 0, message: `Dispatched ${json.processed ?? 0}` }
  } catch (err) {
    return {
      ok: false,
      processed: 0,
      message: err instanceof Error ? err.message : "Network error",
    }
  }
}
