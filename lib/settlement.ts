export const DEFAULT_SETTLEMENT_HOLD_DAYS = 4

export interface SettlementLedgerEntry {
  type: string | null
  amountCents: number
  occurredAt: string | Date | null
}

export interface SettlementPayout {
  amountCents: number
  status: string | null
}

export interface SettlementSummary {
  grossCents: number
  feesCents: number
  netCents: number
  refundsCents: number
  committedPayoutCents: number
  pendingPayoutCents: number
  paidOutCents: number
  capturedAvailableCents: number
  settledNetCents: number
  settledAvailableCents: number
  pendingSettlementCents: number
  settlementHoldDays: number
  settlementCutoffIso: string
}

function asDate(value: string | Date | null): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function buildSettlementSummary({
  ledgerEntries,
  payouts,
  now = new Date(),
  settlementHoldDays = DEFAULT_SETTLEMENT_HOLD_DAYS,
}: {
  ledgerEntries: SettlementLedgerEntry[]
  payouts: SettlementPayout[]
  now?: Date
  settlementHoldDays?: number
}): SettlementSummary {
  const cutoff = new Date(now.getTime() - settlementHoldDays * 24 * 60 * 60 * 1000)

  let grossCents = 0
  let feesCents = 0
  let netCents = 0
  let refundsCents = 0
  let settledNetCents = 0

  for (const entry of ledgerEntries) {
    const amount = entry.amountCents

    if (entry.type === "order_gross") grossCents += amount
    if (entry.type === "fee") feesCents += Math.abs(amount)
    if (entry.type === "payment_net") {
      netCents += amount
      const occurredAt = asDate(entry.occurredAt)
      if (occurredAt && occurredAt <= cutoff) settledNetCents += amount
    }
    if (entry.type === "refund") refundsCents += amount
  }

  let committedPayoutCents = 0
  let pendingPayoutCents = 0
  let paidOutCents = 0

  for (const payout of payouts) {
    const amount = payout.amountCents
    if (payout.status === "requested" || payout.status === "processing" || payout.status === "paid") {
      committedPayoutCents += amount
    }
    if (payout.status === "requested" || payout.status === "processing") pendingPayoutCents += amount
    if (payout.status === "paid") paidOutCents += amount
  }

  const capturedAvailableCents = Math.max(0, netCents - refundsCents - committedPayoutCents)
  const settledAvailableCents = Math.max(0, settledNetCents - refundsCents - committedPayoutCents)
  const pendingSettlementCents = Math.max(0, capturedAvailableCents - settledAvailableCents)

  return {
    grossCents,
    feesCents,
    netCents,
    refundsCents,
    committedPayoutCents,
    pendingPayoutCents,
    paidOutCents,
    capturedAvailableCents,
    settledNetCents,
    settledAvailableCents,
    pendingSettlementCents,
    settlementHoldDays,
    settlementCutoffIso: cutoff.toISOString(),
  }
}
