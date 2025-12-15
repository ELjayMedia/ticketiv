import Link from "next/link"
import { MapPin, Clock, BadgePercent } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { EventSummary } from "@/types"
import { formatCurrency } from "@/lib/pricing"

interface EventCardProps {
  event: EventSummary
}

function formatDate(date: string | null | undefined) {
  if (!date) return "Date TBA"
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) {
    return date
  }
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function EventCard({ event }: EventCardProps) {
  const priceLabel = event.minimum_price != null ? formatCurrency(event.minimum_price, event.currency) : "Free"
  return (
    <Link href={`/events/${event.id}`}>
      <Card className="group h-full cursor-pointer overflow-hidden transition-all duration-300 hover:border-primary hover:shadow-lg">
        <div className="relative h-64 w-full overflow-hidden">
          <img
            src={event.cover_image_url || "/placeholder.svg?height=256&width=384"}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          {event.category && <Badge className="absolute right-3 top-3 bg-primary">{event.category}</Badge>}
          <div className="absolute inset-0 flex flex-col justify-end p-4 text-white">
            <h3 className="mb-2 line-clamp-2 text-base font-semibold">{event.title}</h3>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {event.location ?? "Location TBA"}
              </span>
              <span className="flex items-center gap-1 font-semibold text-primary">
                <BadgePercent className="h-3 w-3" />
                {priceLabel}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-white/80">
              <Clock className="h-3 w-3" />
              {formatDate(event.starts_at)}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}
