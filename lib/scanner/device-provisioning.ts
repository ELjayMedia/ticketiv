import "server-only"

import { createHash, randomBytes, randomUUID } from "crypto"

import { createAdminClient } from "@/lib/supabase/admin"

export type ProvisionedDeviceRole = "organizer_scanner" | "organizer_pos" | "organizer_kiosk"

export interface DeviceSetupCode {
  code: string
  expiresAt: string
  label: string
  deviceRole: ProvisionedDeviceRole
  maxScansPerMinute: number | null
}

export interface ClaimDeviceSetupCodeInput {
  code: string
  deviceId?: string | null
  label?: string | null
}

export interface ClaimedDeviceSetup {
  device: {
    id: string
    label: string | null
    device_role: ProvisionedDeviceRole
    max_scans_per_minute: number | null
  }
  session: {
    id: string
    device_id: string
    started_at: string | null
  }
  event: {
    id: string
    title: string
    starts_at: string | null
    venue_name: string | null
  }
}

export class DeviceProvisioningError extends Error {
  readonly status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = "DeviceProvisioningError"
    this.status = status
  }
}

const SETUP_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const DEFAULT_CODE_TTL_MINUTES = 30

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function normalizeSetupCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "")
}

export function formatSetupCode(code: string): string {
  const normalized = normalizeSetupCode(code)
  return normalized.length > 3 ? `${normalized.slice(0, 3)}-${normalized.slice(3)}` : normalized
}

export function hashSetupCode(code: string): string {
  const normalized = normalizeSetupCode(code)
  return createHash("sha256").update(normalized).digest("hex")
}

export function generateSetupCode(): string {
  const bytes = randomBytes(6)
  let code = ""
  for (const byte of bytes) {
    code += SETUP_CODE_ALPHABET[byte % SETUP_CODE_ALPHABET.length]
  }
  return code
}

function sanitizeRateLimit(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  return Math.min(600, Math.max(1, Math.floor(parsed)))
}

export async function createDeviceSetupCode(input: {
  orgId: string
  eventId: string
  createdBy: string
  label: string
  deviceRole?: ProvisionedDeviceRole
  maxScansPerMinute?: number | string | null
  ttlMinutes?: number
}): Promise<DeviceSetupCode> {
  const label = input.label.trim()
  if (!label) throw new DeviceProvisioningError("Device label is required")

  const deviceRole = input.deviceRole ?? "organizer_scanner"
  const expiresAt = new Date(
    Date.now() + Math.max(1, input.ttlMinutes ?? DEFAULT_CODE_TTL_MINUTES) * 60_000,
  ).toISOString()
  const maxScansPerMinute = sanitizeRateLimit(input.maxScansPerMinute)
  const admin = createAdminClient()

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const rawCode = generateSetupCode()
    const { error } = await (admin.from as any)("device_setup_codes").insert({
      org_id: input.orgId,
      event_id: input.eventId,
      device_role: deviceRole,
      label,
      max_scans_per_minute: maxScansPerMinute,
      code_hash: hashSetupCode(rawCode),
      expires_at: expiresAt,
      created_by: input.createdBy,
    })

    if (!error) {
      return {
        code: formatSetupCode(rawCode),
        expiresAt,
        label,
        deviceRole,
        maxScansPerMinute,
      }
    }

    if (error.code !== "23505") {
      throw new DeviceProvisioningError("Unable to create setup code", 500)
    }
  }

  throw new DeviceProvisioningError("Unable to create a unique setup code", 500)
}

export async function claimDeviceSetupCode(input: ClaimDeviceSetupCodeInput): Promise<ClaimedDeviceSetup> {
  const normalizedCode = normalizeSetupCode(input.code)
  if (normalizedCode.length < 6) {
    throw new DeviceProvisioningError("Enter a valid setup code")
  }

  const admin = createAdminClient()
  const { data: setup, error: setupError } = await (admin.from as any)("device_setup_codes")
    .select("id, org_id, event_id, device_role, label, max_scans_per_minute, expires_at, claimed_at, created_by")
    .eq("code_hash", hashSetupCode(normalizedCode))
    .maybeSingle()

  if (setupError) throw new DeviceProvisioningError("Unable to verify setup code", 500)
  if (!setup) throw new DeviceProvisioningError("Setup code is invalid", 404)
  if (setup.claimed_at) throw new DeviceProvisioningError("Setup code has already been used", 409)
  if (new Date(setup.expires_at).getTime() < Date.now()) {
    throw new DeviceProvisioningError("Setup code has expired", 410)
  }
  if (setup.device_role === "organizer_scanner" && !setup.event_id) {
    throw new DeviceProvisioningError("Scanner setup code is missing an event", 500)
  }

  const deviceId = input.deviceId && isUuid(input.deviceId) ? input.deviceId : randomUUID()
  const label = input.label?.trim() || setup.label
  const now = new Date().toISOString()

  const { data: existingDevice, error: existingError } = await admin
    .from("devices")
    .select("id, org_id, event_id")
    .eq("id", deviceId)
    .maybeSingle()

  if (existingError) throw new DeviceProvisioningError("Unable to verify scanner device", 500)
  if (existingDevice && existingDevice.org_id !== setup.org_id) {
    throw new DeviceProvisioningError("This device is already registered to a different organization", 409)
  }
  if (existingDevice?.event_id && existingDevice.event_id !== setup.event_id) {
    throw new DeviceProvisioningError("This device is already assigned to a different event", 409)
  }

  const devicePayload = {
    id: deviceId,
    org_id: setup.org_id,
    event_id: setup.event_id,
    registered_by: setup.created_by,
    label,
    device_role: setup.device_role as ProvisionedDeviceRole,
    max_scans_per_minute: setup.max_scans_per_minute,
    last_seen_at: now,
  }

  if (!existingDevice) {
    const { error: insertError } = await admin.from("devices").insert(devicePayload)
    if (insertError) throw new DeviceProvisioningError("Unable to register scanner device", 500)
  }

  const { data: claimed, error: claimError } = await (admin.from as any)("device_setup_codes")
    .update({ claimed_at: now, claimed_device_id: deviceId })
    .eq("id", setup.id)
    .is("claimed_at", null)
    .select("id")
    .maybeSingle()

  if (claimError || !claimed) {
    if (!existingDevice) {
      await admin.from("devices").delete().eq("id", deviceId)
    }
    if (claimError) throw new DeviceProvisioningError("Unable to claim setup code", 500)
    throw new DeviceProvisioningError("Setup code has already been used", 409)
  }

  const { data: device, error: deviceError } = await admin
    .from("devices")
    .update(devicePayload)
    .eq("id", deviceId)
    .select("id, label, device_role, max_scans_per_minute")
    .single()
  if (deviceError || !device) throw new DeviceProvisioningError("Unable to register scanner device", 500)

  const { data: session, error: sessionError } = await (admin.from as any)("device_sessions")
    .insert({ device_id: deviceId, user_id: null, started_at: now })
    .select("id, device_id, started_at")
    .single()

  if (sessionError || !session) throw new DeviceProvisioningError("Unable to start scanner session", 500)

  const { data: event, error: eventError } = await admin
    .from("events")
    .select("id, title, starts_at, venues:venue_id(name)")
    .eq("id", setup.event_id)
    .single()

  if (eventError || !event) throw new DeviceProvisioningError("Unable to load scanner event", 500)

  return {
    device: {
      id: device.id,
      label: device.label,
      device_role: device.device_role as ProvisionedDeviceRole,
      max_scans_per_minute: device.max_scans_per_minute,
    },
    session: {
      id: session.id,
      device_id: session.device_id,
      started_at: session.started_at,
    },
    event: {
      id: event.id,
      title: event.title,
      starts_at: event.starts_at,
      venue_name: Array.isArray(event.venues) ? event.venues[0]?.name ?? null : event.venues?.name ?? null,
    },
  }
}
