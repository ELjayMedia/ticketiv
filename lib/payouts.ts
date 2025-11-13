import { listOrders } from "./orders"

export interface PayoutRow {
  eventId: string
  eventTitle: string
  ticketsSold: number
  grossSales: number
  platformFees: number
  netPayout: number
  lastSaleAt: string | null
}

export interface PayoutSummary {
  rows: PayoutRow[]
  totals: {
    grossSales: number
    platformFees: number
    netPayout: number
    ticketsSold: number
  }
}

export function getPayoutSummary(): PayoutSummary {
  const orders = listOrders()
  const summary: Record<string, PayoutRow> = {}

  for (const order of orders) {
    if (!summary[order.eventId]) {
      summary[order.eventId] = {
        eventId: order.eventId,
        eventTitle: order.eventTitle,
        ticketsSold: 0,
        grossSales: 0,
        platformFees: 0,
        netPayout: 0,
        lastSaleAt: null,
      }
    }

    const row = summary[order.eventId]
    row.ticketsSold += order.quantity
    row.grossSales += order.pricing.total
    row.platformFees += order.pricing.fees
    row.netPayout += order.pricing.total - order.pricing.fees
    row.lastSaleAt = order.createdAt
  }

  const rows = Object.values(summary).sort((a, b) => (b.lastSaleAt ?? "").localeCompare(a.lastSaleAt ?? ""))
  const totals = rows.reduce(
    (acc, row) => {
      acc.grossSales += row.grossSales
      acc.platformFees += row.platformFees
      acc.netPayout += row.netPayout
      acc.ticketsSold += row.ticketsSold
      return acc
    },
    { grossSales: 0, platformFees: 0, netPayout: 0, ticketsSold: 0 },
  )

  return { rows, totals }
}
