import { NextResponse } from "next/server"

import {
  buildOpsAlertPayload,
  evaluateHealthUrls,
  evaluateOrderStateConsistency,
  evaluatePaymentSuccessRate,
  evaluateProviderSettlement,
  evaluatePayoutIntegrity,
  evaluateStuckAsyncWork,
  evaluateWebhookLag,
  hasAlert,
  postOpsAlert,
  type HealthUrlResult,
  type OpsAlertCheck,
  type ReconciliationCounts,
  type SettlementCounts,
} from "@/lib/ops/health-alerts"
import { APP_URL, getSupabaseAdminConfig } from "@/lib/env"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEFAULT_PAYMENT_WINDOW_MINUTES = 15
const DEFAULT_PAYMENT_MIN_ATTEMPTS = 5
const DEFAULT_PAYMENT_SUCCESS_RATE_MIN = 0.85
const DEFAULT_WEBHOOK_LAG_MINUTES = 5
const DEFAULT_HEALTH_TIMEOUT_MS = 5_000

export async function GET(request: Request) {
  const expectedSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get("authorization")

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const adminConfig = getSupabaseAdminConfig()
  if (!adminConfig) {
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase admin configuration is missing",
        missing: [
          ...(!process.env.NEXT_PUBLIC_SUPABASE_URL ? ["NEXT_PUBLIC_SUPABASE_URL"] : []),
          ...(!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? ["NEXT_PUBLIC_SUPABASE_ANON_KEY"] : []),
          ...(!process.env.SUPABASE_SERVICE_ROLE_KEY ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
        ],
      },
      { status: 500 }
    )
  }

  const now = new Date()
  const paymentWindowMinutes = readPositiveNumber("OPS_ALERT_PAYMENT_WINDOW_MINUTES", DEFAULT_PAYMENT_WINDOW_MINUTES)
  const paymentMinAttempts = readPositiveNumber("OPS_ALERT_PAYMENT_MIN_ATTEMPTS", DEFAULT_PAYMENT_MIN_ATTEMPTS)
  const paymentSuccessRateMin = readRatio("OPS_ALERT_PAYMENT_SUCCESS_RATE_MIN", DEFAULT_PAYMENT_SUCCESS_RATE_MIN)
  const webhookLagMinutes = readPositiveNumber("OPS_ALERT_WEBHOOK_LAG_MINUTES", DEFAULT_WEBHOOK_LAG_MINUTES)
  const healthTimeoutMs = readPositiveNumber("OPS_ALERT_HEALTH_TIMEOUT_MS", DEFAULT_HEALTH_TIMEOUT_MS)

  const paymentSince = new Date(now.getTime() - paymentWindowMinutes * 60_000).toISOString()
  const webhookCutoff = new Date(now.getTime() - webhookLagMinutes * 60_000).toISOString()
  const admin = createAdminClient()

  const [attemptsRes, staleWebhooksRes, healthResults, reconciliationRes, settlementRes] = await Promise.all([
    admin
      .from("payment_attempts")
      .select("status, provider")
      .gte("created_at", paymentSince)
      .limit(1_000),
    admin
      .from("webhooks")
      .select("provider, provider_event_id, received_at")
      .is("processed_at", null)
      .lt("received_at", webhookCutoff)
      .order("received_at", { ascending: true })
      .limit(50),
    checkHealthUrls(readHealthUrls(), healthTimeoutMs),
    // fn_ops_reconciliation_counts is service-role-only and not in the generated
    // RPC types; cast per the repo's untyped-RPC convention.
    (admin.rpc as any)("fn_ops_reconciliation_counts") as Promise<{
      data: ReconciliationCounts | null
      error: { message: string } | null
    }>,
    (admin.rpc as any)("fn_provider_settlement_counts") as Promise<{
      data: SettlementCounts | null
      error: { message: string } | null
    }>,
  ])

  if (attemptsRes.error) {
    return NextResponse.json({ ok: false, error: attemptsRes.error.message }, { status: 500 })
  }
  if (staleWebhooksRes.error) {
    return NextResponse.json({ ok: false, error: staleWebhooksRes.error.message }, { status: 500 })
  }

  const checks = [
    evaluateHealthUrls(healthResults),
    evaluatePaymentSuccessRate(attemptsRes.data ?? [], {
      minAttempts: paymentMinAttempts,
      minSuccessRate: paymentSuccessRateMin,
    }),
    evaluateWebhookLag(staleWebhooksRes.data ?? [], webhookLagMinutes),
    ...reconciliationChecks(reconciliationRes.data, reconciliationRes.error),
    ...settlementChecks(settlementRes.data, settlementRes.error),
  ]

  let alertDelivery: Awaited<ReturnType<typeof postOpsAlert>> | null = null
  if (hasAlert(checks)) {
    alertDelivery = await postOpsAlert(
      process.env.OPS_ALERT_WEBHOOK_URL,
      buildOpsAlertPayload(checks, APP_URL)
    )
  }

  // Housekeeping: prune expired rate-limit windows so public.rate_limits stays
  // small. Best-effort — a gc hiccup must never fail the alert run.
  let rateLimitGcPruned: number | null = null
  try {
    // fn_rate_limit_gc is service-role-only and not in the generated RPC types;
    // cast per the repo's untyped-RPC convention. Empty args = default 1-day TTL.
    const { data } = await (admin.rpc as any)("fn_rate_limit_gc", {})
    rateLimitGcPruned = typeof data === "number" ? data : null
  } catch (error) {
    console.error("[ops-alerts] rate_limit gc failed", error)
  }

  return NextResponse.json({
    ok: !hasAlert(checks),
    checkedAt: now.toISOString(),
    checks,
    alertDelivery,
    rateLimitGcPruned,
  })
}

// Turn the reconciliation-counts RPC result into alert checks. A query failure
// degrades to a single skipped check rather than failing the whole alert run.
function reconciliationChecks(
  counts: ReconciliationCounts | null,
  error: { message: string } | null
): OpsAlertCheck[] {
  if (error || !counts) {
    return [
      {
        key: "reconciliation-counts",
        status: "skipped",
        severity: "info",
        title: "Reconciliation checks skipped",
        message: `fn_ops_reconciliation_counts unavailable${error ? `: ${error.message}` : ""}.`,
        details: { error: error?.message ?? null },
      },
    ]
  }
  return [
    evaluateOrderStateConsistency(counts),
    evaluatePayoutIntegrity(counts),
    evaluateStuckAsyncWork(counts),
  ]
}

// Same degrade-to-skipped contract as reconciliationChecks: a settlement query
// failure must not take down the whole alert run.
function settlementChecks(
  counts: SettlementCounts | null,
  error: { message: string } | null
): OpsAlertCheck[] {
  if (error || !counts) {
    return [
      {
        key: "provider-settlement",
        status: "skipped",
        severity: "info",
        title: "Provider settlement check skipped",
        message: `fn_provider_settlement_counts unavailable${error ? `: ${error.message}` : ""}.`,
        details: { error: error?.message ?? null },
      },
    ]
  }
  return [evaluateProviderSettlement(counts, readPositiveNumber("OPS_ALERT_SETTLEMENT_STALE_HOURS", 48))]
}

async function checkHealthUrls(urls: string[], timeoutMs: number): Promise<HealthUrlResult[]> {
  return Promise.all(
    urls.map(async (url) => {
      const started = Date.now()
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)

      try {
        const response = await fetch(url, {
          cache: "no-store",
          signal: controller.signal,
        })
        return {
          url,
          ok: response.ok,
          status: response.status,
          durationMs: Date.now() - started,
        }
      } catch (error) {
        return {
          url,
          ok: false,
          durationMs: Date.now() - started,
          error: error instanceof Error ? error.message : "Health check failed",
        }
      } finally {
        clearTimeout(timeout)
      }
    })
  )
}

function readHealthUrls() {
  const configured = process.env.OPS_ALERT_HEALTH_URLS
    ?.split(",")
    .map((url) => url.trim())
    .filter(Boolean)

  if (configured?.length) return configured

  const baseUrl = APP_URL.replace(/\/$/, "")
  return [`${baseUrl}/api/health`, `${baseUrl}/api/health/supabase`]
}

function readPositiveNumber(name: string, fallback: number) {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function readRatio(name: string, fallback: number) {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 && value <= 1 ? value : fallback
}
