import { createServerSupabaseClient } from "@/lib/supabase-server"
import type { DeviceRecord, DeviceSessionRecord, ScanRecord, TicketRecord } from "@/types"

type SupabaseServerClient = ReturnType<typeof createServerSupabaseClient>

export interface ValidateQrCodeInput {
  code: string
  deviceId: string
  sessionId?: string
  location?: string
  offline?: boolean
  scannedAt?: string
}

export interface ValidateQrCodeResult {
  valid: boolean
  status: "validated" | "duplicate" | "not_found" | "offline" | "error"
  message: string
  ticket?: TicketRecord | null
  scan?: ScanRecord | null
  previousScan?: ScanRecord | null
}

export interface OfflineScanPayload {
  code: string
  deviceId: string
  sessionId: string
  scannedAt: string
  location?: string
}

async function ensureDevice(client: SupabaseServerClient, deviceId: string) {
  const { data: existing, error: existingError } = await client
    .from("devices")
    .select("*")
    .eq("id", deviceId)
    .maybeSingle<DeviceRecord>()

  if (existingError) {
    console.error("Failed to lookup device", existingError)
    throw new Error("Unable to verify device")
  }

  if (existing) {
    await client
      .from("devices")
      .update({ last_seen_at: new Date().toISOString(), active: true })
      .eq("id", deviceId)
    return existing
  }

  const { data: created, error: createError } = await client
    .from("devices")
    .insert({ id: deviceId, name: `Scanner ${deviceId}`, active: true, last_seen_at: new Date().toISOString() })
    .select("*")
    .single<DeviceRecord>()

  if (createError) {
    console.error("Failed to register device", createError)
    throw new Error("Unable to register device")
  }

  return created
}

export async function startDeviceSession(deviceId: string, eventId: string): Promise<DeviceSessionRecord> {
  const supabase = createServerSupabaseClient()
  await ensureDevice(supabase, deviceId)
  const { data, error } = await supabase
    .from("device_sessions")
    .insert({
      device_id: deviceId,
      event_id: eventId,
      started_at: new Date().toISOString(),
      status: "active",
    })
    .select("*")
    .single<DeviceSessionRecord>()

  if (error) {
    console.error("Failed to start device session", error)
    throw new Error("Unable to start device session")
  }

  return data
}

export async function closeDeviceSession(sessionId: string): Promise<DeviceSessionRecord> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("device_sessions")
    .update({ ended_at: new Date().toISOString(), status: "closed" })
    .eq("id", sessionId)
    .select("*")
    .single<DeviceSessionRecord>()

  if (error) {
    console.error("Failed to close session", error)
    throw new Error("Unable to close device session")
  }

  return data
}

async function insertScan(
  supabase: SupabaseServerClient,
  payload: {
    ticket: TicketRecord
    code: string
    deviceId: string
    sessionId?: string
    location?: string
    status: ScanRecord["status"]
    scannedAt: string
  },
) {
  const { data, error } = await supabase
    .from("scans")
    .insert({
      ticket_id: payload.ticket.id,
      event_id: payload.ticket.event_id,
      device_id: payload.deviceId,
      device_session_id: payload.sessionId ?? null,
      code: payload.code,
      status: payload.status,
      location: payload.location ?? null,
      scanned_at: payload.scannedAt,
    })
    .select("*")
    .single<ScanRecord>()

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

  const supabase = createServerSupabaseClient()
  await ensureDevice(supabase, input.deviceId)

  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .select("*")
    .eq("qr_code", input.code)
    .maybeSingle<TicketRecord>()

  if (ticketError) {
    console.error("Failed to validate ticket", ticketError)
    return { valid: false, status: "error", message: "Unable to validate ticket" }
  }

  if (!ticket) {
    return { valid: false, status: "not_found", message: "Ticket not found" }
  }

  const { data: previousScan } = await supabase
    .from("scans")
    .select("*")
    .eq("ticket_id", ticket.id)
    .eq("status", "valid")
    .order("scanned_at", { ascending: false })
    .limit(1)
    .maybeSingle<ScanRecord>()

  if (previousScan) {
    return {
      valid: false,
      status: "duplicate",
      message: "Ticket was already scanned",
      ticket,
      scan: previousScan,
      previousScan,
    }
  }

  const scannedAt = input.scannedAt ?? new Date().toISOString()

  if (input.offline) {
    return {
      valid: true,
      status: "offline",
      message: "Scan stored offline",
      ticket,
    }
  }

  const scanRecord = await insertScan(supabase, {
    ticket,
    code: input.code,
    deviceId: input.deviceId,
    sessionId: input.sessionId,
    location: input.location,
    status: "valid",
    scannedAt,
  })

  const { error: updateTicketError } = await supabase
    .from("tickets")
    .update({ status: "checked_in", checked_in_at: scannedAt })
    .eq("id", ticket.id)

  if (updateTicketError) {
    console.error("Failed to update ticket status", updateTicketError)
  }

  return {
    valid: true,
    status: "validated",
    message: "Ticket validated",
    ticket,
    scan: scanRecord,
  }
}

export async function syncOfflineScans(scans: OfflineScanPayload[]) {
  if (!scans || scans.length === 0) {
    return { inserted: 0 }
  }

  const supabase = createServerSupabaseClient()

  let inserted = 0
  for (const payload of scans) {
    const { data: ticket } = await supabase
      .from("tickets")
      .select("*")
      .eq("qr_code", payload.code)
      .maybeSingle<TicketRecord>()

    if (!ticket) {
      continue
    }

    try {
      await insertScan(supabase, {
        ticket,
        code: payload.code,
        deviceId: payload.deviceId,
        sessionId: payload.sessionId,
        location: payload.location,
        status: "valid",
        scannedAt: payload.scannedAt,
      })

      await supabase
        .from("tickets")
        .update({ status: "checked_in", checked_in_at: payload.scannedAt })
        .eq("id", ticket.id)

      inserted += 1
    } catch (error) {
      console.error("Failed to sync offline scan", error)
    }
  }

  return { inserted }
}
