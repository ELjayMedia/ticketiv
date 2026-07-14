import "server-only"

import { createHash } from "crypto"

import type { OpsAlertCheck } from "@/lib/ops/health-alerts"
import { createAdminClient } from "@/lib/supabase/admin"

export type TapBandTelemetrySeverity = "info" | "warning" | "critical"

export interface TapBandTelemetryInput {
  eventType: string
  severity?: TapBandTelemetrySeverity
  orgId?: string | null
  eventId?: string | null
  deviceId?: string | null
  outcome?: string | null
  channel?: "nfc" | "qr" | "serial" | "manual" | "system" | string | null
  credentialId?: string | null
  credentialHash?: string | null
  serial?: string | null
  serialHash?: string | null
  actorId?: string | null
  actorHash?: string | null
  readerId?: string | null
  correlationId?: string | null
  latencyMs?: number | null
  metadata?: Record<string, unknown> | null
  occurredAt?: string | null
}

export interface TapBandTelemetrySignal {
  event_type: string
  severity: TapBandTelemetrySeverity
  outcome: string | null
  org_id?: string | null
  event_id?: string | null
  device_id?: string | null
  credential_hash?: string | null
  serial_hash?: string | null
  actor_hash?: string | null
  reader_id?: string | null
  correlation_id?: string | null
  latency_ms?: number | null
  occurred_at: string
}

export interface TapBandAlertThresholds {
  repeatedAuthFailures: number
  serialEnumerationFailures: number
  duplicateAdmissionAttempts: number
  readerErrors: number
}

const DEFAULT_THRESHOLDS: TapBandAlertThresholds = {
  repeatedAuthFailures: 3,
  serialEnumerationFailures: 10,
  duplicateAdmissionAttempts: 3,
  readerErrors: 5,
}

const AUTH_FAILURE_TYPES = new Set([
  "credential_auth_failure",
  "cryptographic_auth_failure",
  "unsupported_chip",
])
const SERIAL_ENUMERATION_TYPES = new Set(["serial_lookup_failure", "unknown_serial"])
const DUPLICATE_TYPES = new Set(["checkin_duplicate_valid", "duplicate_valid_admission"])
const READER_ERROR_TYPES = new Set(["reader_error", "read_back_mismatch", "offline_sync_conflict"])

const SENSITIVE_METADATA_KEY =
  /(email|phone|name|token|secret|credential|cryptographic|crypto|pan|card|payment|address|buyer|holder|uid|uuid|raw|payload)/i

export function hashTelemetryIdentifier(value: string | null | undefined, salt = telemetryHashSalt()) {
  const normalized = value?.trim()
  if (!normalized) return null

  return createHash("sha256")
    .update(`${salt}:${normalized}`)
    .digest("hex")
}

export function sanitizeTelemetryMetadata(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) return {}
  return sanitizeObject(metadata, 0)
}

export function buildTapBandTelemetryRow(input: TapBandTelemetryInput) {
  if (!input.eventType.trim()) {
    throw new Error("TapBand telemetry eventType is required")
  }

  return {
    org_id: input.orgId ?? null,
    event_id: input.eventId ?? null,
    device_id: input.deviceId ?? null,
    event_type: input.eventType.trim(),
    severity: input.severity ?? "info",
    outcome: input.outcome ?? null,
    channel: input.channel ?? null,
    credential_hash: input.credentialHash ?? hashTelemetryIdentifier(input.credentialId),
    serial_hash: input.serialHash ?? hashTelemetryIdentifier(input.serial),
    actor_hash: input.actorHash ?? hashTelemetryIdentifier(input.actorId),
    reader_id: input.readerId ?? null,
    correlation_id: input.correlationId ?? null,
    latency_ms: normalizeLatency(input.latencyMs),
    metadata: sanitizeTelemetryMetadata(input.metadata),
    occurred_at: input.occurredAt ?? new Date().toISOString(),
  }
}

export async function recordTapBandTelemetryEvent(input: TapBandTelemetryInput) {
  const admin = createAdminClient()
  const row = buildTapBandTelemetryRow(input)
  const { data, error } = await (admin.from as any)("tapband_telemetry_events")
    .insert(row)
    .select("id")
    .single()

  if (error) throw new Error(`Unable to record TapBand telemetry: ${error.message}`)
  return { id: data.id as string }
}

export function evaluateTapBandTelemetrySignals(
  signals: TapBandTelemetrySignal[],
  thresholds: Partial<TapBandAlertThresholds> = {},
): OpsAlertCheck[] {
  const resolved = { ...DEFAULT_THRESHOLDS, ...thresholds }

  return [
    evaluateGroupedSignal({
      key: "tapband-repeated-auth-failures",
      title: "TapBand credential authentication failures",
      healthyMessage: "No repeated credential authentication failures in the telemetry window.",
      alertMessage: "Repeated TapBand credential authentication failures detected.",
      severity: "critical",
      threshold: resolved.repeatedAuthFailures,
      signals: signals.filter((signal) => AUTH_FAILURE_TYPES.has(signal.event_type)),
      groupBy: (signal) => signal.credential_hash ?? signal.device_id ?? signal.reader_id ?? "unknown",
    }),
    evaluateGroupedSignal({
      key: "tapband-serial-enumeration",
      title: "TapBand serial enumeration pattern",
      healthyMessage: "No serial enumeration pattern detected in the telemetry window.",
      alertMessage: "High-volume unknown TapBand serial lookups detected.",
      severity: "warning",
      threshold: resolved.serialEnumerationFailures,
      signals: signals.filter((signal) => SERIAL_ENUMERATION_TYPES.has(signal.event_type)),
      groupBy: (signal) => signal.actor_hash ?? signal.device_id ?? signal.reader_id ?? "unknown",
    }),
    evaluateGroupedSignal({
      key: "tapband-duplicate-valid-admission",
      title: "TapBand duplicate admission attempts",
      healthyMessage: "No repeated duplicate-valid admission attempts in the telemetry window.",
      alertMessage: "Repeated duplicate-valid TapBand admission attempts detected.",
      severity: "critical",
      threshold: resolved.duplicateAdmissionAttempts,
      signals: signals.filter(
        (signal) => DUPLICATE_TYPES.has(signal.event_type) || signal.outcome === "already_used",
      ),
      groupBy: (signal) => signal.credential_hash ?? signal.device_id ?? signal.reader_id ?? "unknown",
    }),
    evaluateGroupedSignal({
      key: "tapband-reader-errors",
      title: "TapBand reader/device errors",
      healthyMessage: "No repeated TapBand reader/device errors in the telemetry window.",
      alertMessage: "Repeated TapBand reader/device errors detected.",
      severity: "warning",
      threshold: resolved.readerErrors,
      signals: signals.filter((signal) => READER_ERROR_TYPES.has(signal.event_type)),
      groupBy: (signal) => signal.device_id ?? signal.reader_id ?? "unknown",
    }),
  ]
}

export async function persistTapBandAlertChecks(checks: OpsAlertCheck[]) {
  const alerts = checks
    .filter((check) => check.status === "alert")
    .map((check) => ({
      alert_key: check.key,
      severity: check.severity === "critical" ? "critical" : "warning",
      title: check.title,
      message: check.message,
      details: check.details,
      last_seen_at: new Date().toISOString(),
    }))

  if (alerts.length === 0) return { inserted: 0 }

  const admin = createAdminClient()
  const { error } = await (admin.from as any)("tapband_alerts").insert(alerts)
  if (error) throw new Error(`Unable to persist TapBand alerts: ${error.message}`)

  return { inserted: alerts.length }
}

function evaluateGroupedSignal(input: {
  key: string
  title: string
  healthyMessage: string
  alertMessage: string
  severity: "warning" | "critical"
  threshold: number
  signals: TapBandTelemetrySignal[]
  groupBy: (signal: TapBandTelemetrySignal) => string
}): OpsAlertCheck {
  const counts = new Map<string, number>()
  const sampleByGroup = new Map<string, TapBandTelemetrySignal>()

  for (const signal of input.signals) {
    const group = input.groupBy(signal)
    counts.set(group, (counts.get(group) ?? 0) + 1)
    if (!sampleByGroup.has(group)) sampleByGroup.set(group, signal)
  }

  const offenders = [...counts.entries()]
    .filter(([, count]) => count >= input.threshold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([group, count]) => {
      const sample = sampleByGroup.get(group)
      return {
        group,
        count,
        eventId: sample?.event_id ?? null,
        deviceId: sample?.device_id ?? null,
        readerId: sample?.reader_id ?? null,
        correlationId: sample?.correlation_id ?? null,
      }
    })

  const isHealthy = offenders.length === 0

  return {
    key: input.key,
    status: isHealthy ? "ok" : "alert",
    severity: isHealthy ? "info" : input.severity,
    title: input.title,
    message: isHealthy ? input.healthyMessage : input.alertMessage,
    details: {
      totalSignals: input.signals.length,
      threshold: input.threshold,
      offenders,
    },
  }
}

function sanitizeObject(value: Record<string, unknown>, depth: number): Record<string, unknown> {
  if (depth > 3) return { truncated: true }

  const output: Record<string, unknown> = {}
  for (const [key, rawValue] of Object.entries(value)) {
    if (SENSITIVE_METADATA_KEY.test(key)) {
      output[key] = "[redacted]"
      continue
    }
    output[key] = sanitizeValue(rawValue, depth + 1)
  }
  return output
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (value === null || value === undefined) return value
  if (typeof value === "string") return value.length > 256 ? `${value.slice(0, 253)}...` : value
  if (typeof value === "number" || typeof value === "boolean") return value
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeValue(item, depth + 1))
  if (typeof value === "object") return sanitizeObject(value as Record<string, unknown>, depth)
  return String(value)
}

function normalizeLatency(value: number | null | undefined) {
  if (value === null || value === undefined) return null
  if (!Number.isFinite(value)) return null
  return Math.max(0, Math.floor(value))
}

function telemetryHashSalt() {
  return process.env.TAPBAND_TELEMETRY_HASH_SALT ?? process.env.TICKET_TOKEN_SECRET ?? "ticketiv"
}
