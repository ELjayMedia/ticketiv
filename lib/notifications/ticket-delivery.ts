import "server-only"

import { APP_URL } from "@/lib/env"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendTransactionalNotification } from "@/lib/notifications/transactional"
import { issueOrderToken, issueTicketToken } from "@/lib/ticket-tokens"

// TICK-65 / TICK-72 / TICK-77 — transactional ticket delivery entry point.
//
// After an order's tickets are issued, build the `ticket_issued` payload and
// hand off to the provider-agnostic notification layer (email via Resend,
// WhatsApp and SMS all live adapters — see docs/NOTIFICATIONS.md). The actual
// QR is never sent — buyers get a
// secure order-level bundle link (/o/{token}) and per-attendee shares continue
// to use per-ticket links (/t/{token}). In-app My Tickets remains the source of
// truth.
//
// Best-effort: never throws into the caller (payment completion must not fail
// because a notification didn't go out).

const SHORT_DATE = new Intl.DateTimeFormat("en-SZ", { dateStyle: "medium", timeStyle: "short" })

// Public ticket links prefer an explicit base (lets links point at the live
// domain even from preview/runtime contexts) and fall back to APP_URL.
const TICKET_BASE_URL = process.env.NEXT_PUBLIC_TICKET_BASE_URL ?? APP_URL

function moneySzl(cents: number, currency: string) {
  return `${currency} ${(cents / 100).toLocaleString("en-SZ", { minimumFractionDigits: 2 })}`
}

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
      .select("id, ticket_type_id, status, ticket_types(name, event_id, events(title, starts_at, ends_at))")
      .eq("order_id", orderId)
      .in("status", ["issued", "checked_in", "transferred"])

    const issued = items ?? []
    if (issued.length === 0) return

    const first: any = issued[0]
    const ticketType = first.ticket_types
    const event = ticketType?.events
    const eventId: string | null = ticketType?.event_id ?? null
    const start = event?.starts_at ? new Date(event.starts_at) : null

    // Token TTL = event end + 7 days. Multi-day events: max(event_dates.ends_at).
    // Fallback chain: events.ends_at → max(event_dates.ends_at) → starts_at + 24h.
    let endsAt: Date | null = event?.ends_at ? new Date(event.ends_at) : null
    if (!endsAt && eventId) {
      const { data: lastDate } = await admin
        .from("event_dates")
        .select("ends_at")
        .eq("event_id", eventId)
        .not("ends_at", "is", null)
        .order("ends_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (lastDate?.ends_at) endsAt = new Date(lastDate.ends_at)
    }
    if (!endsAt && start) endsAt = new Date(start.getTime() + 24 * 60 * 60 * 1000)
    const tokenExpSeconds = endsAt
      ? Math.floor(endsAt.getTime() / 1000) + 7 * 24 * 60 * 60
      : Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60

    // TICK-77: buyer delivery should use the order-level bundle link. The /o
    // page then mints per-item /t links for forwarding individual tickets. If
    // the token secret is missing, fall back to the first RLS-gated ticket page
    // so local/dev delivery still has a usable link.
    const orderToken = issueOrderToken(order.id, tokenExpSeconds)
    const fallbackItemToken = issueTicketToken(first.id, tokenExpSeconds)
    const ticketUrl = orderToken
      ? `${TICKET_BASE_URL}/o/${orderToken}`
      : fallbackItemToken
        ? `${TICKET_BASE_URL}/t/${fallbackItemToken}`
        : `${TICKET_BASE_URL}/tickets/${first.id}`

    // Resolve recipient + opt-in. WhatsApp/SMS need a phone; email opt-in is
    // honoured (defaults to on when no preference row exists).
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

    await sendTransactionalNotification({
      userId: order.buyer_id,
      orderId: order.id,
      eventId,
      template: "ticket_issued",
      payload: {
        eventName: event?.title ?? "your event",
        eventDate: start ? SHORT_DATE.format(start) : "",
        ticketType: ticketType?.name ?? "General",
        ticketCount: issued.length,
        totalLabel: moneySzl(order.total_cents ?? 0, order.currency ?? "SZL"),
        ticketUrl,
        receiptUrl: `${TICKET_BASE_URL}/orders/${order.id}/confirmation`,
      },
      recipient: { email: recipientEmail, phone, emailOptIn },
    })
  } catch (error) {
    console.error("[ticket-delivery] failed for order", orderId, error)
  }
}
