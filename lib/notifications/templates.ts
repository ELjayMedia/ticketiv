import "server-only"

// Per-channel rendering for transactional templates. Each channel gets a shape
// it can actually send: email → subject/html/text, WhatsApp/SMS → a single
// body string. All channels link to the *live secure ticket page*, never an
// embedded QR image, so status stays accurate at the gate.

export type NotificationTemplate = "ticket_issued"

export interface TicketIssuedPayload {
  eventName: string
  eventDate: string // pre-formatted label, may be ""
  ticketType: string
  ticketCount: number
  totalLabel: string
  ticketUrl: string
  receiptUrl: string
  claimUrl?: string
}

export interface EmailContent {
  subject: string
  html: string
  text: string
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
}

export function renderEmail(p: TicketIssuedPayload): EmailContent {
  const subject = `Your ${p.eventName} ticket${p.ticketCount === 1 ? "" : "s"}`
  const text = [
    `You're going to ${p.eventName}.`,
    "",
    `${p.ticketCount} × ${p.ticketType}`,
    p.eventDate ? `When: ${p.eventDate}` : "",
    `Total: ${p.totalLabel}`,
    "",
    `Open your ticket: ${p.ticketUrl}`,
    `Receipt: ${p.receiptUrl}`,
    p.claimUrl ? `Save your tickets for later: ${p.claimUrl}` : "",
    "",
    "Present the QR code in your ticket at the gate.",
  ]
    .filter(Boolean)
    .join("\n")

  const claimHtml = p.claimUrl
    ? `<p style="color:#6b6b70;font-size:12px;margin:12px 0 0">Want to recover these later or open them on another device? <a href="${p.claimUrl}" style="color:#0a0a0c;font-weight:600">Save your tickets to an email account</a>.</p>`
    : ""

  const html = `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;color:#0a0a0c">
    <h1 style="font-size:22px;margin:0 0 4px">You're going.</h1>
    <p style="color:#6b6b70;margin:0 0 20px;font-size:13px">${escapeHtml(p.eventName)}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;color:#6b6b70">Tickets</td><td style="padding:6px 0;text-align:right">${p.ticketCount} × ${escapeHtml(p.ticketType)}</td></tr>
      ${p.eventDate ? `<tr><td style="padding:6px 0;color:#6b6b70">When</td><td style="padding:6px 0;text-align:right">${escapeHtml(p.eventDate)}</td></tr>` : ""}
      <tr><td style="padding:6px 0;color:#6b6b70">Total</td><td style="padding:6px 0;text-align:right">${escapeHtml(p.totalLabel)}</td></tr>
    </table>
    <a href="${p.ticketUrl}" style="display:inline-block;margin:20px 0 8px;background:#0a0a0c;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;font-size:14px">Open your ticket</a>
    <p style="color:#6b6b70;font-size:12px;margin:8px 0 0">Your QR code opens in the ticket page and stays valid up to entry. <a href="${p.receiptUrl}" style="color:#6b6b70">View receipt</a>.</p>
    ${claimHtml}
  </div>`

  return { subject, html, text }
}

// WhatsApp-ready transactional message. Provider-neutral plain text — a live
// adapter maps this onto an approved template's body parameter.
export function renderWhatsApp(p: TicketIssuedPayload): string {
  return [
    `Your Ticketiv ticket for ${p.eventName} is ready.`,
    `Ticket: ${p.ticketType}${p.ticketCount > 1 ? ` ×${p.ticketCount}` : ""}`,
    p.eventDate ? `Date: ${p.eventDate}` : "",
    `Open ticket: ${p.ticketUrl}`,
    p.claimUrl ? `Save your tickets: ${p.claimUrl}` : "",
    "Please present the QR code at the gate.",
  ]
    .filter(Boolean)
    .join("\n")
}

// SMS fallback — short, single secure link, basic-device safe.
export function renderSms(p: TicketIssuedPayload): string {
  const save = p.claimUrl ? ` Save later: ${p.claimUrl}` : ""
  return `Your Ticketiv ticket for ${p.eventName} is ready: ${p.ticketUrl}${save} Show the QR code at the gate.`
}
