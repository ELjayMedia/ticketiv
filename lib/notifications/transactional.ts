import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/notifications/channels/email"
import { sendWhatsApp, isWhatsAppConfigured } from "@/lib/notifications/channels/whatsapp"
import { sendSms, isSmsConfigured } from "@/lib/notifications/channels/sms"
import type { ChannelResult, ChannelStatus } from "@/lib/notifications/channels/types"
import {
  renderEmail,
  renderWhatsApp,
  renderSms,
  type NotificationTemplate,
  type TicketIssuedPayload,
} from "@/lib/notifications/templates"
import type { Json } from "@/types/database"

// TICK-72 — provider-agnostic transactional notification layer (builds on the
// TICK-65 email delivery). A single entry point dispatches a template over the
// buyer's resolved channels, logging every attempt to `notifications`.
//
// Design invariants:
// - In-app My Tickets is the source of truth; this layer is additive.
// - Recipients get a *secure live ticket link*, never an embedded QR.
// - External failure NEVER blocks ticket issuance — this never throws.
// - Email is the only live external channel today; WhatsApp + SMS are
//   provider-ready stubs that report `skipped` until configured.

export type NotificationChannel = "whatsapp" | "sms" | "email" | "in_app"

export interface TransactionalRecipient {
  email?: string | null
  phone?: string | null
  emailOptIn?: boolean
}

export interface TransactionalInput {
  userId?: string | null
  orderId: string
  eventId?: string | null
  template: NotificationTemplate
  /** Explicit channel set. When omitted, channels are resolved from the recipient + provider config. */
  channels?: NotificationChannel[]
  payload: TicketIssuedPayload
  recipient: TransactionalRecipient
}

/**
 * Channel selection priority: WhatsApp → SMS → Email → in-app.
 * WhatsApp/SMS require a phone AND a configured provider. Email is always
 * included when an address exists and the buyer hasn't opted out — it's the
 * formal receipt and backup. If no external channel is available we fall back
 * to in-app only (the ticket is already in My Tickets regardless).
 */
export function resolveChannels(recipient: TransactionalRecipient): NotificationChannel[] {
  const channels: NotificationChannel[] = []
  const hasPhone = Boolean(recipient.phone)

  if (hasPhone && isWhatsAppConfigured()) channels.push("whatsapp")
  if (hasPhone && isSmsConfigured()) channels.push("sms")
  if (recipient.email && recipient.emailOptIn !== false) channels.push("email")

  if (channels.length === 0) channels.push("in_app")
  return channels
}

function toStatus(result: ChannelResult): ChannelStatus {
  return result.status
}

async function dispatch(
  channel: NotificationChannel,
  input: TransactionalInput,
): Promise<ChannelResult> {
  switch (channel) {
    case "email": {
      const { subject, html, text } = renderEmail(input.payload)
      return sendEmail({ to: input.recipient.email!, subject, html, text })
    }
    case "whatsapp":
      return sendWhatsApp({ to: input.recipient.phone!, body: renderWhatsApp(input.payload) })
    case "sms":
      return sendSms({ to: input.recipient.phone!, body: renderSms(input.payload) })
    case "in_app":
      // The in-app ticket already exists (My Tickets); record intent only.
      return { status: "skipped", reason: "in-app is source of truth", provider: "in_app" }
  }
}

type Admin = ReturnType<typeof createAdminClient>

async function logAttempt(
  admin: Admin,
  input: TransactionalInput,
  channel: NotificationChannel,
  result: ChannelResult,
) {
  const now = new Date().toISOString()
  // notifications has no dedicated provider/metadata columns — store the
  // support-relevant detail in the jsonb payload so "did the customer get
  // their ticket?" is answerable from one row.
  await admin.from("notifications").insert({
    user_id: input.userId ?? null,
    type: input.template,
    channel,
    status: toStatus(result),
    payload: {
      order_id: input.orderId,
      event_id: input.eventId ?? null,
      template: input.template,
      provider: result.provider,
      ...(result.status === "sent" ? { ref: result.ref, meta: result.meta ?? null } : {}),
      ...(result.status === "skipped" ? { reason: result.reason } : {}),
    } as Json,
    last_error: result.status === "failed" ? result.error : null,
    sent_at: result.status === "sent" ? now : null,
    dedupe_key: `${input.template}:${input.orderId}:${channel}`,
  })
}

/**
 * Send a transactional notification across the resolved channels.
 * Best-effort: logs every attempt and never throws into the caller.
 */
export async function sendTransactionalNotification(input: TransactionalInput): Promise<void> {
  try {
    const admin = createAdminClient()
    const channels = input.channels ?? resolveChannels(input.recipient)

    for (const channel of channels) {
      // Idempotency: if this order+channel+template was already delivered,
      // don't send again. Makes the layer safe to call from multiple
      // completion paths and across provider webhook redeliveries. A prior
      // skipped/failed attempt is NOT a block — we retry those.
      const { data: alreadySent } = await admin
        .from("notifications")
        .select("id")
        .eq("dedupe_key", `${input.template}:${input.orderId}:${channel}`)
        .eq("status", "sent")
        .limit(1)
        .maybeSingle()
      if (alreadySent) continue

      let result: ChannelResult
      try {
        result = await dispatch(channel, input)
      } catch (error: any) {
        result = { status: "failed", error: error?.message ?? "dispatch failed", provider: channel }
      }
      await logAttempt(admin, input, channel, result)
    }
  } catch (error) {
    console.error("[transactional] notification failed for order", input.orderId, error)
  }
}
