import "server-only"

import { createHash } from "crypto"
import type {
  ScannerInputMode,
  ScannerManifestItem as SharedScannerManifestItem,
  ScannerValidationStatus as SharedScannerValidationStatus,
} from "@ticketiv/shared"
import { verifyDeviceScannerAccess } from "@/lib/scanner/device-session-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import {
  createTapBandLifecycleService,
  type TapBandLifecycleResult,
} from "@/lib/tapband/lifecycle"

export interface ValidateQrCodeInput {
  code: string
  eventId: string
  userId?: string | null
  deviceId?: string | null
  sessionId?: string | null
  gate?: string | null
  offline?: boolean
  scannedAt?: string
  attemptId?: string | null
}

export interface ValidateTapBandCredentialInput {
  credentialPublicId: string
  eventId: string
  userId?: string | null
  deviceId?: string | null
  sessionId?: string | null
  gate?: string | null
  scannedAt?: string
  attemptId?: string | null
}

export type ScannerValidationStatus = SharedScannerValidationStatus

export interface ValidateQrCodeResult {
  valid: boolean
  status: ScannerValidationStatus
  message: string
  inputMode?: ScannerInputMode
  scanId?: string | null
  orderItemId?: string | null
  ticketTypeName?: string | null
  checkedInAt?: string | null
  idempotent?: boolean
}

export interface OfflineScanPayload {
  code: string
  eventId: string
  deviceId?: string | null
  sessionId?: string | null
  scannedAt: string
  gate?: string | null
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

type RpcResult = {
  outcome: string
  valid: boolean
  message: string
  scan_id?: string | null
  order_item_id?: string | null
  ticket_type_name?: string | null
  checked_in_at?: string | null
  idempotent?: boolean
}

function outcomeToStatus(outcome: string): ValidateQrCodeResult["status"] {
  switch (outcome) {
    case "validated":   return "validated"
    case "duplicate":   return "duplicate"
    case "not_found":   return "not_found"
    case "wrong_event": return "wrong_event"
    case "revoked":     return "revoked"
    case "refunded":    return "refunded"
    case "transferred": return "transferred"
    case "not_paid":    return "not_paid"
    case "unauthorized":return "unauthorized"
    default:            return "error"
  }
}

export function tapBandLifecycleStatus(result: Pick<TapBandLifecycleResult, "outcome" | "reasonCode">): ScannerValidationStatus {
  switch (result.outcome) {
    case "valid":
      return "validated"
    case "already_used":
      return "duplicate"
    case "no_entitlement":
      return "tapband_no_entitlement"
    case "multiple_entitlements":
      return "tapband_multiple_entitlements"
    case "unknown":
      return "tapband_unknown"
    case "lost":
      return "tapband_lost"
    case "replaced":
      return "tapband_replaced"
    case "revoked":
    case "retired":
    case "destroyed":
    case "defective":
      return "revoked"
    case "refunded":
      return "refunded"
    case "not_paid":
      return "not_paid"
    case "unauthorized":
      return "unauthorized"
    case "unsupported_chip":
      return "tapband_unsupported_chip"
    case "auth_failure":
    case "unauthenticated_chip":
      return "tapband_unauthenticated_chip"
    case "reader_error":
      return "tapband_reader_error"
    case "attempt_conflict":
      return "duplicate"
    default:
      if (result.reasonCode === "tapband_unknown") return "tapband_unknown"
      if (result.reasonCode?.includes("multiple_entitlement") || result.reasonCode?.includes("multiple_eligible")) return "tapband_multiple_entitlements"
      if (result.reasonCode?.includes("no_entitlement")) return "tapband_no_entitlement"
      if (result.reasonCode?.includes("lost")) return "tapband_lost"
      if (result.reasonCode?.includes("replaced")) return "tapband_replaced"
      if (result.reasonCode?.includes("unsupported_chip")) return "tapband_unsupported_chip"
      if (result.reasonCode?.includes("auth_failure") || result.reasonCode?.includes("unauthenticated")) return "tapband_unauthenticated_chip"
      if (result.reasonCode?.includes("unauthorized")) return "unauthorized"
      if (result.reasonCode?.includes("not_paid")) return "not_paid"
      if (result.reasonCode?.includes("refunded")) return "refunded"
      if (result.reasonCode?.includes("revoked")) return "revoked"
      return "error"
  }
}

export function tapBandLifecycleMessage(
  result: Pick<TapBandLifecycleResult, "message" | "ticketTypeName">,
  status: ScannerValidationStatus,
) {
  if (result.message) return result.message

  switch (status) {
    case "validated":
      return result.ticketTypeName ? `TapBand checked in for ${result.ticketTypeName}` : "TapBand checked in"
    case "duplicate":
      return "TapBand was already checked in for this event"
    case "tapband_no_entitlement":
      return "No active ticket for this event is linked to this TapBand"
    case "tapband_multiple_entitlements":
      return "Multiple active tickets are linked to this TapBand. Use QR fallback until ticket selection is available"
    case "tapband_unknown":
      return "TapBand not recognised. Use QR or manual fallback"
    case "tapband_lost":
      return "TapBand was reported lost. Do not admit with this band"
    case "tapband_replaced":
      return "TapBand was replaced. Use the newer TapBand or QR fallback"
    case "revoked":
      return "TapBand is inactive. Do not admit with this band"
    case "refunded":
      return "Linked ticket was refunded and is no longer valid"
    case "not_paid":
      return "Linked order has not been paid"
    case "unauthorized":
      return "Scanner is not assigned to this event"
    case "tapband_unsupported_chip":
      return "TapBand chip is not supported by this scanner"
    case "tapband_unauthenticated_chip":
      return "TapBand could not be authenticated"
    case "tapband_reader_error":
      return "TapBand could not be read. Try again or use QR fallback"
    default:
      return "TapBand scan failed"
  }
}

export function tapBandLifecycleResultToScanResult(result: TapBandLifecycleResult): ValidateQrCodeResult {
  const status = tapBandLifecycleStatus(result)

  return {
    valid: result.valid === true,
    status,
    message: tapBandLifecycleMessage(result, status),
    inputMode: "tapband",
    scanId: result.scanId ?? null,
    orderItemId: result.orderItemId ?? null,
    ticketTypeName: result.ticketTypeName ?? null,
    checkedInAt: result.checkedInAt ?? null,
    idempotent: result.idempotent ?? false,
  }
}

export async function validateQrCode(input: ValidateQrCodeInput): Promise<ValidateQrCodeResult> {
  if (!input.code.trim()) {
    return { valid: false, status: "error", message: "No QR code provided" }
  }
  if (!input.eventId) {
    return { valid: false, status: "error", message: "Event ID is required" }
  }

  // Offline mode: store locally, sync later — no DB write yet.
  if (input.offline) {
    return { valid: true, status: "offline", message: "Scan stored offline" }
  }

  // Two callers, two entry points. A signed-in staff user goes through the
  // claimed-account shim (fn_scan_ticket) on their own JWT. A device/offline
  // sync has no user session, so it runs service-role — and the shim's
  // app.require_claimed_account() would raise `claimed_account_required`
  // because service-role has no auth.uid(). Service-role therefore calls the
  // worker, which keeps the authorization that matters (its caller guard
  // permits service_role, and it still verifies p_scanned_by is event staff).
  const asServiceRole = !input.userId
  const supabase = asServiceRole ? createAdminClient() : createServerSupabaseClient()
  if (!supabase) {
    return { valid: false, status: "error", message: "Supabase is not configured" }
  }

  const scanFn = asServiceRole ? "fn_scan_ticket_unchecked" : "fn_scan_ticket"
  const { data, error } = await (supabase.rpc as any)(scanFn, {
    p_ticket_code: input.code,
    p_event_id:    input.eventId,
    p_scanned_by:  input.userId ?? null,
    p_device_id:   input.deviceId ?? null,
    p_session_id:  input.sessionId ?? null,
    p_gate:        input.gate ?? null,
    p_scanned_at:  input.scannedAt ?? new Date().toISOString(),
    p_attempt_id:  input.attemptId ?? null,
  })

  if (error) {
    console.error(`${scanFn} error`, error)
    return { valid: false, status: "error", message: "Scan failed" }
  }

  const result = data as RpcResult
  return {
    valid:          result.valid,
    status:         outcomeToStatus(result.outcome),
    message:        result.message,
    inputMode:      "qr",
    scanId:         result.scan_id ?? null,
    orderItemId:    result.order_item_id ?? null,
    ticketTypeName: result.ticket_type_name ?? null,
    checkedInAt:    result.checked_in_at ?? null,
    idempotent:     result.idempotent ?? false,
  }
}

export async function validateTapBandCredential(input: ValidateTapBandCredentialInput): Promise<ValidateQrCodeResult> {
  const credentialPublicId = input.credentialPublicId.trim()

  if (!credentialPublicId) {
    return {
      valid: false,
      status: "tapband_reader_error",
      message: tapBandLifecycleMessage({}, "tapband_reader_error"),
      inputMode: "tapband",
    }
  }

  if (!input.eventId) {
    return { valid: false, status: "error", message: "Event ID is required", inputMode: "tapband" }
  }

  const service = createTapBandLifecycleService()
  const result = await service.resolveCredentialForEvent({
    credentialPublicId,
    eventId: input.eventId,
    actorId: input.userId ?? null,
    deviceId: input.deviceId ?? null,
    sessionId: input.sessionId ?? null,
    attemptId: input.attemptId ?? null,
    gate: input.gate ?? null,
    scannedAt: input.scannedAt ?? new Date().toISOString(),
    channel: "nfc",
  })

  return tapBandLifecycleResultToScanResult(result)
}

export async function syncOfflineScans(scans: OfflineScanPayload[], userId: string | null) {
  if (!scans || scans.length === 0) return { inserted: 0, results: [] }

  const results: Array<{ code: string; outcome: string; idempotent: boolean }> = []
  let inserted = 0

  for (const payload of scans) {
    // Deterministic attempt ID so retried syncs of the same scan are idempotent.
    const attemptId = createHash("sha256")
      .update(`${payload.deviceId ?? ""}:${payload.eventId}:${payload.code}:${payload.scannedAt}`)
      .digest("hex")
      .slice(0, 40)

    const result = await validateQrCode({
      code:      payload.code,
      eventId:   payload.eventId,
      userId,
      deviceId:  payload.deviceId,
      sessionId: payload.sessionId,
      gate:      payload.gate,
      scannedAt: payload.scannedAt,
      attemptId,
    })

    results.push({ code: payload.code, outcome: result.status, idempotent: result.idempotent ?? false })
    if (result.valid || result.idempotent) inserted += 1
  }

  return { inserted, results }
}

// ---------------------------------------------------------------------------
// Device session helpers (unchanged)
// ---------------------------------------------------------------------------

async function getEventOrgId(supabase: NonNullable<ReturnType<typeof createServerSupabaseClient>>, eventId: string) {
  const { data: event, error } = await supabase
    .from("events")
    .select("id, org_id")
    .eq("id", eventId)
    .maybeSingle<{ id: string; org_id: string }>()

  if (error) {
    console.error("Failed to load event", error)
    throw new Error("Unable to verify event")
  }
  return event?.org_id ?? null
}

async function ensureScannerAuthorized(
  supabase: NonNullable<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  eventId: string,
) {
  const orgId = await getEventOrgId(supabase, eventId)
  if (!orgId) return false

  const { data: eventStaff } = await supabase
    .from("event_staff")
    .select("role")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle<{ role: string }>()

  if (eventStaff?.role && ["admin", "organizer_admin", "organizer_staff", "scanner"].includes(eventStaff.role)) {
    return true
  }

  const { data: orgMember } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle<{ role: string }>()

  return Boolean(
    orgMember?.role &&
      ["admin", "organizer", "organizer_owner", "organizer_admin", "organizer_staff", "organizer_scanner", "scanner"].includes(
        orgMember.role,
      ),
  )
}

export async function startDeviceSession(deviceId: string, eventId: string, userId?: string) {
  const supabase = createServerSupabaseClient()
  if (!supabase) throw new Error("Supabase is not configured")
  if (!isUuid(deviceId)) throw new Error("A valid scanner deviceId is required")
  if (!isUuid(eventId)) throw new Error("A valid eventId is required")
  if (!userId) throw new Error("Scanner login required")

  const authorized = await ensureScannerAuthorized(supabase, userId, eventId)
  if (!authorized) throw new Error("You are not authorized to scan tickets for this event")

  const orgId = await getEventOrgId(supabase, eventId)
  if (!orgId) throw new Error("Event not found")

  const { data: device } = await supabase
    .from("devices")
    .select("id, event_id, org_id")
    .eq("id", deviceId)
    .maybeSingle<{ id: string; event_id: string | null; org_id: string }>()

  if (!device) {
    const { error } = await supabase.from("devices").insert({
      id: deviceId, org_id: orgId, event_id: eventId,
      registered_by: userId, label: "Scanner device",
      device_role: "organizer_scanner", last_seen_at: new Date().toISOString(),
    })
    if (error) throw new Error("Unable to register scanner device")
  } else if (device.event_id && device.event_id !== eventId) {
    throw new Error("Scanner device is assigned to a different event")
  } else {
    const { error } = await supabase
      .from("devices")
      .update({ event_id: eventId, last_seen_at: new Date().toISOString(), device_role: "organizer_scanner" })
      .eq("id", deviceId)
    if (error) throw new Error("Unable to update scanner device")
  }

  const { data, error } = await supabase
    .from("device_sessions")
    .insert({ device_id: deviceId, user_id: userId, started_at: new Date().toISOString() })
    .select("*")
    .single()

  if (error) throw new Error("Unable to start device session")
  return data
}

export async function closeDeviceSession(sessionId: string, userId?: string) {
  const supabase = createServerSupabaseClient()
  if (!supabase) throw new Error("Supabase is not configured")
  if (!isUuid(sessionId)) throw new Error("A valid sessionId is required")
  if (!userId) throw new Error("Scanner login required")

  const { data, error } = await supabase
    .from("device_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .select("*")
    .single()

  if (error) throw new Error("Unable to close device session")
  return data
}

export type ScannerManifestItem = SharedScannerManifestItem

export async function loadScannerManifest(eventId: string, userId: string, since?: string): Promise<ScannerManifestItem[]> {
  const supabase = createServerSupabaseClient()
  if (!supabase) throw new Error("Supabase is not configured")
  if (!isUuid(eventId)) throw new Error("A valid eventId is required")
  if (!userId) throw new Error("Scanner login required")

  const authorized = await ensureScannerAuthorized(supabase, userId, eventId)
  if (!authorized) throw new Error("You are not authorized to scan tickets for this event")

  let query = supabase
    .from("order_items")
    .select("id, ticket_code, ticket_type_id, status, checked_in_at, ticket_types!inner(event_id), orders!inner(status)")
    .eq("ticket_types.event_id", eventId)
    .eq("orders.status", "paid")
    .not("status", "in", "(revoked,refunded)")

  if (since) {
    query = query.gte("updated_at", since)
  }

  const { data, error } = await query

  if (error) throw new Error("Unable to load scanner manifest")

  return (data ?? []).map((row: any) => ({
    ticket_code:      row.ticket_code,
    order_item_id:    row.id,
    ticket_type_id:   row.ticket_type_id,
    status:           row.status,
    already_checked_in: Boolean(row.checked_in_at) || row.status === "checked_in",
  }))
}

export async function loadScannerManifestForDevice(
  eventId: string,
  deviceId: string,
  sessionId: string,
  since?: string,
): Promise<ScannerManifestItem[]> {
  await verifyDeviceScannerAccess({ eventId, deviceId, sessionId })

  const admin = createAdminClient()
  if (!isUuid(eventId)) throw new Error("A valid eventId is required")

  let query = admin
    .from("order_items")
    .select("id, ticket_code, ticket_type_id, status, checked_in_at, ticket_types!inner(event_id), orders!inner(status)")
    .eq("ticket_types.event_id", eventId)
    .eq("orders.status", "paid")
    .not("status", "in", "(revoked,refunded)")

  if (since) {
    query = query.gte("updated_at", since)
  }

  const { data, error } = await query

  if (error) throw new Error("Unable to load scanner manifest")

  return (data ?? []).map((row: any) => ({
    ticket_code:      row.ticket_code,
    order_item_id:    row.id,
    ticket_type_id:   row.ticket_type_id,
    status:           row.status,
    already_checked_in: Boolean(row.checked_in_at) || row.status === "checked_in",
  }))
}
