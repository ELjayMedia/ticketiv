import { createServerSupabaseClient } from "@/lib/supabase-server"
import { loadUserPermissions } from "@/lib/permissions-loader"
import { PERMISSION_ACTIONS, hasPermission } from "@/lib/rbac"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

/**
 * POST /api/events/[eventId]/checkin
 * 
 * Check in an attendee (mark ticket as scanned)
 * Requires: EVENT_SCAN permission for the event
 * 
 * Body: { qr_token: string } → finds the order_item via ticket_code
 * Validates staff permissions, then updates checked_in_at timestamp
 * Returns updated order_item or error
 */

const CheckinRequestSchema = z.object({
  qr_token: z.string().min(1, "QR token required"),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params
    const body = await request.json()
    const { qr_token } = CheckinRequestSchema.parse(body)

    const supabase = createServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503 }
      )
    }

    // Get current user
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Load user permissions
    const userAuthz = await loadUserPermissions(session.user.id)
    if (!userAuthz) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      )
    }

    // Check EVENT_SCAN permission
    if (!hasPermission(userAuthz.permissions, PERMISSION_ACTIONS.EVENT_SCAN, { eventId })) {
      console.warn(
        `[v0] User ${session.user.id} attempted to scan event ${eventId} without permission`
      )
      return NextResponse.json(
        { error: "You don't have permission to check in attendees for this event" },
        { status: 403 }
      )
    }

    // Find the order_item by qr_token (ticket_code)
    const { data: orderItem, error: findError } = await supabase
      .from("order_items")
      .select("id, order_id, event_id, ticket_code, checked_in_at")
      .eq("ticket_code", qr_token)
      .maybeSingle()

    if (findError) {
      console.error("[v0] Error finding ticket:", findError)
      return NextResponse.json(
        { error: "Failed to find ticket" },
        { status: 500 }
      )
    }

    if (!orderItem) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      )
    }

    // Verify the ticket belongs to this event
    if (orderItem.event_id !== eventId) {
      return NextResponse.json(
        { error: "Ticket does not belong to this event" },
        { status: 400 }
      )
    }

    // Check if already checked in
    if (orderItem.checked_in_at) {
      return NextResponse.json(
        {
          error: "Already checked in",
          data: orderItem,
          already_checked_in: true,
        },
        { status: 400 }
      )
    }

    // Update checked_in_at timestamp
    const { data: updated, error: updateError } = await supabase
      .from("order_items")
      .update({
        checked_in_at: new Date().toISOString(),
      })
      .eq("id", orderItem.id)
      .select()
      .single()

    if (updateError) {
      console.error("[v0] Error checking in ticket:", updateError)
      return NextResponse.json(
        { error: "Failed to check in ticket" },
        { status: 500 }
      )
    }

    console.log(
      `[v0] Ticket checked in: ${orderItem.id} by user ${session.user.id}`
    )

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      )
    }

    console.error("[v0] Checkin API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
