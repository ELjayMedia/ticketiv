/** Derived metrics from Ticketiv's event_live_stats snapshot.
 * These are ticketing indicators, not an event profit-and-loss statement.
 * Missing source values stay null; they must never be displayed as zero.
 */
export type EventPerformanceInput = {
  tickets_sold?: number | null
  tickets_available?: number | null
  gross_sales_cents?: number | null
  successful_payments?: number | null
  failed_payments?: number | null
  checked_in_count?: number | null
}

const nonNegative = (value: number | null | undefined): number | null =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : null

export function calculateEventPerformance(input: EventPerformanceInput | null) {
  const sold = nonNegative(input?.tickets_sold)
  const available = nonNegative(input?.tickets_available)
  const grossCents = nonNegative(input?.gross_sales_cents)
  const successful = nonNegative(input?.successful_payments)
  const failed = nonNegative(input?.failed_payments)
  const checkedIn = nonNegative(input?.checked_in_count)

  // Available is the current sellable inventory, not the venue's physical capacity.
  const inventory = sold !== null && available !== null ? sold + available : null
  const sellThroughPct = inventory !== null && inventory > 0 && sold !== null
    ? Math.min(100, (sold / inventory) * 100)
    : null

  const paymentCount = successful !== null && failed !== null ? successful + failed : null
  const paymentSuccessPct = paymentCount !== null && paymentCount > 0 && successful !== null
    ? (successful / paymentCount) * 100
    : null

  return {
    sold,
    available,
    grossCents,
    checkedIn,
    successful,
    failed,
    inventory,
    sellThroughPct,
    paymentSuccessPct,
    averageGrossTicketCents: sold !== null && sold > 0 && grossCents !== null
      ? Math.round(grossCents / sold)
      : null,
  }
}
