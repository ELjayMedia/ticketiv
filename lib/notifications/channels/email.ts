import "server-only"

// Email channel adapter. Resend is the first live provider; the interface is
// deliberately tiny so other providers (SES, SendGrid) can be slotted in.
// When RESEND_API_KEY is absent the adapter reports `skipped` so callers can
// record the intent without failing the surrounding flow (e.g. local/dev).

export interface EmailMessage {
  to: string
  subject: string
  html: string
  text: string
}

export type ChannelResult =
  | { status: "sent"; ref: string | null }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string }

export async function sendEmail(message: EmailMessage): Promise<ChannelResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM ?? "Ticketiv <tickets@ticketiv.com>"

  if (!apiKey) {
    return { status: "skipped", reason: "RESEND_API_KEY not configured" }
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
      return { status: "failed", error: `Resend ${response.status}: ${body.slice(0, 200)}` }
    }

    const data = (await response.json().catch(() => ({}))) as { id?: string }
    return { status: "sent", ref: data.id ?? null }
  } catch (error: any) {
    return { status: "failed", error: error?.message ?? "email send failed" }
  }
}
