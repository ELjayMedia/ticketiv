"use client"

import { useEffect, useState } from "react"
import { Card, CardBody } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
import { formatPrice, type Currency } from "@/lib/format"

type BreakdownRow = {
  id: string
  name: string
  price_cents: number
  currency: string
  quota: number
  sold_confirmed: number
  remaining_confirmed: number
}

function SellThroughBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct))
  const colorClass =
    clamped >= 80 ? "bg-success" : clamped >= 50 ? "bg-warning" : "bg-accent"
  const textClass =
    clamped >= 80 ? "text-success" : clamped >= 50 ? "text-warning" : "text-ink"

  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-14 shrink-0 overflow-hidden rounded-full bg-line">
        <div
          className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className={`font-mono text-[13px] font-semibold tabular-nums ${textClass}`}>
        {clamped.toFixed(0)}%
      </span>
    </div>
  )
}

export function TicketSalesBreakdown({ eventId }: { eventId: string }) {
  const [rows, setRows] = useState<BreakdownRow[] | null>(null)

  useEffect(() => {
    fetch(`/api/events/${eventId}/ticket-types`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setRows(d.tickets ?? []))
      .catch(() => setRows([]))
  }, [eventId])

  if (!rows || rows.length === 0) return null

  return (
    <Card>
      <CardBody className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <Icon name="ticket" size={16} className="text-ink-3" />
          <p className="text-h3">Sales by ticket type</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-[13px]">
            <thead>
              <tr className="border-b border-line">
                <th className="pb-2.5 pr-4 text-left font-mono text-[11px] uppercase tracking-wider text-ink-3">
                  Type
                </th>
                <th className="pb-2.5 pr-4 text-right font-mono text-[11px] uppercase tracking-wider text-ink-3">
                  Price
                </th>
                <th className="pb-2.5 pr-4 text-right font-mono text-[11px] uppercase tracking-wider text-ink-3">
                  Sold / Cap
                </th>
                <th className="pb-2.5 pr-4 text-right font-mono text-[11px] uppercase tracking-wider text-ink-3">
                  Remaining
                </th>
                <th className="pb-2.5 pr-4 text-right font-mono text-[11px] uppercase tracking-wider text-ink-3">
                  Revenue
                </th>
                <th className="pb-2.5 font-mono text-[11px] uppercase tracking-wider text-ink-3">
                  Sell-through
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const sold = row.sold_confirmed ?? 0
                const revenue = sold * (row.price_cents ?? 0)
                const sellPct = (row.quota ?? 0) > 0 ? (sold / row.quota) * 100 : 0

                return (
                  <tr
                    key={row.id}
                    className={i < rows.length - 1 ? "border-b border-line" : ""}
                  >
                    <td className="py-3 pr-4 font-medium text-ink">{row.name}</td>
                    <td className="py-3 pr-4 text-right font-mono tabular-nums text-ink">
                      {formatPrice(row.price_cents, row.currency as Currency)}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono tabular-nums text-ink">
                      {sold.toLocaleString()}
                      <span className="text-ink-3"> / {(row.quota ?? 0).toLocaleString()}</span>
                    </td>
                    <td className="py-3 pr-4 text-right font-mono tabular-nums text-ink">
                      {(row.remaining_confirmed ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono tabular-nums text-ink">
                      {revenue > 0 ? (
                        formatPrice(revenue, row.currency as Currency)
                      ) : (
                        <span className="text-ink-3">—</span>
                      )}
                    </td>
                    <td className="py-3">
                      <SellThroughBar pct={sellPct} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  )
}
