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

  const { data: ticketsRaw } = await admin
    .from("ticket_types")
    .select("id, name, quota, price_cents, currency, per_user_limit, sales_status, ticket_type_channels(channel, quota, per_order_limit)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true })
  const tickets = ticketsRaw ?? []

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
  const onSaleTickets = tickets.filter((ticket: any) => ticket.sales_status === "on_sale")

  // Lineup, policies and operations are no longer publish requirements — they
  // are completed post-publish on the event management page.
  const baseReadiness = [
    { key: "basics", label: "Basics complete", step: "basics", complete: Boolean(event.title && event.category), hint: event.title && event.category ? "Title and category are set." : "Add an event title and category." },
    { key: "venue", label: "Venue complete", step: "venue", complete: Boolean(event.venue_id), hint: event.venue_id ? "A venue is linked." : "Select or create a reusable venue." },
    { key: "schedule", label: "Schedule complete", step: "schedule", complete: Boolean(event.starts_at && event.ends_at), hint: event.starts_at && event.ends_at ? "Start and end times are set." : "Set event start and end date/time." },
    { key: "tickets", label: "Tickets complete", step: "tickets", complete: tickets.length > 0 && onSaleTickets.length > 0, hint: tickets.length > 0 ? "At least one ticket is configured." : "Add at least one ticket type." },
    { key: "finance", label: "Finance ready", step: "tickets", complete: tickets.length > 0, hint: tickets.length > 0 ? "Revenue can be tracked from configured tickets." : "Add ticket pricing before launch." },
  ]
  const publishEligible = baseReadiness.every((item) => item.complete)
  const readiness = [
    ...baseReadiness,
    { key: "publish", label: "Publish eligible", step: "publish", complete: publishEligible, hint: publishEligible ? "Ready to publish." : "Complete all required readiness items before publishing." },
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
      readiness_complete: readiness.filter((item) => item.complete).length,
      readiness_total: readiness.length,
      publish_eligible: publishEligible ? 1 : 0,
    },
    readiness,
    publishEligible,
  })
}
