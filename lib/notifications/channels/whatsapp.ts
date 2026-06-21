import "server-only"

import type { ChannelResult } from "./types"

// WhatsApp channel adapter. Provider is selected via WHATSAPP_PROVIDER:
//   "meta_cloud" — Meta WhatsApp Cloud API (graph.facebook.com)
//   "twilio"     — Twilio WhatsApp
//   "360dialog"  — 360dialog WhatsApp API
// Credentials in WHATSAPP_API_KEY (+ provider-specific extras below). When the
// channel is unconfigured the adapter reports `skipped` so ticket delivery
// never fails — email remains the durable receipt.
//
// We send a *secure ticket link* (not the QR image) so the live ticket page
// always reflects the current status (transferred / refunded / revoked /
// checked-in) at the gate.
//
// Transactional sends OUTSIDE the 24h customer-service window require an
// approved template. Set WHATSAPP_TEMPLATE (+ WHATSAPP_TEMPLATE_LANG, default
// en) to send a template whose single body parameter is the message text;
// otherwise a plain text message is sent (valid in-session / for testing).

export interface WhatsAppMessage {
  to: string // E.164 phone
  body: string
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_PROVIDER && process.env.WHATSAPP_API_KEY)
}

function digits(to: string): string {
  return to.replace(/[^0-9]/g, "")
}

export async function sendWhatsApp(message: WhatsAppMessage): Promise<ChannelResult> {
  const provider = process.env.WHATSAPP_PROVIDER ?? "whatsapp"
  const apiKey = process.env.WHATSAPP_API_KEY

  if (!provider || !apiKey) {
    return { status: "skipped", reason: "WhatsApp Business not configured", provider }
  }

  try {
    switch (provider) {
      case "meta_cloud":
        return await sendViaMetaCloud(message, apiKey)
      case "twilio":
        return await sendViaTwilio(message, apiKey)
      case "360dialog":
        return await sendVia360dialog(message, apiKey)
      default:
        return { status: "skipped", reason: `Unknown WHATSAPP_PROVIDER: ${provider}`, provider }
    }
  } catch (error: any) {
    return { status: "failed", error: error?.message ?? "whatsapp send failed", provider }
  }
}

// --- Meta WhatsApp Cloud API ---------------------------------------------
async function sendViaMetaCloud(message: WhatsAppMessage, accessToken: string): Promise<ChannelResult> {
  const provider = "meta_cloud"
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!phoneNumberId) {
    return { status: "skipped", reason: "WHATSAPP_PHONE_NUMBER_ID not set", provider }
  }
  const version = process.env.WHATSAPP_API_VERSION ?? "v21.0"
  const template = process.env.WHATSAPP_TEMPLATE

  const payload = template
    ? {
        messaging_product: "whatsapp",
        to: digits(message.to),
        type: "template",
        template: {
          name: template,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANG ?? "en" },
          components: [{ type: "body", parameters: [{ type: "text", text: message.body }] }],
        },
      }
    : {
        messaging_product: "whatsapp",
        to: digits(message.to),
        type: "text",
        text: { preview_url: true, body: message.body },
      }

  const res = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    return { status: "failed", error: `meta_cloud ${res.status}: ${body.slice(0, 200)}`, provider }
  }
  const data = (await res.json().catch(() => ({}))) as { messages?: Array<{ id?: string }> }
  return { status: "sent", ref: data.messages?.[0]?.id ?? null, provider }
}

// --- Twilio WhatsApp ------------------------------------------------------
async function sendViaTwilio(message: WhatsAppMessage, authToken: string): Promise<ChannelResult> {
  const provider = "twilio"
  const sid = process.env.TWILIO_ACCOUNT_SID
  const from = process.env.WHATSAPP_FROM // e.g. +14155238886
  if (!sid || !from) {
    return { status: "skipped", reason: "TWILIO_ACCOUNT_SID / WHATSAPP_FROM not set", provider }
  }
  const form = new URLSearchParams({
    From: `whatsapp:${from}`,
    To: `whatsapp:+${digits(message.to)}`,
    Body: message.body,
  })
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    return { status: "failed", error: `twilio ${res.status}: ${body.slice(0, 200)}`, provider }
  }
  const data = (await res.json().catch(() => ({}))) as { sid?: string }
  return { status: "sent", ref: data.sid ?? null, provider }
}

// --- 360dialog ------------------------------------------------------------
async function sendVia360dialog(message: WhatsAppMessage, apiKey: string): Promise<ChannelResult> {
  const provider = "360dialog"
  const base = process.env.WHATSAPP_360_BASE_URL ?? "https://waba-v2.360dialog.io"
  const res = await fetch(`${base}/messages`, {
    method: "POST",
    headers: { "D360-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: digits(message.to),
      type: "text",
      text: { preview_url: true, body: message.body },
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    return { status: "failed", error: `360dialog ${res.status}: ${body.slice(0, 200)}`, provider }
  }
  const data = (await res.json().catch(() => ({}))) as { messages?: Array<{ id?: string }> }
  return { status: "sent", ref: data.messages?.[0]?.id ?? null, provider }
}
