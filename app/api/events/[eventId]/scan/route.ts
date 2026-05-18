import { NextResponse, type NextRequest } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"

type RouteContext = { params: Promise<{ eventId: string }> }
const MANAGER_ROLES = new Set(["admin", "organizer", "organizer_owner", "organizer_admin"])
const SCANNER_ROLES = new Set(["scanner", "organizer_staff", "organizer_admin", "event_staff", "event_admin"])

async function getUserId() {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

async function canScan(admin: ReturnType<typeof createAdminClient>, eventId: string, userId: string) {
  const { data: event, error } = await admin.from("events").select("id, org_id").eq("id", eventId).maybeSingle()
  if (error) throw error
  if (!event) return { allowed: false, event: null }

  const { data: globalAdmin } = await admin.from("admin_users").select("user_id").eq("user_id", userId).eq("active", true).maybeSingle()
  if (globalAdmin) return { allowed: true, event }

  const { data: member } = await admin.from("org_members").select("role").eq("org_id", event.org_id).eq("user_id", userId).maybeSingle()
  if (member?.role && MANAGER_ROLES.has(String(member.role))) return { allowed: true, event }

  const { data: staff } = await admin
    .from("event_staff")
    .select("role")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle()

  return { allowed: Boolean(staff?.role && SCANNER_ROLES.has(String(staff.role))), event }
}

async function recordScan(admin: ReturnType<typeof createAdminClient>, input: { eventId: string; ticketCode: string; outcome: string; orderItemId?: string | null; gate?: string | null; notes?: string | null }) {
  await admin.from("scans").insert({
    event_id: input.eventId,
    order_item_id: input.orderItemId ?? null,
    ticket_code: input.ticketCode,
    outcome: input.outcome,
    gate: input.gate ?? null,
    notes: input.notes ?? null,
  })
}

function invalidTicketStateMessage(status: string) {
  if (status === "refunded") return { outcome: "refunded", message: "Ticket has been refunded" }
  if (status === "transferred") return { outcome: "transferred", message: "Ticket has been transferred" }
  if (status === "revoked") return { outcome: "revoked", message: "Ticket has been revoked" }
  if (status === "pending") return { outcome: "not_issued", message: "Ticket is not issued yet" }
  return { outcome: "invalid", message: `Ticket cannot be used for entry while status is ${status}` }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const ticketCode = typeof body.ticket_code === "string" ? body.ticket_code.trim() : ""
  const gate = typeof body.gate === "string" ? body.gate.trim() : null

  if (!ticketCode) return NextResponse.json({ error: "Ticket code is required" }, { status: 400 })

  const admin = createAdminClient()
  const { allowed, event } = await canScan(admin, eventId, userId)
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: "Permission denied" }, { status: 403 })

  const { data: item, error: itemError } = await admin
    .from("order_items")
    .select("id, ticket_code, status, checked_in_at, ticket_type_id")
    .eq("ticket_code", ticketCode)
    .maybeSingle()

  if (itemError) return NextResponse.json({ error: itemError.message }, { status: 400 })
  if (!item) {
    await recordScan(admin, { eventId, ticketCode, outcome: "unknown_ticket", gate, notes: "Ticket code not found" })
    return NextResponse.json({ outcome: "unknown_ticket", message: "Ticket code not found" }, { status: 404 })
  }

  const { data: ticketType, error: ticketError } = await admin.from("ticket_types").select("id, event_id, name").eq("id", item.ticket_type_id).maybeSingle()
  if (ticketError) return NextResponse.json({ error: ticketError.message }, { status: 400 })

  if (!ticketType || ticketType.event_id !== eventId) {
    await recordScan(admin, { eventId, ticketCode, outcome: "wrong_event", orderItemId: item.id, gate, notes: "Ticket belongs to another event" })
    return NextResponse.json({ outcome: "wrong_event", message: "Ticket belongs to another event" }, { status: 409 })
  }

  if (item.status === "checked_in" || item.checked_in_at) {
    await recordScan(admin, { eventId, ticketCode, outcome: "already_used", orderItemId: item.id, gate })
    return NextResponse.json({ outcome: "already_used", message: "Ticket has already been checked in" }, { status: 409 })
  }

  if (item.status !== "issued") {
    const invalidState = invalidTicketStateMessage(String(item.status))
    await recordScan(admin, {
      eventId,
      ticketCode,
      outcome: invalidState.outcome,
      orderItemId: item.id,
      gate,
      notes: `Ticket status is ${item.status}`,
    })
    return NextResponse.json(invalidState, { status: 409 })
  }

  const { data: checkedIn, error: updateError } = await admin
    .from("order_items")
    .update({ status: "checked_in", checked_in_at: new Date().toISOString() })
    .eq("id", item.id)
    .eq("status", "issued")
    .select("id, status, checked_in_at")
    .maybeSingle()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })
  if (!checkedIn) {
    await recordScan(admin, { eventId, ticketCode, outcome: "already_used", orderItemId: item.id, gate, notes: "Concurrent scan attempt" })
    return NextResponse.json({ outcome: "already_used", message: "Ticket has already been checked in" }, { status: 409 })
  }

  await recordScan(admin, { eventId, ticketCode, outcome: "valid", orderItemId: item.id, gate })

  return NextResponse.json({
    outcome: "valid",
    message: "Ticket checked in successfully",
    ticket: { id: item.id, code: ticketCode, type: ticketType.name, checked_in_at: checkedIn.checked_in_at },
  })
}
