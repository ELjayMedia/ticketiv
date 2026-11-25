import "server-only"

import { resolveIntegration } from "@/lib/integrations/runtime"

import type { ChannelResult } from "./types"

// Email channel adapter. Resend is the first live provider; the interface is
// deliberately tiny so other providers (SES, SendGrid) can be slotted in.
// When RESEND_API_KEY is absent the adapter reports `skipped` so callers can
// record the intent without failing the surrounding flow (e.g. local/dev).
//
// RESEND_FROM defaults to onboarding@resend.dev, which Resend allows before a
// domain is verified (delivers only to the account owner). Once ticketiv.app
// is verified (TICK-60) set RESEND_FROM to a branded address.
//
// Both can also be saved (and the channel switched off) in the admin
// console's Integrations page; saved values win over the environment.

const PROVIDER = "resend"

export interface EmailMessage {
  to: string
  subject: string
  html: string
  text: string
}

export async function sendEmail(message: EmailMessage): Promise<ChannelResult> {
  const resolved = await resolveIntegration("resend")
  if (resolved.source === "off") {
    return { status: "skipped", reason: "Email is switched off in Integrations", provider: PROVIDER }
  }
  const apiKey = resolved.env.RESEND_API_KEY?.trim()
  const from = resolved.env.RESEND_FROM?.trim() || "Ticketiv <onboarding@resend.dev>"

  if (!apiKey) {
    return { status: "skipped", reason: "RESEND_API_KEY not configured", provider: PROVIDER }
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => "")
      return { status: "failed", error: `Resend ${response.status}: ${body.slice(0, 200)}`, provider: PROVIDER }
    }

    const data = (await response.json().catch(() => ({}))) as { id?: string }
    return { status: "sent", ref: data.id ?? null, provider: PROVIDER }
  } catch (error: any) {
    return { status: "failed", error: error?.message ?? "email send failed", provider: PROVIDER }
  }
}
