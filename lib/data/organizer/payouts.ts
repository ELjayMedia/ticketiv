// Source: payouts + payout_accounts + ledger_entries (org-scoped), plus
// non-sensitive payment provider/routing status for organizer readiness.
// Balance is derived from the ledger: sum(amount_cents) per direction.

import "server-only"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { maskedAccountFromStored } from "@/lib/payout-crypto"

export interface OrgPayoutRow {
  id: string
  amount_cents: number
  currency: string | null
  provider: string | null
  destination_ref: string | null
  status: string
  created_at: string | null
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
  created_at: string | null
}

export interface PaymentProviderStatus {
  provider: string
  is_enabled: boolean | null
  mode: string | null
  callback_url: string | null
  updated_at: string | null
}

export interface PaymentRoutingRuleStatus {
  id: string
  priority: number | null
  country_code: string | null
  currency: string | null
  provider: string
  fallback_provider: string | null
  is_active: boolean | null
  notes: string | null
  updated_at: string | null
}

export interface RecentPaymentAttemptStatus {
  id: string
  provider: string | null
  status: string | null
  created_at: string | null
  order_id: string | null
}

export interface OrgPaymentReadiness {
  currency: string
  activeRoutingRules: PaymentRoutingRuleStatus[]
  enabledProviders: PaymentProviderStatus[]
  recentFailedAttempts: RecentPaymentAttemptStatus[]
}

export interface OrgFinanceSummary {
  grossCents: number
  feesCents: number
  netCents: number
  refundsCents: number
  paidOutCents: number
  pendingPayoutCents: number
  availableCents: number
}

export interface OrgPayoutsOverview {
  orgId: string
  orgName: string
  currency: string
  availableBalanceCents: number
  onHoldCents: number
  lifetimeGrossCents: number
  finance: OrgFinanceSummary
  payouts: OrgPayoutRow[]
  ledger: OrgLedgerEntry[]
  accounts: OrgPayoutAccount[]
  paymentReadiness: OrgPaymentReadiness
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

  const currency = orgRes.data.default_currency ?? "SZL"

  const [routingRes, providersRes, failedAttemptsRes] = await Promise.all([
    supabase
      .from("payment_routing_rules")
      .select("id, priority, country_code, currency, provider, fallback_provider, is_active, notes, updated_at")
      .eq("currency", currency)
      .order("priority", { ascending: true })
      .limit(10),
    supabase
      .from("payment_provider_settings")
      .select("provider, is_enabled, mode, callback_url, updated_at")
      .order("provider", { ascending: true }),
    supabase
      .from("payment_attempts")
      .select("id, provider, status, created_at, order_id, orders!inner(org_id)")
      .eq("orders.org_id", orgId)
      .in("status", ["failed", "error", "declined", "cancelled"])
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  if (routingRes.error) console.error("[payouts] payment_routing_rules:", routingRes.error)
  if (providersRes.error) console.error("[payouts] payment_provider_settings:", providersRes.error)
  if (failedAttemptsRes.error) console.error("[payouts] payment_attempts:", failedAttemptsRes.error)

  const ledger = (ledgerRes.data ?? []) as OrgLedgerEntry[]

  // Balance figures come from the SECURITY DEFINER summary RPC so the
  // dashboard number and the payout-eligibility check share one source of
  // truth (see fn_org_finance_summary). Falls back to zeroes on error.
  const { data: summaryRaw, error: summaryError } = await supabase.rpc("fn_org_finance_summary", {
    p_org_id: orgId,
  })
  if (summaryError) console.error("[payouts] fn_org_finance_summary:", summaryError)

  const summary = (summaryRaw ?? {}) as Record<string, number>
  const finance: OrgFinanceSummary = {
    grossCents: summary.gross_cents ?? 0,
    feesCents: summary.fees_cents ?? 0,
    netCents: summary.net_cents ?? 0,
    refundsCents: summary.refunds_cents ?? 0,
    paidOutCents: summary.paid_out_cents ?? 0,
    pendingPayoutCents: summary.pending_payout_cents ?? 0,
    availableCents: summary.available_cents ?? 0,
  }

  const availableBalanceCents = finance.availableCents
  const onHoldCents = finance.pendingPayoutCents
  const lifetimeGrossCents = finance.grossCents

  const recentFailedAttempts = (failedAttemptsRes.data ?? []).map((row) => ({
    id: row.id,
    provider: row.provider,
    status: row.status,
    created_at: row.created_at,
    order_id: row.order_id,
  })) as RecentPaymentAttemptStatus[]

  return {
    orgId,
    orgName: orgRes.data.name,
    currency,
    availableBalanceCents,
    onHoldCents: Math.max(0, onHoldCents),
    lifetimeGrossCents,
    finance,
    payouts: payoutsRes.data ?? [],
    ledger,
    // Replace the encrypted blob with a masked label server-side so neither
    // ciphertext nor plaintext bank details flow to the mapper/client.
    accounts: (accountsRes.data ?? []).map((a) => ({
      ...a,
      details_encrypted: maskedAccountFromStored(a.details_encrypted),
    })),
    paymentReadiness: {
      currency,
      activeRoutingRules: ((routingRes.data ?? []) as PaymentRoutingRuleStatus[]).filter((rule) => rule.is_active !== false),
      enabledProviders: ((providersRes.data ?? []) as PaymentProviderStatus[]).filter((provider) => provider.is_enabled !== false),
      recentFailedAttempts,
    },
  }
}
