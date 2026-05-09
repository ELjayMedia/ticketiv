import "server-only"

import { createServerSupabaseClient } from "@/lib/supabase-server"

type SupabaseServerClient = NonNullable<ReturnType<typeof createServerSupabaseClient>>

type TicketLikeOrderItem = {
  id: string
  ticket_code: string
  status: "issued" | "transferred" | "checked_in" | "revoked" | "refunded"
  checked_in_at: string | null
  ticket_types: { event_id: string } | { event_id: string }[] | null
  orders: { status: "pending" | "paid" | "failed" | "refunded" } | { status: "pending" | "paid" | "failed" | "refunded" }[] | null
}

export interface ValidateQrCodeInput {
  code: string
  eventId: string
  userId: string
  deviceId?: string | null
  sessionId?: string | null
  gate?: string | null
  offline?: boolean
  scannedAt?: string
}

export interface ValidateQrCodeResult {
  valid: boolean
  status: "validated" | "duplicate" | "not_found" | "wrong_event" | "revoked" | "unauthorized" | "offline" | "error"
  message: string
  orderItem?: TicketLikeOrderItem | null
  scan?: Record<string, any> | null
  previousScan?: Record<string, any> | null
}

export interface OfflineScanPayload {
  code: string
  eventId: string
  deviceId?: string | null
  sessionId?: string | null
  scannedAt: string
  gate?: string | null
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

async function ensureScannerAuthorized(client: SupabaseServerClient, userId: string, eventId: string) {
  const { data: event, error: eventError } = await client
    .from("events")
    .select("id, org_id")
    .eq("id", eventId)
    .maybeSingle<{ id: string; org_id: string }>()

  if (eventError) {
    console.error("Failed to load event for scanner authorization", eventError)
    throw new Error("Unable to verify scanner permissions")
  }

  if (!event) return false

  const { data: eventStaff, error: eventStaffError } = await client
    .from("event_staff")
    .select("role")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle<{ role: string }>()

  if (eventStaffError) {
    console.error("Failed to check event staff permissions", eventStaffError)
    throw new Error("Unable to verify scanner permissions")
  }

  if (eventStaff?.role && ["admin", "organizer_admin", "organizer_staff", "scanner"].includes(eventStaff.role)) {
    return true
  }

  const { data: orgMember, error: orgMemberError } = await client
    .from("org_members")
    .select("role")
    .eq("org_id", event.org_id)
    .eq("user_id", userId)
    .maybeSingle<{ role: string }>()

  if (orgMemberError) {
    console.error("Failed to check org member permissions", orgMemberError)
    throw new Error("Unable to verify scanner permissions")
  }

  return Boolean(
    orgMember?.role &&
      ["admin", "organizer", "organizer_owner", "organizer_admin", "organizer_staff", "organizer_scanner", "scanner"].includes(
        orgMember.role,
      ),
  )
}

async function recordScan(
  supabase: SupabaseServerClient,
  payload: {
    eventId: string
    orderItemId?: string | null
    code: string
    deviceId?: string | null
    sessionId?: string | null
    gate?: string | null
    outcome: "valid" | "already_used" | "revoked" | "invalid" | "wrong_event"
    scannedAt: string
    notes?: string | null
  },
) {
  const { data, error } = await supabase
    .from("scans")
    .insert({
      event_id: payload.eventId,
      order_item_id: payload.orderItemId ?? null,
      ticket_code: payload.code,
      outcome: payload.outcome,
      device_id: payload.deviceId ?? null,
      device_session_id: payload.sessionId ?? null,
      gate: payload.gate ?? null,
      scanned_at: payload.scannedAt,
      notes: payload.notes ?? null,
    })
    .select("*")
    .single()

  if (error) {
    console.error("Failed to record scan", error)
    throw new Error("Unable to record scan")
  }

  return data
}

export async function validateQrCode(input: ValidateQrCodeInput): Promise<ValidateQrCodeResult> {
  if (!input.code.trim()) {
    return { valid: false, status: "error", message: "No QR code provided" }
  }

  if (!input.eventId) {
    return { valid: false, status: "error", message: "Event ID is required" }
  }

  const supabase = createServerSupabaseClient()
  if (!supabase) {
    return { valid: false, status: "error", message: "Supabase is not configured" }
  }

  const authorized = await ensureScannerAuthorized(supabase, input.userId, input.eventId)
  if (!authorized) {
    return { valid: false, status: "unauthorized", message: "You are not authorized to scan tickets for this event" }
  }

  const { data: orderItem, error: ticketError } = await supabase
    .from("order_items")
    .select("id, ticket_code, status, checked_in_at, ticket_types!inner(event_id), orders!inner(status)")
    .eq("ticket_code", input.code)
    .maybeSingle<TicketLikeOrderItem>()

  if (ticketError) {
    console.error("Failed to validate ticket", ticketError)
    return { valid: false, status: "error", message: "Unable to validate ticket" }
  }

  const scannedAt = input.scannedAt ?? new Date().toISOString()

  if (!orderItem) {
    const scan = await recordScan(supabase, {
      eventId: input.eventId,
      code: input.code,
      deviceId: input.deviceId,
      sessionId: input.sessionId,
      gate: input.gate,
      outcome: "invalid",
      scannedAt,
      notes: "Ticket code not found",
    })

    return { valid: false, status: "not_found", message: "Ticket not found", scan }
  }

  const ticketType = firstRelation(orderItem.ticket_types)
  const order = firstRelation(orderItem.orders)

  if (ticketType?.event_id !== input.eventId) {
    const scan = await recordScan(supabase, {
      eventId: input.eventId,
      orderItemId: orderItem.id,
      code: input.code,
      deviceId: input.deviceId,
      sessionId: input.sessionId,
      gate: input.gate,
      outcome: "wrong_event",
      scannedAt,
      notes: `Ticket belongs to event ${ticketType?.event_id ?? "unknown"}`,
    })

    return { valid: false, status: "wrong_event", message: "Ticket is for a different event", orderItem, scan }
  }

  if (order?.status !== "paid") {
    const scan = await recordScan(supabase, {
      eventId: input.eventId,
      orderItemId: orderItem.id,
      code: input.code,
      deviceId: input.deviceId,
      sessionId: input.sessionId,
      gate: input.gate,
      outcome: "invalid",
      scannedAt,
      notes: `Order status is ${order?.status ?? "unknown"}`,
    })

    return { valid: false, status: "error", message: "Ticket has not been paid for", orderItem, scan }
  }

  if (["revoked", "refunded"].includes(orderItem.status)) {
    const scan = await recordScan(supabase, {
      eventId: input.eventId,
      orderItemId: orderItem.id,
      code: input.code,
      deviceId: input.deviceId,
      sessionId: input.sessionId,
      gate: input.gate,
      outcome: "revoked",
      scannedAt,
      notes: `Ticket status is ${orderItem.status}`,
    })

    return { valid: false, status: "revoked", message: "Ticket is no longer valid", orderItem, scan }
  }

  const { data: previousScan } = await supabase
    .from("scans")
    .select("*")
    .eq("order_item_id", orderItem.id)
    .eq("outcome", "valid")
    .order("scanned_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (previousScan || orderItem.status === "checked_in" || orderItem.checked_in_at) {
    const scan = await recordScan(supabase, {
      eventId: input.eventId,
      orderItemId: orderItem.id,
      code: input.code,
      deviceId: input.deviceId,
      sessionId: input.sessionId,
      gate: input.gate,
      outcome: "already_used",
      scannedAt,
    })

    return {
      valid: false,
      status: "duplicate",
      message: "Ticket was already scanned",
      orderItem,
      scan,
      previousScan,
    }
  }

  if (input.offline) {
    return {
      valid: true,
      status: "offline",
      message: "Scan stored offline",
      orderItem,
    }
  }

  const scan = await recordScan(supabase, {
    eventId: input.eventId,
    orderItemId: orderItem.id,
    code: input.code,
    deviceId: input.deviceId,
    sessionId: input.sessionId,
    gate: input.gate,
    outcome: "valid",
    scannedAt,
  })

  const { error: updateTicketError } = await supabase
    .from("order_items")
    .update({ status: "checked_in", checked_in_at: scannedAt })
    .eq("id", orderItem.id)

  if (updateTicketError) {
    console.error("Failed to update ticket status", updateTicketError)
    return { valid: false, status: "error", message: "Scan was recorded but ticket status could not be updated", orderItem, scan }
  }

  return {
    valid: true,
    status: "validated",
    message: "Ticket validated",
    orderItem,
    scan,
  }
}

export async function syncOfflineScans(scans: OfflineScanPayload[], userId: string) {
  if (!scans || scans.length === 0) {
    return { inserted: 0 }
  }

  let inserted = 0

  for (const payload of scans) {
    const result = await validateQrCode({
      code: payload.code,
      eventId: payload.eventId,
      userId,
      deviceId: payload.deviceId,
      sessionId: payload.sessionId,
      gate: payload.gate,
      scannedAt: payload.scannedAt,
    })

    if (result.valid) inserted += 1
  }

  return { inserted }
}
