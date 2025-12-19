import Link from "next/link"
import { MapPin, Clock, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { EventSummary } from "@/types"
import { formatCurrency } from "@/lib/pricing"

interface EventRowProps {
  event: EventSummary
  showActions?: boolean
}

function formatDate(date: string | null | undefined) {
  if (!date) return "Date TBA"
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function EventRow({ event, showActions = false }: EventRowProps) {
  const priceLabel = event.minimum_price != null ? formatCurrency(event.minimum_price, event.currency) : "Free"

  return (
    <div className="flex items-center gap-4 p-4 border-b hover:bg-accent/50 transition-colors">
      <img
        src={event.cover_image_url || "/placeholder.svg?height=80&width=120"}
        alt={event.title}
        className="w-24 h-16 object-cover rounded"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 mb-1">
          <Link href={`/events/${event.id}`} className="font-semibold hover:text-primary truncate">
            {event.title}
          </Link>
          {event.category && (
            <Badge variant="secondary" className="text-xs">
              {event.category}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDate(event.starts_at)}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {event.location || "TBA"}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {event.total_capacity || 0} capacity
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-semibold text-primary">{priceLabel}</p>
        </div>
        {showActions && (
          <Button size="sm" variant="outline" asChild>
            <Link href={`/events/${event.id}`}>View</Link>
          </Button>
        )}
      </div>
    </div>
  )
}
