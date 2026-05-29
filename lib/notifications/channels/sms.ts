import "server-only"

import type { ChannelResult } from "./types"

// SMS channel adapter (provider-ready stub). SMS is the fallback for buyers on
// basic devices or without WhatsApp. Provider is selected via SMS_PROVIDER
// (e.g. "twilio", "africastalking", "clickatell") with credentials in
// SMS_API_KEY. Until both are present the adapter reports `skipped` so
// delivery never fails.
//
// Messages carry a short secure ticket link (not a QR image) and must stay
// compact for basic-device compatibility — the dispatcher renders an
// SMS-safe template.

export interface SmsMessage {
  to: string // E.164 phone
  body: string
}

export function isSmsConfigured(): boolean {
  return Boolean(process.env.SMS_PROVIDER && process.env.SMS_API_KEY)
}

export async function sendSms(message: SmsMessage): Promise<ChannelResult> {
  const provider = process.env.SMS_PROVIDER ?? "sms"

  if (!isSmsConfigured()) {
    return { status: "skipped", reason: "SMS provider not configured", provider }
  }

  console.warn("[sms] live sending not implemented; would message", message.to)
  return { status: "skipped", reason: "SMS adapter not implemented", provider }
}
