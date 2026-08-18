import { NextResponse } from "next/server"

import { getSupabaseAdminConfig } from "@/lib/env"
import { reconcileRefund } from "@/lib/payments/refunds"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BATCH_SIZE = 25

/**
 * Operational fallback for delayed or missing provider refund webhooks.
 *
 * Refunds are driven by provider state through the provider-neutral dispatcher.
 * Automated adapters can poll their provider; manual adapters are never sent to
 * the wrong processor. Finalisation remains behind the provider-specific path.
 */
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

  const admin = createAdminClient()
  const { data: refunds, error } = await admin
    .from("refunds")
    .select("id")
    .eq("status", "processing")
    .not("provider_ref", "is", null)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE)

  if (error) {
    return NextResponse.json(
      { ok: false, error: `Unable to load processing refunds: ${error.message}` },
      { status: 500 },
    )
  }

  const results: Array<{
    refundId: string
    ok: boolean
    status?: string
    provider?: string
    mode?: string
    error?: string
  }> = []

  for (const refund of refunds ?? []) {
    try {
      const result = await reconcileRefund(refund.id)
      results.push({
        refundId: refund.id,
        ok: true,
        status: result.status,
        provider: result.provider,
        mode: result.mode,
      })
    } catch (cause) {
      results.push({
        refundId: refund.id,
        ok: false,
        error: cause instanceof Error ? cause.message : "Unknown reconciliation error",
      })
    }
  }

  const failures = results.filter((result) => !result.ok)
  return NextResponse.json(
    {
      ok: failures.length === 0,
      checked: results.length,
      failed: failures.length,
      results,
      ranAt: new Date().toISOString(),
    },
    { status: failures.length === 0 ? 200 : 500 },
  )
}
