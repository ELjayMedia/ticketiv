import { NextResponse, type NextRequest } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"

type RouteContext = { params: Promise<{ eventId: string }> }

const MANAGER_ROLES = new Set(["admin", "organizer", "organizer_owner", "organizer_admin"])
const SALES_STATUSES = new Set(["on_sale", "paused", "sold_out", "hidden"])

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

function parseTicketPayload(body: any) {
  const name = typeof body.name === "string" ? body.name.trim() : ""
  const price = Number(body.price)
  const quota = Number.parseInt(String(body.quota ?? ""), 10)
  const perUserLimit = body.per_user_limit == null || body.per_user_limit === "" ? 10 : Number.parseInt(String(body.per_user_limit), 10)
  const currency = typeof body.currency === "string" && /^[A-Z]{3}$/.test(body.currency.toUpperCase()) ? body.currency.toUpperCase() : "SZL"
  const salesStatus = typeof body.sales_status === "string" ? body.sales_status : "on_sale"
  const isReservedSeating = Boolean(body.is_reserved_seating)
  const onlineQuota = body.online_quota == null || body.online_quota === "" ? quota : Number.parseInt(String(body.online_quota), 10)
  const onlinePerOrderLimit = body.online_per_order_limit == null || body.online_per_order_limit === "" ? perUserLimit : Number.parseInt(String(body.online_per_order_limit), 10)

  return { name, price, quota, perUserLimit, currency, salesStatus, isReservedSeating, onlineQuota, onlinePerOrderLimit }
}

function validateTicketPayload(input: ReturnType<typeof parseTicketPayload>) {
  if (!input.name) return "Ticket name is required"
  if (!Number.isFinite(input.price) || input.price < 0) return "Ticket price must be zero or more"
  if (!Number.isFinite(input.quota) || input.quota < 0) return "Ticket quantity must be zero or more"
  if (!Number.isFinite(input.perUserLimit) || input.perUserLimit < 0) return "Per-user limit must be zero or more"
  if (!SALES_STATUSES.has(input.salesStatus)) return "Invalid ticket sales status"
  if (!Number.isFinite(input.onlineQuota) || input.onlineQuota < 0) return "Online channel quota must be zero or more"
  if (input.onlineQuota > input.quota) return "Online channel quota cannot exceed total quantity"
  if (!Number.isFinite(input.onlinePerOrderLimit) || input.onlinePerOrderLimit < 0) return "Online per-order limit must be zero or more"
  if (input.onlinePerOrderLimit > input.perUserLimit && input.perUserLimit > 0) return "Online per-order limit cannot exceed the per-buyer limit"
  return null
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
    .select("id, name, price_cents, currency, quota, per_user_limit, sales_status, is_reserved_seating, created_at, ticket_type_channels(channel, quota, per_order_limit)")
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
  const input = parseTicketPayload(body)
  const validationError = validateTicketPayload(input)
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

  const { data: ticket, error } = await admin
    .from("ticket_types")
    .insert({
      event_id: eventId,
      name: input.name,
      price_cents: Math.round(input.price * 100),
      currency: input.currency,
      quota: input.quota,
      per_user_limit: input.perUserLimit,
      sales_status: input.salesStatus,
      is_reserved_seating: input.isReservedSeating,
      sales_paused_at: input.salesStatus === "paused" ? new Date().toISOString() : null,
      sales_pause_reason: input.salesStatus === "paused" ? "Paused from ticket builder" : null,
    })
    .select("id, name, price_cents, currency, quota, per_user_limit, sales_status, is_reserved_seating, created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await admin.from("ticket_type_channels").upsert({
    ticket_type_id: ticket.id,
    channel: "online",
    quota: input.onlineQuota,
    per_order_limit: input.onlinePerOrderLimit,
  })

  await admin.from("audit_log").insert({
    org_id: event.org_id,
    actor_id: userId,
    table_name: "ticket_types",
    record_id: ticket.id,
    action: "insert",
    changes: {
      event_id: eventId,
      name: input.name,
      quota: input.quota,
      price_cents: ticket.price_cents,
      currency: input.currency,
      per_user_limit: input.perUserLimit,
      sales_status: input.salesStatus,
      online_quota: input.onlineQuota,
      online_per_order_limit: input.onlinePerOrderLimit,
      is_reserved_seating: input.isReservedSeating,
    },
  })

  return NextResponse.json({ ticket }, { status: 201 })
}
