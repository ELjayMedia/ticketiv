import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

export interface DeviceScannerAccess {
  deviceId: string
  sessionId: string
  eventId: string
  label: string | null
  maxScansPerMinute: number | null
}

export class DeviceScannerAccessError extends Error {
  readonly status: number

  constructor(message: string, status = 401) {
    super(message)
    this.name = "DeviceScannerAccessError"
    this.status = status
  }
}

function isUuid(value: string | null | undefined) {
  return Boolean(
    value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
  )
}

export async function verifyDeviceScannerAccess(input: {
  deviceId?: string | null
  sessionId?: string | null
  eventId?: string | null
}): Promise<DeviceScannerAccess> {
  const deviceId = input.deviceId?.trim() ?? ""
  const sessionId = input.sessionId?.trim() ?? ""
  const eventId = input.eventId?.trim() ?? ""

  if (!isUuid(deviceId) || !isUuid(sessionId) || !isUuid(eventId)) {
    throw new DeviceScannerAccessError("Scanner device session required", 401)
  }

  const admin = createAdminClient()
  const { data: session, error: sessionError } = await admin
    .from("device_sessions")
    .select("id, device_id, ended_at")
    .eq("id", sessionId)
    .eq("device_id", deviceId)
    .maybeSingle()

  if (sessionError) throw new DeviceScannerAccessError("Unable to verify scanner session", 500)
  if (!session || session.ended_at) throw new DeviceScannerAccessError("Scanner session is not active", 401)

  const { data: device, error: deviceError } = await admin
    .from("devices")
    .select("id, event_id, device_role, label, max_scans_per_minute")
    .eq("id", deviceId)
    .maybeSingle()

  if (deviceError) throw new DeviceScannerAccessError("Unable to verify scanner device", 500)
  if (!device) throw new DeviceScannerAccessError("Scanner device is not registered", 401)
  if (device.event_id !== eventId) {
    throw new DeviceScannerAccessError("Scanner device is assigned to a different event", 403)
  }
  if (!["organizer_scanner", "organizer_kiosk"].includes(device.device_role)) {
    throw new DeviceScannerAccessError("Device is not allowed to scan tickets", 403)
  }

  return {
    deviceId,
    sessionId,
    eventId,
    label: device.label,
    maxScansPerMinute: device.max_scans_per_minute,
  }
}

export async function closeDeviceScannerSession(input: {
  deviceId?: string | null
  sessionId?: string | null
  eventId?: string | null
}) {
  const access = await verifyDeviceScannerAccess(input)
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("device_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", access.sessionId)
    .eq("device_id", access.deviceId)
    .select("id, device_id, started_at, ended_at")
    .single()

  if (error) throw new DeviceScannerAccessError("Unable to close scanner session", 500)
  return data
}
