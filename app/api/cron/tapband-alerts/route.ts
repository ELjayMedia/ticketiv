import { NextResponse } from "next/server"

import { APP_URL, getSupabaseAdminConfig } from "@/lib/env"
import { buildOpsAlertPayload, hasAlert, postOpsAlert } from "@/lib/ops/health-alerts"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  evaluateTapBandTelemetrySignals,
  persistTapBandAlertChecks,
  type TapBandTelemetrySignal,
} from "@/lib/tapband/telemetry"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEFAULT_WINDOW_MINUTES = 15

export async function GET(request: Request) {
  const expectedSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get("authorization")

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const adminConfig = getSupabaseAdminConfig()
  if (!adminConfig) {
    return NextResponse.json({ ok: false, error: "Supabase admin configuration is missing" }, { status: 500 })
  }

  const now = new Date()
  const windowMinutes = readPositiveNumber("TAPBAND_ALERT_WINDOW_MINUTES", DEFAULT_WINDOW_MINUTES)
  const since = new Date(now.getTime() - windowMinutes * 60_000).toISOString()
  const admin = createAdminClient()

  const { data, error } = await (admin.from as any)("tapband_telemetry_events")
    .select(
      "event_type, severity, outcome, org_id, event_id, device_id, credential_hash, serial_hash, actor_hash, reader_id, correlation_id, latency_ms, occurred_at",
    )
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: false })
    .limit(2_000)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const checks = evaluateTapBandTelemetrySignals((data ?? []) as TapBandTelemetrySignal[], {
    repeatedAuthFailures: readPositiveNumber("TAPBAND_ALERT_AUTH_FAILURES", 3),
    serialEnumerationFailures: readPositiveNumber("TAPBAND_ALERT_SERIAL_ENUMERATION", 10),
    duplicateAdmissionAttempts: readPositiveNumber("TAPBAND_ALERT_DUPLICATE_ADMISSIONS", 3),
    readerErrors: readPositiveNumber("TAPBAND_ALERT_READER_ERRORS", 5),
  })

  let persistedAlerts: Awaited<ReturnType<typeof persistTapBandAlertChecks>> | null = null
  let alertDelivery: Awaited<ReturnType<typeof postOpsAlert>> | null = null

  if (hasAlert(checks)) {
    persistedAlerts = await persistTapBandAlertChecks(checks)
    alertDelivery = await postOpsAlert(
      process.env.OPS_ALERT_WEBHOOK_URL,
      buildOpsAlertPayload(checks, APP_URL),
    )
  }

  return NextResponse.json({
    ok: !hasAlert(checks),
    checkedAt: now.toISOString(),
    windowMinutes,
    checks,
    persistedAlerts,
    alertDelivery,
  })
}

function readPositiveNumber(name: string, fallback: number) {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? value : fallback
}
