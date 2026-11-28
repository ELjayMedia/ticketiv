import { NextResponse, type NextRequest } from "next/server"

import { isEventManager } from "@/lib/events/manage-access"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/auth/session"
import {
  isSupportedTicketCurrency,
  normalizeTicketCurrency,
} from "@/lib/payments/ticket-currency"
import {
  isPerOrderLimitWithinBuyerLimit,
  isValidOptionalPurchaseLimit,
  parseOptionalPurchaseLimit,
} from "@/lib/tickets/purchase-limits"
import { parsePaymentProviderList } from "@/lib/payments/availability-core"
import { ticketPaymentMethodsError } from "@/lib/payments/ticket-payment-methods"

type RouteContext = { params: Promise<{ eventId: string }> }

const SALES_STATUSES = new Set(["on_sale", "paused", "sold_out", "hidden"])

async function getUserId() {
  return (await getAuthUser())?.id ?? null
}

async function loadManageContext(admin: ReturnType<typeof createAdminClient>, eventId: string, userId: string, readOnly = false) {
  const { data: event, error } = await admin.from("events").select("id, org_id").eq("id", eventId).maybeSingle()
  if (error) throw error
  if (!event) return { allowed: false, event: null }

  const { data: globalAdmin } = await admin.from("admin_users").select("role_tier").eq("user_id", userId).eq("active", true).maybeSingle()
  if (globalAdmin && (readOnly || globalAdmin.role_tier !== "read_only_admin")) return { allowed: true, event }

  return { allowed: await isEventManager(admin, event, userId), event }
}

function parseTicketPayload(body: any) {
  const name = typeof body.name === "string" ? body.name.trim() : ""
  const price = Number(body.price)
  const quota = Number.parseInt(String(body.quota ?? ""), 10)
  const perUserLimit = parseOptionalPurchaseLimit(body.per_user_limit)
  const currency = normalizeTicketCurrency(body.currency)
  const salesStatus = typeof body.sales_status === "string" ? body.sales_status : "on_sale"
  const isReservedSeating = Boolean(body.is_reserved_seating)
  const onlineQuota = body.online_quota == null || body.online_quota === "" ? quota : Number.parseInt(String(body.online_quota), 10)
  const onlinePerOrderLimit = parseOptionalPurchaseLimit(body.online_per_order_limit)

  const paymentProviders = parsePaymentProviderList(body.payment_providers)

  return { name, price, quota, perUserLimit, currency, salesStatus, isReservedSeating, onlineQuota, onlinePerOrderLimit, paymentProviders }
}

function validateTicketPayload(input: ReturnType<typeof parseTicketPayload>) {
  if (!input.name) return "Ticket name is required"
  if (!Number.isFinite(input.price) || input.price < 0) return "Ticket price must be zero or more"
  if (!isSupportedTicketCurrency(input.currency)) return "Choose ZAR for Paystack or SZL for MTN MoMo"
  if (!Number.isFinite(input.quota) || input.quota < 0) return "Ticket quantity must be zero or more"
  if (!isValidOptionalPurchaseLimit(input.perUserLimit)) return "Per-user limit must be a positive whole number or left blank"
  if (!SALES_STATUSES.has(input.salesStatus)) return "Invalid ticket sales status"
  if (!Number.isFinite(input.onlineQuota) || input.onlineQuota < 0) return "Online channel quota must be zero or more"
  if (input.onlineQuota > input.quota) return "Online channel quota cannot exceed total quantity"
  if (!isValidOptionalPurchaseLimit(input.onlinePerOrderLimit)) return "Online per-order limit must be a positive whole number or left blank"
  if (!isPerOrderLimitWithinBuyerLimit(input.perUserLimit, input.onlinePerOrderLimit)) return "Online per-order limit cannot exceed the per-buyer limit"
  if (!input.paymentProviders.ok) return input.paymentProviders.error
  return null
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const admin = createAdminClient()
  const { allowed, event } = await loadManageContext(admin, eventId, userId, true)
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: "Permission denied" }, { status: 403 })

  const { data, error } = await admin
    .from("ticket_types")
    .select("id, name, price_cents, currency, quota, per_user_limit, sales_status, is_reserved_seating, payment_providers, created_at, ticket_type_channels(channel, quota, per_order_limit)")
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
  const paymentProviders = input.paymentProviders.ok ? input.paymentProviders.providers : []
  const methodsError = await ticketPaymentMethodsError(admin, eventId, paymentProviders, input.currency)
  if (methodsError) return NextResponse.json({ error: methodsError }, { status: 400 })

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
      payment_providers: paymentProviders,
      sales_paused_at: input.salesStatus === "paused" ? new Date().toISOString() : null,
      sales_pause_reason: input.salesStatus === "paused" ? "Paused from ticket builder" : null,
    })
    .select("id, name, price_cents, currency, quota, per_user_limit, sales_status, is_reserved_seating, payment_providers, created_at")
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
      payment_providers: paymentProviders,
    },
  })

  return NextResponse.json({ ticket }, { status: 201 })
}
