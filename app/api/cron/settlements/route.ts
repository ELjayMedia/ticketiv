import { NextResponse } from "next/server"

import { ingestPaystackSettlements } from "@/lib/payments/paystack-settlements"
import { getSupabaseAdminConfig } from "@/lib/env"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Provider settlement ingestion (operational control #1).
//
// Separate from the 5-minute ops-alerts cron on purpose: settlements land at
// most once a day, and the Paystack settlement API is paginated and rate
// limited, so polling it every 5 minutes would be pure waste. Run this daily —
// the ops-alerts cron reads whatever this has ingested and alerts on both
// mismatches and staleness.
//
// Ingestion is idempotent (see fn_upsert_provider_settlement), so re-running or
// overlapping windows is safe.
export async function GET(request: Request) {
  const expectedSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get("authorization")

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!getSupabaseAdminConfig()) {
    return NextResponse.json(
      { ok: false, error: "Supabase admin configuration is missing" },
      { status: 500 },
    )
  }

  const url = new URL(request.url)
  const lookbackParam = Number(url.searchParams.get("lookbackDays"))
  const lookbackDays = Number.isFinite(lookbackParam) && lookbackParam > 0 ? lookbackParam : undefined

  const result = await ingestPaystackSettlements({ lookbackDays })

  return NextResponse.json(
    { ...result, ranAt: new Date().toISOString() },
    { status: result.ok ? 200 : 500 },
  )
}
