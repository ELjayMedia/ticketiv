import { NextResponse } from "next/server"

import { getSupabaseAdminConfig } from "@/lib/env"
import { reconcilePaystackRefund } from "@/lib/payments/paystack-refunds"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BATCH_SIZE = 25

/**
 * Operational fallback for delayed or missing Paystack refund webhooks.
 *
 * Refunds are still driven by provider state: this endpoint only asks Paystack
 * for the current state of rows that Ticketiv already submitted. Finalisation
 * continues through fn_transition_refund, so polling and webhooks share the
 * same idempotent ledger/ticket mutation path.
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
    error?: string
  }> = []

  for (const refund of refunds ?? []) {
    try {
      const result = await reconcilePaystackRefund(refund.id)
      results.push({ refundId: refund.id, ok: true, status: result.status })
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
