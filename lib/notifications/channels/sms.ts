import "server-only"

import type { ChannelResult } from "./types"

// SMS channel adapter — the fallback for buyers without WhatsApp / on basic
// devices. Provider is selected via SMS_PROVIDER:
//   "twilio"        — Twilio
//   "africastalking"— Africa's Talking (SADC coverage)
//   "clickatell"    — Clickatell
// Credentials in SMS_API_KEY (+ provider-specific extras). When unconfigured
// the adapter reports `skipped` so delivery never fails.
//
// Messages carry a short secure ticket link (not a QR image) and stay compact
// for basic-device compatibility (the dispatcher renders an SMS-safe template).

export interface SmsMessage {
  to: string // E.164 phone
  body: string
}

export function isSmsConfigured(): boolean {
  return Boolean(process.env.SMS_PROVIDER && process.env.SMS_API_KEY)
}

function e164(to: string): string {
  const d = to.replace(/[^0-9]/g, "")
  return `+${d}`
}

export async function sendSms(message: SmsMessage): Promise<ChannelResult> {
  const provider = process.env.SMS_PROVIDER ?? "sms"
  const apiKey = process.env.SMS_API_KEY

  if (!provider || !apiKey) {
    return { status: "skipped", reason: "SMS provider not configured", provider }
  }

  try {
    switch (provider) {
      case "twilio":
        return await sendViaTwilio(message, apiKey)
      case "africastalking":
        return await sendViaAfricasTalking(message, apiKey)
      case "clickatell":
        return await sendViaClickatell(message, apiKey)
      default:
        return { status: "skipped", reason: `Unknown SMS_PROVIDER: ${provider}`, provider }
    }
  } catch (error: any) {
    return { status: "failed", error: error?.message ?? "sms send failed", provider }
  }
}

// --- Twilio ---------------------------------------------------------------
async function sendViaTwilio(message: SmsMessage, authToken: string): Promise<ChannelResult> {
  const provider = "twilio"
  const sid = process.env.TWILIO_ACCOUNT_SID
  const from = process.env.SMS_FROM // e.g. +12025550123 or an alphanumeric sender id
  if (!sid || !from) {
    return { status: "skipped", reason: "TWILIO_ACCOUNT_SID / SMS_FROM not set", provider }
  }
  const form = new URLSearchParams({ From: from, To: e164(message.to), Body: message.body })
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

// --- Africa's Talking -----------------------------------------------------
async function sendViaAfricasTalking(message: SmsMessage, apiKey: string): Promise<ChannelResult> {
  const provider = "africastalking"
  const username = process.env.AT_USERNAME
  if (!username) {
    return { status: "skipped", reason: "AT_USERNAME not set", provider }
  }
  const form = new URLSearchParams({ username, to: e164(message.to), message: message.body })
  if (process.env.SMS_FROM) form.set("from", process.env.SMS_FROM)
  const res = await fetch("https://api.africastalking.com/version1/messaging", {
    method: "POST",
    headers: { apiKey, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: form.toString(),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    return { status: "failed", error: `africastalking ${res.status}: ${body.slice(0, 200)}`, provider }
  }
  const data = (await res.json().catch(() => ({}))) as {
    SMSMessageData?: { Recipients?: Array<{ messageId?: string }> }
  }
  return { status: "sent", ref: data.SMSMessageData?.Recipients?.[0]?.messageId ?? null, provider }
}

// --- Clickatell -----------------------------------------------------------
async function sendViaClickatell(message: SmsMessage, apiKey: string): Promise<ChannelResult> {
  const provider = "clickatell"
  const res = await fetch("https://platform.clickatell.com/messages", {
    method: "POST",
    headers: { Authorization: apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ messages: [{ channel: "sms", to: e164(message.to), content: message.body }] }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    return { status: "failed", error: `clickatell ${res.status}: ${body.slice(0, 200)}`, provider }
  }
  const data = (await res.json().catch(() => ({}))) as { messages?: Array<{ apiMessageId?: string }> }
  return { status: "sent", ref: data.messages?.[0]?.apiMessageId ?? null, provider }
}
