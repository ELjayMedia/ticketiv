"use client"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { useEventLiveStats, type EventLiveStats } from "@/lib/hooks/use-event-live-stats"

interface LiveOrderKpisProps {
  eventId: string
  totalOrdersCount: number
  initialStats: Partial<EventLiveStats> | null
}

export function LiveOrderKpis({ eventId, totalOrdersCount, initialStats }: LiveOrderKpisProps) {
  const { stats, status } = useEventLiveStats(eventId, initialStats)

  const isLive = status === "subscribed"
  const grossSzl = ((stats?.gross_sales_cents ?? 0) / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
  })
  const ticketsSold = (stats?.tickets_sold ?? 0).toLocaleString()
  const checkedIn = (stats?.checked_in_count ?? 0).toLocaleString()
  const checkedInOf = `${checkedIn} / ${ticketsSold}`

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[
        { label: "Total orders", value: totalOrdersCount.toLocaleString() },
        { label: "Gross revenue", value: `SZL ${grossSzl}` },
        { label: "Tickets issued", value: ticketsSold },
        { label: "Checked in", value: checkedInOf },
      ].map(({ label, value }, i) => (
        <Card key={label}>
          <CardBody className="flex flex-col gap-1 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{label}</p>
              {/* Show live dot only on the stats that come from event_live_stats (not total orders) */}
              {isLive && i > 0 && (
                <span className="h-1.5 w-1.5 rounded-full bg-success" title="Live" />
              )}
            </div>
            <p className="font-mono text-[22px] font-semibold tabular-nums text-ink">{value}</p>
          </CardBody>
        </Card>
      ))}
    </div>
  )
}
