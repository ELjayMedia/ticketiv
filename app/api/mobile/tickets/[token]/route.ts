import { NextResponse } from "next/server"
import { eventTimeZone, parseCompanionPayload, type CompanionPayload } from "@ticketiv/shared"
import { mapGuide } from "@/lib/data/companion"
import { loadTicketMemory, resolveTicketHolder } from "@/lib/mobile/ticket-memory"
import { MyTicketsViewSchema } from "@/lib/schemas/views"
import { createAdminClient } from "@/lib/supabase/admin"
import { ticketDisplayStatus } from "@/lib/ticket-status"
import { verifyTicketToken } from "@/lib/ticket-tokens"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadCompanion(admin: any, eventId: string, endsAt: string | null): Promise<CompanionPayload | null> {
  try {
    const [eventRes, guideRes, updatesRes] = await Promise.all([
      admin.from("events").select("tz, organizations(name), venues(tz)").eq("id", eventId).maybeSingle(),
      admin.from("event_guides").select("*").eq("event_id", eventId).maybeSingle(),
      admin
        .from("event_updates")
        .select("id, title, body, created_at")
        .eq("event_id", eventId)
        .is("hidden_at", null)
        .order("created_at", { ascending: false })
        .limit(5),
    ])
    const guide = mapGuide(guideRes.data)
    return parseCompanionPayload({
      timeZone: eventTimeZone(eventRes.data?.tz, eventRes.data?.venues?.tz),
      endsAt,
      orgName: eventRes.data?.organizations?.name ?? null,
      guide,
      updates: (updatesRes.data ?? []).map((u: { id: string; title: string; body: string | null; created_at: string }) => ({
        id: u.id,
        title: u.title,
        body: u.body,
        createdAt: u.created_at,
      })),
    })
  } catch (error) {
    // The ticket still works without its guide.
    console.error("[mobile-ticket-delivery] companion", error)
    return null
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const verification = verifyTicketToken(token)

  if (!verification.ok) {
    if (verification.reason === "missing_secret") {
      console.error("[mobile-ticket-delivery] TICKET_TOKEN_SECRET is not configured")
      return NextResponse.json(
        { error: "ticket_unavailable" },
        { status: 503, headers: RESPONSE_HEADERS }
      )
    }

    const expired = verification.reason === "expired"
    return NextResponse.json(
      { error: expired ? "link_expired" : "invalid_link" },
      { status: expired ? 410 : 404, headers: RESPONSE_HEADERS }
    )
  }

  try {
    // The signed capability is view-only and scoped to this one order item.
    const admin = createAdminClient()
    const { data: rawRow, error } = await admin
      .from("v_my_tickets")
      .select("*")
      .eq("order_item_id", verification.orderItemId)
      .maybeSingle()
    if (error) throw error

    const parsed = MyTicketsViewSchema.safeParse(rawRow)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "ticket_not_found" },
        { status: 404, headers: RESPONSE_HEADERS }
      )
    }

    const row = parsed.data
    const syncedAt = new Date().toISOString()
    const status = ticketDisplayStatus(row)
    // The event guide and organiser updates travel with a live ticket so the
    // app can show them offline. Updates are for ticket holders only, so a
    // transferred, refunded or revoked ticket gets none.
    const companion = status === "issued" || status === "checked_in" ? await loadCompanion(admin, row.event_id, row.event_ends_at ?? null) : null
    // After the event, the memory travels with the ticket too (highlights,
    // the holder's own rating, follow state, what's next).
    if (companion) {
      const end = Date.parse(row.event_ends_at ?? row.event_starts_at ?? "")
      if (Number.isFinite(end) && Date.now() > end + 3 * 60 * 60 * 1000) {
        try {
          const { admin: memoryAdmin, holder } = await resolveTicketHolder(token)
          companion.memory = await loadTicketMemory(memoryAdmin, holder)
        } catch (error) {
          console.error("[mobile-ticket-delivery] memory", error)
        }
      }
    }
    return NextResponse.json(
      {
        expiresAt: verification.expiresAt.toISOString(),
        syncedAt,
        ticket: {
          id: row.order_item_id,
          orderId: row.order_id,
          eventId: row.event_id,
          eventTitle: row.event_title,
          eventSlug: row.event_slug,
          ticketCode: status === "issued" ? row.ticket_code : "NOT_VALID_FOR_ENTRY",
          deliveryToken: token,
          ticketTypeName: row.ticket_type_name,
          holderName: null,
          eventStartsAt: row.event_starts_at,
          venueName: row.venue_name,
          venueAddress: row.venue_address,
          coverImageUrl: row.cover_image_url,
          status,
          checkedInAt: row.checked_in_at,
          revokedAt: row.revoked_at,
          refundedAt: row.refunded_at,
          priceCents: row.price_cents,
          currency: row.currency,
          updatedAt: syncedAt,
          companion,
        },
      },
      { headers: RESPONSE_HEADERS }
    )
  } catch (error) {
    console.error("[mobile-ticket-delivery] failed", error)
    return NextResponse.json(
      { error: "ticket_unavailable" },
      { status: 503, headers: RESPONSE_HEADERS }
    )
  }
}
