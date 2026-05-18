import { randomUUID } from "crypto"
import { NextResponse, type NextRequest } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"

type RouteContext = { params: Promise<{ eventId: string; entryId: string }> }

type GuestlistEntryRow = {
  id: string
  event_id: string
  ticket_type_id: string | null
  full_name: string
  email: string | null
  phone: string | null
  allocation: number
}

const MANAGER_ROLES = new Set(["admin", "organizer", "organizer_owner", "organizer_admin"])

async function getUserId() {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

async function loadManageContext(admin: ReturnType<typeof createAdminClient>, eventId: string, userId: string) {
  const { data: event, error } = await admin.from("events").select("id, org_id").eq("id", eventId).maybeSingle()
  if (error) throw error
  if (!event) return { allowed: false, event: null }

  const { data: globalAdmin } = await admin.from("admin_users").select("user_id").eq("user_id", userId).eq("active", true).maybeSingle()
  if (globalAdmin) return { allowed: true, event }

  const { data: member } = await admin.from("org_members").select("role").eq("org_id", event.org_id).eq("user_id", userId).maybeSingle()
  return { allowed: Boolean(member?.role && MANAGER_ROLES.has(String(member.role))), event }
}

async function requireManageContext(eventId: string) {
  const userId = await getUserId()
  if (!userId) return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) }

  const admin = createAdminClient()
  const { allowed, event } = await loadManageContext(admin, eventId, userId)
  if (!event) return { response: NextResponse.json({ error: "Event not found" }, { status: 404 }) }
  if (!allowed) return { response: NextResponse.json({ error: "Permission denied" }, { status: 403 }) }

  return { admin, event, userId }
}

function makeTicketCode() {
  return `TICK-GUEST-${randomUUID().replaceAll("-", "").slice(0, 18).toUpperCase()}`
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { eventId, entryId } = await context.params
  const manageContext = await requireManageContext(eventId)
  if (manageContext.response) return manageContext.response

  const { admin, event, userId } = manageContext
  const body = await request.json().catch(() => ({}))
  const requestedQuantity = Math.max(1, Math.floor(Number(body.quantity) || 1))
  const requestedTicketTypeId = typeof body.ticket_type_id === "string" && body.ticket_type_id.trim() ? body.ticket_type_id.trim() : null

  const { data: entry, error: entryError } = await admin
    .from("guestlist_entries")
    .select("id, event_id, ticket_type_id, full_name, email, phone, allocation")
    .eq("id", entryId)
    .eq("event_id", eventId)
    .maybeSingle()

  if (entryError) return NextResponse.json({ error: entryError.message }, { status: 400 })
  if (!entry) return NextResponse.json({ error: "Guestlist entry not found" }, { status: 404 })

  const guest = entry as GuestlistEntryRow
  const ticketTypeId = requestedTicketTypeId ?? guest.ticket_type_id
  if (!ticketTypeId) return NextResponse.json({ error: "Select a ticket type before fulfilling this guest" }, { status: 400 })

  const { data: ticketType, error: ticketTypeError } = await admin
    .from("ticket_types")
    .select("id, event_id, name, currency")
    .eq("id", ticketTypeId)
    .eq("event_id", eventId)
    .maybeSingle()

  if (ticketTypeError) return NextResponse.json({ error: ticketTypeError.message }, { status: 400 })
  if (!ticketType) return NextResponse.json({ error: "Ticket type does not belong to this event" }, { status: 400 })

  const { data: existingFulfilments, error: fulfilmentError } = await admin
    .from("guestlist_fulfillments")
    .select("id, order_id")
    .eq("guestlist_entry_id", entryId)

  if (fulfilmentError) return NextResponse.json({ error: fulfilmentError.message }, { status: 400 })

  const fulfilledCount = existingFulfilments?.length ?? 0
  const remaining = Math.max(0, guest.allocation - fulfilledCount)
  if (remaining <= 0) return NextResponse.json({ error: "Guestlist allocation has already been fully fulfilled" }, { status: 409 })
  if (requestedQuantity > remaining) {
    return NextResponse.json({ error: `Only ${remaining} guestlist allocation${remaining === 1 ? "" : "s"} remaining` }, { status: 409 })
  }

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      org_id: event.org_id,
      buyer_id: userId,
      total_cents: 0,
      subtotal_cents: 0,
      item_count: requestedQuantity,
      platform_fee_cents: 0,
      processor_fee_cents: 0,
      order_price_cents: 0,
      order_platform_fee_cents: 0,
      order_processor_fee_cents: 0,
      currency: ticketType.currency ?? "SZL",
      order_currency: ticketType.currency ?? "SZL",
      status: "paid",
      channel: "online",
      buyer_email: guest.email,
      buyer_phone: guest.phone,
      email: guest.email,
      phone: guest.phone,
      totals_computed_at: new Date().toISOString(),
    })
    .select("id, status, total_cents, currency")
    .single()

  if (orderError || !order) return NextResponse.json({ error: orderError?.message ?? "Unable to create complimentary order" }, { status: 400 })

  const orderItems = Array.from({ length: requestedQuantity }, () => ({
    order_id: order.id,
    ticket_type_id: ticketTypeId,
    ticket_code: makeTicketCode(),
    status: "issued",
    holder_name: guest.full_name,
    holder_email: guest.email,
    holder_phone: guest.phone,
    name: ticketType.name,
  }))

  const { data: insertedItems, error: itemsError } = await admin
    .from("order_items")
    .insert(orderItems)
    .select("id, ticket_code, status, ticket_type_id, holder_name, holder_email, holder_phone")

  if (itemsError || !insertedItems?.length) {
    await admin.from("orders").delete().eq("id", order.id)
    return NextResponse.json({ error: itemsError?.message ?? "Unable to issue complimentary tickets" }, { status: 400 })
  }

  const fulfilmentRows = Array.from({ length: insertedItems.length }, () => ({
    guestlist_entry_id: entryId,
    order_id: order.id,
  }))

  const { data: fulfilments, error: insertFulfilmentError } = await admin
    .from("guestlist_fulfillments")
    .insert(fulfilmentRows)
    .select("id, order_id, created_at")

  if (insertFulfilmentError || !fulfilments?.length) {
    await admin.from("order_items").delete().eq("order_id", order.id)
    await admin.from("orders").delete().eq("id", order.id)
    return NextResponse.json({ error: insertFulfilmentError?.message ?? "Unable to record guestlist fulfilment" }, { status: 400 })
  }

  await admin.from("audit_log").insert({
    org_id: event.org_id,
    actor_id: userId,
    table_name: "guestlist_fulfillments",
    record_id: entryId,
    action: "insert",
    changes: {
      event_id: eventId,
      guestlist_entry_id: entryId,
      order_id: order.id,
      ticket_type_id: ticketTypeId,
      quantity: insertedItems.length,
      holder_name: guest.full_name,
    },
  })

  return NextResponse.json(
    {
      order,
      fulfilments,
      tickets: insertedItems,
      fulfilled_count: fulfilledCount + insertedItems.length,
      remaining_count: guest.allocation - fulfilledCount - insertedItems.length,
    },
    { status: 201 },
  )
}
