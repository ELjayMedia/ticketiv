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

async function loadManageContext(admin: ReturnType<typeof createAdminClient>, eventId: string, userId: string) {
  const { data: event, error } = await admin.from("events").select("id, org_id").eq("id", eventId).maybeSingle()
  if (error) throw error
  if (!event) return { allowed: false, event: null }

  const { data: globalAdmin } = await admin.from("admin_users").select("user_id").eq("user_id", userId).eq("active", true).maybeSingle()
  if (globalAdmin) return { allowed: true, event }

  const { data: member } = await admin.from("org_members").select("role").eq("org_id", event.org_id).eq("user_id", userId).maybeSingle()
  return { allowed: Boolean(member?.role && MANAGER_ROLES.has(String(member.role))), event }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const admin = createAdminClient()
  const { allowed, event } = await loadManageContext(admin, eventId, userId)
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: "Permission denied" }, { status: 403 })

  const { data, error } = await admin
    .from("ticket_types")
    .select("id, name, price_cents, currency, quota, per_user_limit, sales_status, is_reserved_seating, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ tickets: data ?? [] })
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const admin = createAdminClient()
  const { allowed, event } = await loadManageContext(admin, eventId, userId)
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: "Permission denied" }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const name = typeof body.name === "string" ? body.name.trim() : ""
  const price = Number(body.price)
  const quota = Number.parseInt(String(body.quota ?? ""), 10)
  const perUserLimit = body.per_user_limit == null || body.per_user_limit === "" ? 10 : Number.parseInt(String(body.per_user_limit), 10)
  const currency = typeof body.currency === "string" && /^[A-Z]{3}$/.test(body.currency) ? body.currency : "SZL"
  const salesStatus = typeof body.sales_status === "string" ? body.sales_status : "on_sale"

  if (!name) return NextResponse.json({ error: "Ticket name is required" }, { status: 400 })
  if (!Number.isFinite(price) || price < 0) return NextResponse.json({ error: "Ticket price must be zero or more" }, { status: 400 })
  if (!Number.isFinite(quota) || quota < 0) return NextResponse.json({ error: "Ticket quantity must be zero or more" }, { status: 400 })
  if (!Number.isFinite(perUserLimit) || perUserLimit < 0) return NextResponse.json({ error: "Per-user limit must be zero or more" }, { status: 400 })
  if (!["on_sale", "paused", "sold_out", "hidden"].includes(salesStatus)) return NextResponse.json({ error: "Invalid ticket sales status" }, { status: 400 })

  const { data: ticket, error } = await admin
    .from("ticket_types")
    .insert({
      event_id: eventId,
      name,
      price_cents: Math.round(price * 100),
      currency,
      quota,
      per_user_limit: perUserLimit,
      sales_status: salesStatus,
    })
    .select("id, name, price_cents, currency, quota, per_user_limit, sales_status, is_reserved_seating, created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await admin.from("ticket_type_channels").upsert({ ticket_type_id: ticket.id, channel: "online", quota, per_order_limit: perUserLimit })

  await admin.from("audit_log").insert({
    org_id: event.org_id,
    actor_id: userId,
    table_name: "ticket_types",
    record_id: ticket.id,
    action: "insert",
    changes: { event_id: eventId, name, quota, price_cents: ticket.price_cents },
  })

  return NextResponse.json({ ticket }, { status: 201 })
}
