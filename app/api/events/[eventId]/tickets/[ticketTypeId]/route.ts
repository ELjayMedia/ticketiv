import { NextResponse, type NextRequest } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import {
  isSupportedTicketCurrency,
  normalizeTicketCurrency,
} from "@/lib/payments/ticket-currency"

type RouteContext = { params: Promise<{ eventId: string; ticketTypeId: string }> }

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

function parsePatchPayload(body: any) {
  const patch: Record<string, any> = {}
  const channelPatch: Record<string, any> = {}

  if (typeof body.name === "string") patch.name = body.name.trim()
  if (body.price !== undefined) patch.price_cents = Math.round(Number(body.price) * 100)
  if (body.quota !== undefined) patch.quota = Number.parseInt(String(body.quota), 10)
  if (body.per_user_limit !== undefined) patch.per_user_limit = Number.parseInt(String(body.per_user_limit), 10)
  if (typeof body.currency === "string") patch.currency = normalizeTicketCurrency(body.currency)
  if (typeof body.sales_status === "string") patch.sales_status = body.sales_status
  if (body.is_reserved_seating !== undefined) patch.is_reserved_seating = Boolean(body.is_reserved_seating)
  if (body.online_quota !== undefined) channelPatch.quota = Number.parseInt(String(body.online_quota), 10)
  if (body.online_per_order_limit !== undefined) channelPatch.per_order_limit = Number.parseInt(String(body.online_per_order_limit), 10)

  return { patch, channelPatch }
}

function validatePatch(patch: Record<string, any>, channelPatch: Record<string, any>) {
  if (patch.name !== undefined && !patch.name) return "Ticket name is required"
  if (patch.price_cents !== undefined && (!Number.isFinite(patch.price_cents) || patch.price_cents < 0)) return "Ticket price must be zero or more"
  if (patch.quota !== undefined && (!Number.isFinite(patch.quota) || patch.quota < 0)) return "Ticket quantity must be zero or more"
  if (patch.per_user_limit !== undefined && (!Number.isFinite(patch.per_user_limit) || patch.per_user_limit < 0)) return "Per-user limit must be zero or more"
  if (patch.currency !== undefined && !isSupportedTicketCurrency(patch.currency)) return "Choose ZAR for Paystack or SZL for MTN MoMo"
  if (patch.sales_status !== undefined && !SALES_STATUSES.has(patch.sales_status)) return "Invalid ticket sales status"
  if (channelPatch.quota !== undefined && (!Number.isFinite(channelPatch.quota) || channelPatch.quota < 0)) return "Online channel quota must be zero or more"
  if (channelPatch.per_order_limit !== undefined && (!Number.isFinite(channelPatch.per_order_limit) || channelPatch.per_order_limit < 0)) return "Online per-order limit must be zero or more"
  if (patch.quota !== undefined && channelPatch.quota !== undefined && channelPatch.quota > patch.quota) return "Online channel quota cannot exceed total quantity"
  if (patch.per_user_limit !== undefined && channelPatch.per_order_limit !== undefined && patch.per_user_limit > 0 && channelPatch.per_order_limit > patch.per_user_limit) return "Online per-order limit cannot exceed the per-buyer limit"
  return null
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { eventId, ticketTypeId } = await context.params
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const admin = createAdminClient()
  const { allowed, event } = await loadManageContext(admin, eventId, userId)
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: "Permission denied" }, { status: 403 })

  const { data: existing, error: loadError } = await admin
    .from("ticket_types")
    .select("id, event_id, name, quota, per_user_limit, sales_status")
    .eq("id", ticketTypeId)
    .eq("event_id", eventId)
    .maybeSingle()

  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 400 })
  if (!existing) return NextResponse.json({ error: "Ticket type not found" }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const { patch, channelPatch } = parsePatchPayload(body)
  const validationError = validatePatch(patch, channelPatch)
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

  if (patch.sales_status === "paused" && existing.sales_status !== "paused") {
    patch.sales_paused_at = new Date().toISOString()
    patch.sales_pause_reason = "Paused from ticket builder"
  }
  if (patch.sales_status && patch.sales_status !== "paused") {
    patch.sales_paused_at = null
    patch.sales_pause_reason = null
  }

  const { data: ticket, error } = await admin
    .from("ticket_types")
    .update(patch as any)
    .eq("id", ticketTypeId)
    .eq("event_id", eventId)
    .select("id, name, price_cents, currency, quota, per_user_limit, sales_status, is_reserved_seating, created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (Object.keys(channelPatch).length > 0) {
    await admin.from("ticket_type_channels").upsert({ ticket_type_id: ticketTypeId, channel: "online", ...channelPatch })
  }

  await admin.from("audit_log").insert({
    org_id: event.org_id,
    actor_id: userId,
    table_name: "ticket_types",
    record_id: ticketTypeId,
    action: "update",
    changes: { event_id: eventId, patch, channel_patch: channelPatch },
  })

  return NextResponse.json({ ticket })
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { eventId, ticketTypeId } = await context.params
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const admin = createAdminClient()
  const { allowed, event } = await loadManageContext(admin, eventId, userId)
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: "Permission denied" }, { status: 403 })

  const { data: existing, error: loadError } = await admin
    .from("ticket_types")
    .select("id, event_id, name")
    .eq("id", ticketTypeId)
    .eq("event_id", eventId)
    .maybeSingle()

  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 400 })
  if (!existing) return NextResponse.json({ error: "Ticket type not found" }, { status: 404 })

  const { count } = await admin.from("order_items").select("id", { count: "exact", head: true }).eq("ticket_type_id", ticketTypeId)

  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: "This ticket type already has issued tickets. Hide or pause sales instead of deleting it." }, { status: 409 })
  }

  await admin.from("ticket_type_channels").delete().eq("ticket_type_id", ticketTypeId)
  const { error } = await admin.from("ticket_types").delete().eq("id", ticketTypeId).eq("event_id", eventId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await admin.from("audit_log").insert({
    org_id: event.org_id,
    actor_id: userId,
    table_name: "ticket_types",
    record_id: ticketTypeId,
    action: "delete",
    changes: { event_id: eventId, name: existing.name },
  })

  return NextResponse.json({ ok: true })
}
