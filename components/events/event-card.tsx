import Link from "next/link"
import { MapPin, Clock, BadgePercent } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { MOCK_EVENTS } from "@/lib/mock-data"

interface EventCardProps {
  event: (typeof MOCK_EVENTS)[number]
}

export function EventCard({ event }: EventCardProps) {
  return (
    <Link href={`/events/${event.id}`}>
      <Card className="group h-full cursor-pointer overflow-hidden transition-all duration-300 hover:border-primary hover:shadow-lg">
        <div className="relative h-64 w-full overflow-hidden">
          <img
            src={event.image || "/placeholder.svg"}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <Badge className="absolute right-3 top-3 bg-primary">{event.category}</Badge>
          <div className="absolute inset-0 flex flex-col justify-end p-4 text-white">
            <h3 className="mb-2 line-clamp-2 text-base font-semibold">{event.title}</h3>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {event.location}
              </span>
              <span className="flex items-center gap-1 font-semibold text-primary">
                <BadgePercent className="h-3 w-3" />${event.price}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-white/80">
              <Clock className="h-3 w-3" />
              {event.date}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}
