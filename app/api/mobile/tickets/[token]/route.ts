import { NextResponse } from "next/server"
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
