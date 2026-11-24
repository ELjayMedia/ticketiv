"use client"

import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
import { calculateEventPerformance } from "@/lib/events/performance"
import type { EventLiveStats } from "@/lib/hooks/use-event-live-stats"

type Props = {
  stats: Partial<EventLiveStats> | null
  liveStatus: "idle" | "loading" | "subscribed" | "error"
}

function money(cents: number | null): string {
  if (cents === null) return "—"
  return new Intl.NumberFormat("en-SZ", {
    style: "currency",
    currency: "SZL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

function count(value: number | null): string {
  return value === null ? "—" : value.toLocaleString("en-SZ")
}

function percent(value: number | null): string {
  return value === null ? "—" : value.toFixed(1) + "%"
}

export function EventPerformancePanel({ stats, liveStatus }: Props) {
  const metrics = calculateEventPerformance(stats)
  const cards = [
    { label: "Gross ticket sales", value: money(metrics.grossCents), context: "Before refunds, fees and event expenses" },
    { label: "Tickets sold", value: count(metrics.sold), context: "Recorded sales, not necessarily attendance" },
    { label: "Ticket sell-through", value: percent(metrics.sellThroughPct), context: "Sold ÷ sold plus currently available" },
    { label: "Gross per ticket sold", value: money(metrics.averageGrossTicketCents), context: "Gross sales ÷ tickets sold" },
    { label: "Checked in", value: count(metrics.checkedIn), context: "Recorded admission scans" },
    { label: "Payment success rate", value: percent(metrics.paymentSuccessPct), context: "Successful ÷ successful plus failed payments" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-h2">Event performance</h2>
          <span className="flex items-center gap-1.5 text-[12px] text-ink-3">
            <span className={liveStatus === "subscribed" ? "h-1.5 w-1.5 rounded-full bg-success" : "h-1.5 w-1.5 rounded-full bg-warning"} />
            {liveStatus === "subscribed" ? "Live ticketing data" : liveStatus === "error" ? "Live data unavailable" : "Loading ticketing data"}
          </span>
        </div>
        <p className="mt-1 text-[13px] text-ink-3">
          The commercial and audience indicators below use the existing event-level ticketing records.
        </p>
      </div>

      <section aria-label="Ticketing performance" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardBody className="space-y-2 p-4">
              <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{card.label}</p>
              <p className="break-words font-mono text-[21px] font-semibold tabular-nums text-ink">{card.value}</p>
              <p className="text-[11px] leading-relaxed text-ink-3">{card.context}</p>
            </CardBody>
          </Card>
        ))}
      </section>

      <Card>
        <CardBody className="space-y-3 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-h3">Available ticket inventory</h3>
            <span className="font-mono text-[13px] font-semibold tabular-nums text-ink">
              {count(metrics.sold)} sold / {count(metrics.available)} available
            </span>
          </div>
          <div role="meter" aria-label="Ticket sell-through" aria-valuemin={0} aria-valuemax={100}
            aria-valuenow={metrics.sellThroughPct === null ? undefined : Math.round(metrics.sellThroughPct)}
            className="h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-accent" style={{ width: percent(metrics.sellThroughPct ?? 0) }} />
          </div>
          <p className="text-xs text-ink-3">
            This is based on sold and currently available ticket inventory, not the venue's physical capacity.
            Holds, restricted ticket allocations and complimentary access can affect the figure.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex items-start justify-between gap-3 p-5">
          <div>
            <h3 className="text-h3">Event profit and loss</h3>
            <p className="mt-1 text-[13px] text-ink-3">
              Separate ticketing proceeds from the full commercial result of producing the event.
            </p>
          </div>
          <Icon name="wallet" size={20} className="shrink-0 text-ink-3" />
        </CardBody>
        <CardDivider />
        <CardBody className="space-y-3 p-5">
          {[
            { label: "Gross ticket sales", value: money(metrics.grossCents), source: "Tracked" },
            { label: "Refunds and event-specific fees", value: "—", source: "Not reconciled here" },
            { label: "Sponsorship and other event income", value: "—", source: "Not recorded" },
            { label: "Production and operating costs", value: "—", source: "Not recorded" },
            { label: "Event profit", value: "—", source: "Not yet calculable" },
            { label: "Profit margin / break-even", value: "—", source: "Not yet calculable" },
          ].map((item) => (
            <div key={item.label} className="flex items-start justify-between gap-3 border-b border-line pb-3 last:border-b-0 last:pb-0">
              <div>
                <p className="text-[13px] font-medium text-ink">{item.label}</p>
                <p className="text-[11px] text-ink-3">{item.source}</p>
              </div>
              <p className="whitespace-nowrap font-mono text-[14px] font-semibold tabular-nums">{item.value}</p>
            </div>
          ))}
          <div className="rounded-[var(--radius)] bg-surface-2 p-4 text-[12px] leading-relaxed text-ink-3">
            Profit is intentionally not estimated from ticket revenue alone. A complete event P&amp;L needs budgeted and actual costs,
            sponsorship receipts, other income, fees and refunds. Those organizer accounting inputs are planned for a later release.
          </div>
        </CardBody>
      </Card>

      <p className="text-[12px] leading-relaxed text-ink-3">
        Check-ins are shown as a count rather than a percentage of sold tickets because valid attendance can also come
        from complimentary and guestlist access. Payment success is not the same as checkout conversion.
      </p>
    </div>
  )
}
