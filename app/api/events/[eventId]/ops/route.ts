import { NextResponse, type NextRequest } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"

type RouteContext = { params: Promise<{ eventId: string }> }
const MANAGER_ROLES = new Set(["admin", "organizer", "organizer_owner", "organizer_admin"])

async function getUserId() {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

async function canManage(admin: ReturnType<typeof createAdminClient>, event: any, userId: string) {
  const { data: globalAdmin } = await admin.from("admin_users").select("user_id").eq("user_id", userId).eq("active", true).maybeSingle()
  if (globalAdmin) return true

  const { data: member } = await admin.from("org_members").select("role").eq("org_id", event.org_id).eq("user_id", userId).maybeSingle()
  return Boolean(member?.role && MANAGER_ROLES.has(String(member.role)))
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const admin = createAdminClient()
  const { data: event, error: eventError } = await admin
    .from("events")
    .select("id, org_id, title, status, visibility, category, venue_id, starts_at, ends_at, city, cover_image_url, refund_policy, confirmation_message, venues(id, name, city, address, capacity)")
    .eq("id", eventId)
    .maybeSingle()

  if (eventError) return NextResponse.json({ error: eventError.message }, { status: 400 })
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  if (!(await canManage(admin, event, userId))) return NextResponse.json({ error: "Permission denied" }, { status: 403 })

  const { data: tickets = [] } = await admin
    .from("ticket_types")
    .select("id, name, quota, price_cents, currency, per_user_limit, sales_status, ticket_type_channels(channel, quota, per_order_limit)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true })

  const ticketIds = tickets.map((ticket: any) => ticket.id)
  let orderItems: any[] = []
  let orders: any[] = []

  if (ticketIds.length > 0) {
    const { data: loadedItems = [] } = await admin.from("order_items").select("id, order_id, ticket_type_id, status").in("ticket_type_id", ticketIds)
    orderItems = loadedItems
    const orderIds = [...new Set(orderItems.map((item) => item.order_id).filter(Boolean))]
    if (orderIds.length > 0) {
      const { data: loadedOrders = [] } = await admin.from("orders").select("id, status, total_cents, currency, buyer_email, email, item_count, created_at").in("id", orderIds).order("created_at", { ascending: false })
      orders = loadedOrders
    }
  }

  const { count: staffCount } = await admin.from("event_staff").select("event_id", { count: "exact", head: true }).eq("event_id", eventId).eq("active", true)
  const { count: scansCount } = await admin.from("scans").select("id", { count: "exact", head: true }).eq("event_id", eventId)
  const { count: guestlistCount } = await admin.from("guestlist_entries").select("id", { count: "exact", head: true }).eq("event_id", eventId)

  const paidOrders = orders.filter((order) => order.status === "paid")
  const pendingOrders = orders.filter((order) => order.status === "pending")
  const grossRevenueCents = paidOrders.reduce((sum, order) => sum + Number(order.total_cents || 0), 0)
  const issuedTickets = orderItems.filter((item) => item.status === "issued" || item.status === "checked_in").length
  const checkedInTickets = orderItems.filter((item) => item.status === "checked_in").length

  const readiness = [
    { key: "basics", label: "Basics", complete: Boolean(event.title && event.category) },
    { key: "venue", label: "Venue", complete: Boolean(event.venue_id) },
    { key: "schedule", label: "Schedule", complete: Boolean(event.starts_at && event.ends_at) },
    { key: "tickets", label: "Tickets", complete: tickets.length > 0 },
    { key: "policies", label: "Policies", complete: Boolean(event.refund_policy || event.confirmation_message) },
    { key: "staff", label: "Staff/scanner", complete: Number(staffCount || 0) > 0 },
    { key: "finance", label: "Finance", complete: orders.length > 0 || tickets.length > 0 },
  ]

  return NextResponse.json({
    event,
    tickets,
    orders: orders.slice(0, 10),
    metrics: {
      total_orders: orders.length,
      paid_orders: paidOrders.length,
      pending_orders: pendingOrders.length,
      gross_revenue_cents: grossRevenueCents,
      issued_tickets: issuedTickets,
      checked_in_tickets: checkedInTickets,
      staff_count: staffCount || 0,
      scans_count: scansCount || 0,
      guestlist_count: guestlistCount || 0,
    },
    readiness,
  })
}
