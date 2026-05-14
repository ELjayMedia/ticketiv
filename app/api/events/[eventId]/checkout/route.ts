import { NextResponse, type NextRequest } from "next/server"
import { randomUUID } from "crypto"

import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"

type RouteContext = { params: Promise<{ eventId: string }> }
type CheckoutItem = { ticket_type_id?: string; quantity?: number; holder_name?: string; holder_email?: string; holder_phone?: string }

function makeTicketCode() {
  return `TIV-${randomUUID().replace(/-/g, "").slice(0, 18).toUpperCase()}`
}

async function getUserId() {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const buyerId = await getUserId()
  if (!buyerId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const admin = createAdminClient()
  const body = await request.json().catch(() => ({}))
  const items = Array.isArray(body.items) ? (body.items as CheckoutItem[]) : []
  const buyerEmail = typeof body.buyer_email === "string" ? body.buyer_email.trim() : null
  const buyerPhone = typeof body.buyer_phone === "string" ? body.buyer_phone.trim() : null

  if (items.length === 0) return NextResponse.json({ error: "Select at least one ticket" }, { status: 400 })
  if (items.length > 20) return NextResponse.json({ error: "Too many line items" }, { status: 400 })

  const { data: event, error: eventError } = await admin
    .from("events")
    .select("id, org_id, status, visibility")
    .eq("id", eventId)
    .maybeSingle()

  if (eventError) return NextResponse.json({ error: eventError.message }, { status: 400 })
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  if (event.status !== "published") return NextResponse.json({ error: "Event is not published" }, { status: 409 })
  if (event.visibility === "private") return NextResponse.json({ error: "Event is not available for public checkout" }, { status: 403 })

  const requestedIds = [...new Set(items.map((item) => item.ticket_type_id).filter(Boolean))] as string[]
  if (requestedIds.length === 0) return NextResponse.json({ error: "Select valid tickets" }, { status: 400 })

  const { data: ticketTypes, error: ticketsError } = await admin
    .from("ticket_types")
    .select("id, event_id, name, price_cents, currency, quota, per_user_limit, sales_status")
    .eq("event_id", eventId)
    .in("id", requestedIds)

  if (ticketsError) return NextResponse.json({ error: ticketsError.message }, { status: 400 })
  if ((ticketTypes ?? []).length !== requestedIds.length) return NextResponse.json({ error: "One or more ticket types are invalid" }, { status: 400 })

  const { data: channels, error: channelsError } = await admin
    .from("ticket_type_channels")
    .select("ticket_type_id, channel, quota, per_order_limit")
    .in("ticket_type_id", requestedIds)
    .eq("channel", "online")

  if (channelsError) return NextResponse.json({ error: channelsError.message }, { status: 400 })

  const ticketsById = new Map((ticketTypes ?? []).map((ticket) => [ticket.id, ticket]))
  const channelsByTicketId = new Map((channels ?? []).map((channel) => [channel.ticket_type_id, channel]))
  const normalizedItems: Array<CheckoutItem & { ticket_type_id: string; quantity: number }> = []

  for (const item of items) {
    const ticketTypeId = item.ticket_type_id
    const quantity = Number(item.quantity ?? 0)
    if (!ticketTypeId || !ticketsById.has(ticketTypeId)) return NextResponse.json({ error: "Invalid ticket selected" }, { status: 400 })
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) return NextResponse.json({ error: "Invalid ticket quantity" }, { status: 400 })

    const ticket = ticketsById.get(ticketTypeId)!
    const channel = channelsByTicketId.get(ticketTypeId)
    const buyerLimit = channel?.per_order_limit ?? ticket.per_user_limit ?? 10

    if (ticket.sales_status !== "on_sale") return NextResponse.json({ error: `${ticket.name} is not on sale` }, { status: 409 })
    if (buyerLimit != null && quantity > buyerLimit) return NextResponse.json({ error: `${ticket.name} limit is ${buyerLimit} per order` }, { status: 409 })

    const { count, error: countError } = await admin
      .from("order_items")
      .select("id, orders!inner(status)", { count: "exact", head: true })
      .eq("ticket_type_id", ticketTypeId)
      .in("orders.status", ["pending", "paid"])

    if (countError) return NextResponse.json({ error: countError.message }, { status: 400 })

    const reservedOrSold = count ?? 0
    if (reservedOrSold + quantity > ticket.quota) return NextResponse.json({ error: `${ticket.name} does not have enough tickets left` }, { status: 409 })
    if (channel?.quota != null && reservedOrSold + quantity > channel.quota) return NextResponse.json({ error: `${ticket.name} online allocation is sold out` }, { status: 409 })

    normalizedItems.push({ ...item, ticket_type_id: ticketTypeId, quantity })
  }

  const currencies = new Set(normalizedItems.map((item) => ticketsById.get(item.ticket_type_id)!.currency))
  if (currencies.size !== 1) return NextResponse.json({ error: "Mixed-currency orders are not supported" }, { status: 400 })

  const currency = [...currencies][0]
  const subtotalCents = normalizedItems.reduce((sum, item) => sum + ticketsById.get(item.ticket_type_id)!.price_cents * item.quantity, 0)
  const itemCount = normalizedItems.reduce((sum, item) => sum + item.quantity, 0)

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      org_id: event.org_id,
      buyer_id: buyerId,
      total_cents: subtotalCents,
      subtotal_cents: subtotalCents,
      item_count: itemCount,
      currency,
      status: "pending",
      channel: "online",
      email: buyerEmail,
      phone: buyerPhone,
      buyer_email: buyerEmail,
      buyer_phone: buyerPhone,
      order_price_cents: subtotalCents,
      order_currency: currency,
    })
    .select("id, status, total_cents, currency")
    .single()

  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 400 })

  const orderItems = normalizedItems.flatMap((item) =>
    Array.from({ length: item.quantity }, () => ({
      order_id: order.id,
      ticket_type_id: item.ticket_type_id,
      ticket_code: makeTicketCode(),
      status: "pending",
      holder_name: item.holder_name || null,
      holder_email: item.holder_email || buyerEmail,
      holder_phone: item.holder_phone || buyerPhone,
    }))
  )

  const { error: itemError } = await admin.from("order_items").insert(orderItems)
  if (itemError) return NextResponse.json({ error: itemError.message }, { status: 400 })

  await admin.from("payment_attempts").insert({
    order_id: order.id,
    provider: "manual",
    attempt_no: 1,
    status: "pending",
    payload: { source: "ticketiv_checkout" },
  })

  await admin.from("audit_log").insert({
    org_id: event.org_id,
    actor_id: buyerId,
    table_name: "orders",
    record_id: order.id,
    action: "insert",
    changes: { event_id: eventId, item_count: itemCount, status: "pending" },
  })

  return NextResponse.json({ order }, { status: 201 })
}
