import Link from "next/link"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, MapPin } from "lucide-react"
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
    <Card className={past ? "opacity-60" : "transition-colors hover:border-primary/50"}>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" aria-hidden="true" />
            <span>{formatDate(event)}</span>
          </div>
          <h3 className="font-display text-base font-semibold leading-tight">{event.title}</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            <span className="line-clamp-1">{venueLine}</span>
          </div>
          {event.min_price_cents != null && !past && (
            <p className="text-sm font-medium">From {formatCurrency(event.min_price_cents, event.currency)}</p>
          )}
        </div>
        {past ? (
          <span className="text-xs font-medium text-muted-foreground">Past event</span>
        ) : (
          <Button asChild variant="default" size="sm" className="shrink-0">
            <Link href={`/events/${event.slug}`}>Tickets →</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
