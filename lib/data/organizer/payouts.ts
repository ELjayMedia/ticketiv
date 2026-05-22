// Source: payouts + payout_accounts + ledger_entries (org-scoped).
// Balance is derived from the ledger: sum(amount_cents) per direction.

import "server-only"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface OrgPayoutRow {
  id: string
  amount_cents: number
  currency: string | null
  provider: string | null
  destination_ref: string | null
  status: string
  created_at: string
  paid_at: string | null
}

export interface OrgLedgerEntry {
  id: string
  type: string
  amount_cents: number
  currency: string | null
  occurred_at: string
  order_id: string | null
  payment_id: string | null
  refund_id: string | null
  payout_id: string | null
  meta: unknown
}

export interface OrgPayoutAccount {
  id: string
  provider: string
  details_encrypted: string | null
  created_at: string
}

export interface OrgPayoutsOverview {
  orgName: string
  currency: string
  availableBalanceCents: number
  onHoldCents: number
  lifetimeGrossCents: number
  payouts: OrgPayoutRow[]
  ledger: OrgLedgerEntry[]
  accounts: OrgPayoutAccount[]
}

export async function getOrgPayoutsOverview(orgId: string): Promise<OrgPayoutsOverview | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  const [orgRes, payoutsRes, ledgerRes, accountsRes] = await Promise.all([
    supabase
      .from("organizations")
      .select("name, default_currency")
      .eq("id", orgId)
      .maybeSingle(),
    supabase
      .from("payouts")
      .select("id, amount_cents, currency, provider, destination_ref, status, created_at, paid_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("ledger_entries")
      .select("id, type, amount_cents, currency, occurred_at, order_id, payment_id, refund_id, payout_id, meta")
      .eq("org_id", orgId)
      .order("occurred_at", { ascending: false })
      .limit(100),
    supabase
      .from("payout_accounts")
      .select("id, provider, details_encrypted, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: true }),
  ])

  if (!orgRes.data) return null

  const ledger = (ledgerRes.data ?? []) as OrgLedgerEntry[]
  let availableBalanceCents = 0
  let onHoldCents = 0
  let lifetimeGrossCents = 0

  for (const e of ledger) {
    const amt = e.amount_cents ?? 0
    availableBalanceCents += amt
    if (e.type === "order_gross") {
      lifetimeGrossCents += amt
      if (e.payout_id === null) onHoldCents += amt
    }
  }

  return {
    orgName: orgRes.data.name,
    currency: orgRes.data.default_currency ?? "SZL",
    availableBalanceCents,
    onHoldCents: Math.max(0, onHoldCents),
    lifetimeGrossCents,
    payouts: payoutsRes.data ?? [],
    ledger,
    accounts: accountsRes.data ?? [],
  }
}
