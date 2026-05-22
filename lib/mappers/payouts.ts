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

export function mapPayouts(o: OrgPayoutsOverview): PayoutsLedgerProps {
  const primary = o.accounts[0]
  const primaryAccountLabel = primary
    ? accountName(primary.provider, primary.details_encrypted)
    : null

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
    orgName: o.orgName,
    currency: o.currency,
    availableBalanceMinor: o.availableBalanceCents,
    onHoldMinor: o.onHoldCents,
    lifetimeGrossMinor: o.lifetimeGrossCents,
    primaryAccountLabel,
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
