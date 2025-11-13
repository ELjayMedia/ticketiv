import "server-only"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import type { EventRecord, OrderItemRecord, OrderRecord } from "@/types"

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

interface OrderWithRelations extends OrderRecord {
  event?: Pick<EventRecord, "id" | "title"> | null
  order_items?: OrderItemRecord[] | null
}

export async function getPayoutSummary(): Promise<PayoutSummary> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("orders")
    .select(
      `*,
      event:events(id, title),
      order_items:order_items(*)
    `,
    )
    .eq("status", "completed")

  if (error) {
    console.error("Failed to load payout data", error)
    throw new Error("Unable to load payouts")
  }

  const summary = new Map<string, PayoutRow>()

  for (const rawOrder of (data ?? []) as OrderWithRelations[]) {
    const order = rawOrder
    const eventId = order.event_id
    if (!eventId) {
      continue
    }

    const existing = summary.get(eventId) ?? {
      eventId,
      eventTitle: order.event?.title ?? "Untitled Event",
      ticketsSold: 0,
      grossSales: 0,
      platformFees: 0,
      netPayout: 0,
      lastSaleAt: null as string | null,
    }

    const ticketsSold = (order.order_items ?? []).reduce((total, item) => total + (item.quantity ?? 0), 0)
    existing.ticketsSold += ticketsSold
    existing.grossSales += order.total_amount ?? 0
    existing.platformFees += order.fee_amount ?? 0
    existing.netPayout += (order.total_amount ?? 0) - (order.fee_amount ?? 0)
    existing.lastSaleAt = existing.lastSaleAt && existing.lastSaleAt > order.created_at ? existing.lastSaleAt : order.created_at

    summary.set(eventId, existing)
  }

  const rows = Array.from(summary.values()).sort((a, b) => (b.lastSaleAt ?? "").localeCompare(a.lastSaleAt ?? ""))
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
