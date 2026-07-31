import "server-only"

// Provider settlement ingestion (operational control #1).
//
// Pulls what Paystack says it settled and stores it alongside — never merged
// into — our own money tables, so the two can be compared. The comparison
// itself lives in SQL (fn_provider_settlement_counts); this module only fetches
// and records, which keeps the "what does the provider claim" boundary sharp.
//
// Amounts: Paystack reports in the smallest currency unit (cents), which is the
// same unit our `_cents` columns use, so values map across without conversion.

import { requirePaystackSecretKey } from "@/lib/payments/paystack-config"
import { createAdminClient } from "@/lib/supabase/admin"

const PAYSTACK_API = "https://api.paystack.co"
const DEFAULT_LOOKBACK_DAYS = 14
const PER_PAGE = 50
/** Safety rail: never walk more than this many pages in one run. */
const MAX_PAGES = 20

interface PaystackSettlement {
  id: number | string
  status?: string | null
  currency?: string | null
  total_amount?: number | null
  total_fees?: number | null
  effective_amount?: number | null
  settlement_date?: string | null
  createdAt?: string | null
}

interface PaystackSettlementTxn {
  reference?: string | null
  amount?: number | null
  fees?: number | null
}

export interface SettlementIngestResult {
  ok: boolean
  settlements: number
  items: number
  unmatched: number
  skipped?: string
  error?: string
}

async function paystackGet<T>(path: string, secretKey: string): Promise<T> {
  const res = await fetch(`${PAYSTACK_API}${path}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
    cache: "no-store",
  })
  const json = (await res.json().catch(() => ({}))) as { status?: boolean; data?: T; message?: string }
  if (!res.ok || json.status === false) {
    throw new Error(json.message ?? `Paystack ${path} failed with HTTP ${res.status}`)
  }
  return (json.data ?? []) as T
}

function toCents(value: number | null | undefined): number {
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(n) : 0
}

/**
 * Fetch recent settlements (and the transactions inside them) and upsert them.
 *
 * Idempotent end to end: fn_upsert_provider_settlement keys on
 * (provider, ext_settlement_id) and (settlement_id, ext_payment_id), so an
 * overlapping date window or a retried run updates in place instead of
 * duplicating. That makes a generous default lookback the safe choice — it
 * self-heals a missed day rather than leaving a permanent hole.
 */
export async function ingestPaystackSettlements(options?: {
  lookbackDays?: number
}): Promise<SettlementIngestResult> {
  let secretKey: string
  try {
    secretKey = await requirePaystackSecretKey()
  } catch {
    // Not configured (or live mode disallowed here) — a no-op, not a failure.
    return { ok: true, settlements: 0, items: 0, unmatched: 0, skipped: "paystack not configured" }
  }

  const lookbackDays = Math.max(1, options?.lookbackDays ?? DEFAULT_LOOKBACK_DAYS)
  const from = new Date(Date.now() - lookbackDays * 86_400_000).toISOString().slice(0, 10)
  const to = new Date().toISOString().slice(0, 10)

  const admin = createAdminClient()
  let settlements = 0
  let items = 0
  let unmatched = 0

  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const batch = await paystackGet<PaystackSettlement[]>(
        `/settlement?from=${from}&to=${to}&perPage=${PER_PAGE}&page=${page}`,
        secretKey,
      )
      if (!Array.isArray(batch) || batch.length === 0) break

      for (const s of batch) {
        const extId = String(s.id)
        // Transactions are a separate call per settlement; a failure here must
        // not lose the batch itself, so record the settlement with no items.
        let txns: PaystackSettlementTxn[] = []
        try {
          txns = await paystackGet<PaystackSettlementTxn[]>(
            `/settlement/${encodeURIComponent(extId)}/transactions?perPage=${PER_PAGE}`,
            secretKey,
          )
        } catch (error) {
          console.error("[settlements] transactions fetch failed", extId, error)
        }

        const itemPayload = (Array.isArray(txns) ? txns : [])
          .filter((t) => t?.reference)
          .map((t) => ({
            extPaymentId: String(t.reference),
            amountCents: toCents(t.amount),
            feeCents: toCents(t.fees),
          }))

        const { data, error } = await (admin.rpc as any)("fn_upsert_provider_settlement", {
          p_provider: "paystack",
          p_ext_settlement_id: extId,
          p_status: s.status ?? null,
          p_currency: s.currency ?? null,
          p_gross_cents: toCents(s.total_amount),
          p_fees_cents: toCents(s.total_fees),
          p_net_cents: toCents(s.effective_amount),
          p_settled_at: s.settlement_date ?? s.createdAt ?? null,
          p_payload: s as unknown as Record<string, unknown>,
          p_items: itemPayload,
        })

        if (error) {
          console.error("[settlements] upsert failed", extId, error)
          continue
        }
        settlements += 1
        items += Number(data?.items ?? 0)
        unmatched += Number(data?.unmatched_items ?? 0)
      }

      if (batch.length < PER_PAGE) break
    }

    return { ok: true, settlements, items, unmatched }
  } catch (error) {
    return {
      ok: false,
      settlements,
      items,
      unmatched,
      error: error instanceof Error ? error.message : "settlement ingest failed",
    }
  }
}
