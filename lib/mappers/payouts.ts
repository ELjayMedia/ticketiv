// Shape OrgPayoutsOverview → PayoutsLedger props.

import type { OrgPayoutsOverview } from "@/lib/data/organizer/payouts"
import type { PayoutsLedgerProps } from "@/components/quiet/screens/payouts/payouts-ledger"

const DATE_FMT = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" })

function normalizeStatus(s: string): "paid" | "pending" | "failed" | "processing" {
  const n = s.toLowerCase()
  if (n === "paid" || n === "completed" || n === "succeeded") return "paid"
  if (n === "failed" || n === "rejected") return "failed"
  if (n === "processing" || n === "in_progress") return "processing"
  return "pending"
}

function destinationLabel(provider: string | null, details: string | null): string {
  if (!provider) return details ?? "—"
  const last4 = details ? (details.match(/(\d{4})$/)?.[1] ?? null) : null
  return last4 ? `${provider} ••${last4}` : provider
}

function accountLabel(provider: string, idx: number): string {
  if (idx === 0) return "Primary"
  if (idx === 1) return "Backup"
  return `Account ${idx + 1}`
}

function accountName(provider: string, details: string | null): string {
  const last4 = details ? (details.match(/(\d{4})$/)?.[1] ?? null) : null
  return last4 ? `${provider} ••${last4}` : provider
}

function paymentStatusLabel(hasRouting: boolean, hasProvider: boolean, hasPayoutAccount: boolean): "ready" | "needs_setup" {
  return hasRouting && hasProvider && hasPayoutAccount ? "ready" : "needs_setup"
}

export function mapPayouts(o: OrgPayoutsOverview): PayoutsLedgerProps {
  const primary = o.accounts[0]
  const primaryAccountLabel = primary
    ? accountName(primary.provider, primary.details_encrypted)
    : null

  const hasRouting = o.paymentReadiness.activeRoutingRules.length > 0
  const hasProvider = o.paymentReadiness.enabledProviders.length > 0
  const hasPayoutAccount = o.accounts.length > 0

  // Compute running balance for ledger from newest → oldest using the
  // current available balance as the anchor (Σ amount_cents).
  let running = o.availableBalanceCents
  const ledger = o.ledger.map((entry) => {
    const row = {
      id: entry.id,
      type: entry.type,
      referenceLabel:
        entry.order_id?.slice(0, 8).toUpperCase() ??
        entry.refund_id?.slice(0, 8).toUpperCase() ??
        entry.payout_id?.slice(0, 8).toUpperCase() ??
        "—",
      amountMinor: entry.amount_cents,
      runningBalanceMinor: running,
    }
    running -= entry.amount_cents
    return row
  })

  return {
    orgId: o.orgId,
    orgName: o.orgName,
    currency: o.currency,
    availableBalanceMinor: o.availableBalanceCents,
    onHoldMinor: o.onHoldCents,
    lifetimeGrossMinor: o.lifetimeGrossCents,
    finance: {
      grossMinor: o.finance.grossCents,
      feesMinor: o.finance.feesCents,
      netMinor: o.finance.netCents,
      refundsMinor: o.finance.refundsCents,
      paidOutMinor: o.finance.paidOutCents,
      pendingPayoutMinor: o.finance.pendingPayoutCents,
      availableMinor: o.finance.availableCents,
    },
    primaryAccountLabel,
    paymentReadiness: {
      status: paymentStatusLabel(hasRouting, hasProvider, hasPayoutAccount),
      currency: o.paymentReadiness.currency,
      hasRouting,
      hasProvider,
      hasPayoutAccount,
      primaryProvider: o.paymentReadiness.activeRoutingRules[0]?.provider ?? o.paymentReadiness.enabledProviders[0]?.provider ?? null,
      fallbackProvider: o.paymentReadiness.activeRoutingRules[0]?.fallback_provider ?? null,
      activeRoutes: o.paymentReadiness.activeRoutingRules.map((rule) => ({
        id: rule.id,
        priority: rule.priority ?? 0,
        countryCode: rule.country_code ?? "Any",
        currency: rule.currency ?? o.currency,
        provider: rule.provider,
        fallbackProvider: rule.fallback_provider,
        active: rule.is_active !== false,
      })),
      providers: o.paymentReadiness.enabledProviders.map((provider) => ({
        provider: provider.provider,
        mode: provider.mode ?? "unknown",
        callbackConfigured: Boolean(provider.callback_url),
        updatedAt: provider.updated_at,
      })),
      recentFailedAttempts: o.paymentReadiness.recentFailedAttempts.map((attempt) => ({
        id: attempt.id,
        provider: attempt.provider ?? "unknown",
        status: attempt.status ?? "failed",
        createdAt: attempt.created_at,
        orderRef: attempt.order_id?.slice(0, 8).toUpperCase() ?? "—",
      })),
    },
    payouts: o.payouts.map((row) => ({
      id: row.id,
      dateLabel: DATE_FMT.format(new Date(row.created_at)),
      amountMinor: row.amount_cents,
      destination: destinationLabel(row.provider, row.destination_ref),
      status: normalizeStatus(row.status),
      ref: row.id.slice(0, 8).toUpperCase(),
    })),
    ledger,
    accounts: o.accounts.map((a, i) => ({
      id: a.id,
      label: accountLabel(a.provider, i),
      name: accountName(a.provider, a.details_encrypted),
      sub: null,
      status: "verified" as const,
    })),
  }
}
