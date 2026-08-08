export interface PaystackSettlementMoneyInput {
  totalProcessed?: number | null
  totalAmount?: number | null
  totalFees?: number | null
  effectiveAmount?: number | null
}

export interface PaystackSettlementMoney {
  grossCents: number
  feesCents: number
  netCents: number
}

function maybeCents(value: number | null | undefined): number | null {
  if (value == null) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.round(numeric) : null
}

/**
 * Paystack's settlement response uses:
 *   total_processed = buyer gross processed
 *   total_fees      = processor fees
 *   effective_amount (or total_amount) = amount settled to the merchant
 *
 * total_amount is not gross. Treating it as gross makes every fee-bearing
 * batch look internally imbalanced (gross - fees != net).
 */
export function mapPaystackSettlementMoney(
  input: PaystackSettlementMoneyInput,
): PaystackSettlementMoney {
  const feesCents = maybeCents(input.totalFees) ?? 0
  const netCents =
    maybeCents(input.effectiveAmount) ??
    maybeCents(input.totalAmount) ??
    0
  const grossCents = maybeCents(input.totalProcessed) ?? netCents + feesCents

  return { grossCents, feesCents, netCents }
}
