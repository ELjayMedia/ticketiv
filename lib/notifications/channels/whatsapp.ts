import "server-only"

import type { ChannelResult } from "./email"

// WhatsApp channel adapter (stub). WhatsApp Business transactional messaging
// needs a verified business account, approved message templates, captured +
// opted-in phone numbers, and a fallback path — none of which exist yet. This
// keeps the interface and the secure-link message shape ready so the live
// adapter (Cloud API / BSP) can be dropped in without touching callers.
//
// Per the delivery design we send a *secure ticket link*, never the QR image
// itself, so the live ticket page reflects the correct status (transferred /
// refunded / revoked / checked-in) at the gate.

export interface WhatsAppMessage {
  to: string // E.164 phone
  body: string
}

export async function sendWhatsApp(message: WhatsAppMessage): Promise<ChannelResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID

  if (!token || !phoneId) {
    return { status: "skipped", reason: "WhatsApp Business not configured" }
  }

  // Live send is intentionally not implemented yet — requires an approved
  // template name + components. Report skipped so delivery doesn't fail.
  console.warn("[whatsapp] live sending not implemented; would message", message.to)
  return { status: "skipped", reason: "WhatsApp adapter not implemented" }
}
