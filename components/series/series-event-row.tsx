import Link from "next/link"
import { format } from "date-fns"

import { Card } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
import { cn } from "@/lib/cn"
import { formatCurrency } from "@/lib/pricing"
import { formatMultiDayPill } from "@/lib/series/date-range"
import type { SeriesDetailEvent } from "@/lib/data/public/series"

interface SeriesEventRowProps {
  event: SeriesDetailEvent
  past?: boolean
}

function formatDate(event: SeriesDetailEvent): string {
  if (event.event_format === "multi_day" && event.starts_at && event.ends_at) {
    return formatMultiDayPill(event.starts_at, event.ends_at)
  }
  if (!event.starts_at) return "Date TBA"
  try {
    return format(new Date(event.starts_at), "EEE d MMM yyyy · HH:mm")
  } catch {
    return "Date TBA"
  }
}

export function SeriesEventRow({ event, past = false }: SeriesEventRowProps) {
  const venueLine = event.venue?.name && event.venue.city
    ? `${event.venue.name}, ${event.venue.city}`
    : event.venue?.name ?? event.city ?? "Location TBA"

  return (
    <Card className={cn(past ? "opacity-60" : "transition-colors hover:border-line-2")}>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-3">
            <Icon name="cal" size={12} />
            <span>{formatDate(event)}</span>
          </div>
          <h3 className="text-[16px] font-semibold leading-tight text-ink">{event.title}</h3>
          <div className="flex items-center gap-1.5 text-[12px] text-ink-3">
            <Icon name="pin" size={12} />
            <span className="line-clamp-1">{venueLine}</span>
          </div>
          {event.min_price_cents != null && !past && (
            <p className="text-[13px] font-semibold text-ink">
              From {formatCurrency(event.min_price_cents, event.currency)}
            </p>
          )}
        </div>
        {past ? (
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-3">
            Past event
          </span>
        ) : (
          <Link
            href={`/events/${event.slug}`}
            className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-[var(--radius)] border border-ink bg-ink px-3 py-1.5 text-[13px] font-semibold text-surface transition-colors hover:bg-ink-2"
          >
            Tickets <Icon name="arrowR" size={12} />
          </Link>
        )}
      </div>
    </Card>
  )
}
