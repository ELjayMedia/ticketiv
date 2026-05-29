import "server-only"

import type { ChannelResult } from "./types"

// WhatsApp channel adapter (provider-ready stub). WhatsApp Business
// transactional messaging needs a verified business account, approved message
// templates, captured + opted-in phone numbers, and a chosen BSP/provider —
// none of which exist yet. This keeps the interface and the secure-link
// message shape ready so a live adapter can be dropped in without touching
// callers.
//
// Provider is selected via WHATSAPP_PROVIDER (e.g. "meta_cloud", "twilio",
// "360dialog") with credentials in WHATSAPP_API_KEY. Until both are present
// the adapter reports `skipped` so delivery never fails.
//
// Per the delivery design we send a *secure ticket link*, never the QR image
// itself, so the live ticket page reflects the correct status (transferred /
// refunded / revoked / checked-in) at the gate.

export interface WhatsAppMessage {
  to: string // E.164 phone
  body: string
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_PROVIDER && process.env.WHATSAPP_API_KEY)
}

export async function sendWhatsApp(message: WhatsAppMessage): Promise<ChannelResult> {
  const provider = process.env.WHATSAPP_PROVIDER ?? "whatsapp"

  if (!isWhatsAppConfigured()) {
    return { status: "skipped", reason: "WhatsApp Business not configured", provider }
  }

  // Live send is intentionally not implemented yet — requires an approved
  // template name + components for the configured provider. Report skipped so
  // delivery doesn't fail once credentials are present but wiring isn't.
  console.warn("[whatsapp] live sending not implemented; would message", message.to)
  return { status: "skipped", reason: "WhatsApp adapter not implemented", provider }
}
