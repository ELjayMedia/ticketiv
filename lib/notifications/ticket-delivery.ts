import "server-only"

import { APP_URL } from "@/lib/env"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail, type ChannelResult } from "@/lib/notifications/channels/email"
import { sendWhatsApp } from "@/lib/notifications/channels/whatsapp"

// TICK-65 — transactional ticket delivery.
//
// Provider-agnostic: after an order's tickets are issued, deliver a receipt +
// secure ticket link over the buyer's opted-in channels. Email is the first
// live channel (Resend); WhatsApp is wired as a stub. The actual QR is never
// sent — recipients get a secure link to the live ticket page (which reflects
// transfer/refund/revoke/check-in status). In-app My Tickets remains the
// source of truth.
//
// Each channel attempt is recorded as a `notifications` row (channel + status
// + sent_at/last_error), deduped per order+channel, so this is safe to call
// more than once (e.g. webhook redelivery).

type Channel = "email" | "whatsapp"

const SHORT_DATE = new Intl.DateTimeFormat("en-SZ", { dateStyle: "medium", timeStyle: "short" })

function moneySzl(cents: number, currency: string) {
  return `${currency} ${(cents / 100).toLocaleString("en-SZ", { minimumFractionDigits: 2 })}`
}

interface TicketDeliveryData {
  eventTitle: string
  whenLabel: string
  ticketTypeName: string
  ticketCount: number
  totalLabel: string
  ticketUrl: string
  receiptUrl: string
}

function renderEmail(d: TicketDeliveryData) {
  const subject = `Your ${d.eventTitle} ticket${d.ticketCount === 1 ? "" : "s"}`
  const text = [
    `You're going to ${d.eventTitle}.`,
    "",
    `${d.ticketCount} × ${d.ticketTypeName}`,
    d.whenLabel ? `When: ${d.whenLabel}` : "",
    `Total: ${d.totalLabel}`,
    "",
    `Open your ticket: ${d.ticketUrl}`,
    `Receipt: ${d.receiptUrl}`,
    "",
    "Present the QR code in your ticket at the gate.",
  ]
    .filter(Boolean)
    .join("\n")

  const html = `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;color:#0a0a0c">
    <h1 style="font-size:22px;margin:0 0 4px">You're going.</h1>
    <p style="color:#6b6b70;margin:0 0 20px;font-size:13px">${escapeHtml(d.eventTitle)}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;color:#6b6b70">Tickets</td><td style="padding:6px 0;text-align:right">${d.ticketCount} × ${escapeHtml(d.ticketTypeName)}</td></tr>
      ${d.whenLabel ? `<tr><td style="padding:6px 0;color:#6b6b70">When</td><td style="padding:6px 0;text-align:right">${escapeHtml(d.whenLabel)}</td></tr>` : ""}
      <tr><td style="padding:6px 0;color:#6b6b70">Total</td><td style="padding:6px 0;text-align:right">${escapeHtml(d.totalLabel)}</td></tr>
    </table>
    <a href="${d.ticketUrl}" style="display:inline-block;margin:20px 0 8px;background:#0a0a0c;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;font-size:14px">Open your ticket</a>
    <p style="color:#6b6b70;font-size:12px;margin:8px 0 0">Your QR code opens in the ticket page and stays valid up to entry. <a href="${d.receiptUrl}" style="color:#6b6b70">View receipt</a>.</p>
  </div>`

  return { subject, html, text }
}

function renderWhatsApp(d: TicketDeliveryData): string {
  return [
    `Your Ticketiv ticket for ${d.eventTitle} is ready.`,
    `Ticket: ${d.ticketTypeName}${d.ticketCount > 1 ? ` ×${d.ticketCount}` : ""}`,
    d.whenLabel ? `When: ${d.whenLabel}` : "",
    `Open ticket: ${d.ticketUrl}`,
    "Present the QR code at the gate.",
  ]
    .filter(Boolean)
    .join("\n")
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
}

type Admin = ReturnType<typeof createAdminClient>

async function recordAttempt(
  admin: Admin,
  userId: string | null,
  orderId: string,
  channel: Channel,
  result: ChannelResult,
) {
  const now = new Date().toISOString()
  await admin.from("notifications").insert({
    user_id: userId,
    type: "ticket_delivery",
    channel,
    status: result.status === "sent" ? "sent" : result.status === "skipped" ? "skipped" : "failed",
    payload: {
      order_id: orderId,
      ...(result.status === "sent" ? { ref: result.ref } : {}),
      ...(result.status === "skipped" ? { reason: result.reason } : {}),
    },
    last_error: result.status === "failed" ? result.error : null,
    sent_at: result.status === "sent" ? now : null,
    dedupe_key: `ticket_delivery:${orderId}:${channel}`,
  })
}

/**
 * Deliver issued tickets for a paid order over the buyer's opted-in channels.
 * Best-effort: never throws into the caller (payment completion must not fail
 * because an email bounced).
 */
export async function deliverTicketsForOrder(orderId: string): Promise<void> {
  try {
    const admin = createAdminClient()

    const { data: order } = await admin
      .from("orders")
      .select("id, buyer_id, buyer_email, email, total_cents, currency")
      .eq("id", orderId)
      .maybeSingle()

    if (!order) return

    const { data: items } = await admin
      .from("order_items")
      .select("id, ticket_type_id, status, ticket_types(name, event_id, events(title, starts_at))")
      .eq("order_id", orderId)
      .in("status", ["issued", "checked_in", "transferred"])

    const issued = items ?? []
    if (issued.length === 0) return

    const first: any = issued[0]
    const ticketType = first.ticket_types
    const event = ticketType?.events
    const start = event?.starts_at ? new Date(event.starts_at) : null

    const data: TicketDeliveryData = {
      eventTitle: event?.title ?? "your event",
      whenLabel: start ? SHORT_DATE.format(start) : "",
      ticketTypeName: ticketType?.name ?? "General",
      ticketCount: issued.length,
      totalLabel: moneySzl(order.total_cents ?? 0, order.currency ?? "SZL"),
      ticketUrl: `${APP_URL}/tickets/${first.id}`,
      receiptUrl: `${APP_URL}/orders/${order.id}/confirmation`,
    }

    // Resolve recipient + channel opt-ins.
    const recipientEmail = order.buyer_email ?? order.email ?? null
    let emailOptIn = true
    let phone: string | null = null
    if (order.buyer_id) {
      const { data: prefs } = await admin
        .from("user_notification_preferences")
        .select("email_opt_in")
        .eq("user_id", order.buyer_id)
        .maybeSingle()
      if (prefs && prefs.email_opt_in === false) emailOptIn = false

      const { data: profile } = await admin
        .from("profiles")
        .select("phone")
        .eq("user_id", order.buyer_id)
        .maybeSingle()
      phone = (profile?.phone as string | null) ?? null
    }

    // Email — the default reliable receipt channel.
    if (recipientEmail && emailOptIn) {
      const { subject, html, text } = renderEmail(data)
      const result = await sendEmail({ to: recipientEmail, subject, html, text })
      await recordAttempt(admin, order.buyer_id, orderId, "email", result)
    }

    // WhatsApp — secondary channel (stub today). Only attempted when a phone
    // is on file; the adapter reports skipped until the Business API is live.
    if (phone) {
      const result = await sendWhatsApp({ to: phone, body: renderWhatsApp(data) })
      await recordAttempt(admin, order.buyer_id, orderId, "whatsapp", result)
    }
  } catch (error) {
    console.error("[ticket-delivery] failed for order", orderId, error)
  }
}
