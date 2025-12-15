import Link from "next/link"
import { Info } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { EventSummary } from "@/types"
import { formatCurrency } from "@/lib/pricing"

interface EventCardEnhancedProps {
  event: EventSummary
  promoted?: boolean
  urgencyBadge?: string
  artist?: {
    name: string
    image_url?: string | null
  }
  tagline?: string
  brandLabel?: string
}

function formatDate(date: string | null | undefined) {
  if (!date) return "Date TBA"
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) {
    return date
  }

  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)

  // Check if it's tomorrow
  if (parsed.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow • ${parsed.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZoneName: "short" })}`
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function EventCardEnhanced({
  event,
  promoted = false,
  urgencyBadge,
  artist,
  tagline,
  brandLabel,
}: EventCardEnhancedProps) {
  const priceLabel = event.minimum_price != null ? formatCurrency(event.minimum_price, event.currency) : "Free"

  return (
    <Link href={`/events/${event.id}`}>
      <Card className="group h-full overflow-hidden transition-all duration-300 hover:shadow-xl border-0">
        <div className="relative h-52 w-full overflow-hidden bg-gradient-to-r from-amber-300/80 via-yellow-200/70 to-slate-300/60">
          {/* Subtle background pattern */}
          {event.cover_image_url && (
            <img
              src={event.cover_image_url || "/placeholder.svg"}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-10 mix-blend-overlay"
            />
          )}

          {/* Content Container */}
          <div className="relative h-full flex items-center justify-between px-6 py-5">
            {/* Left Content with quote */}
            <div className="flex-1 space-y-2.5 max-w-[65%]">
              {/* Inspirational Quote - smaller, italic text */}
              {tagline && <p className="text-xs italic text-amber-800/90 leading-relaxed max-w-[180px]">{tagline}</p>}

              {/* Brand/Subtitle Label */}
              {brandLabel && <p className="text-xs font-medium text-slate-700 tracking-wide">{brandLabel}</p>}

              {/* Main Title - Large and Bold */}
              <h3 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight line-clamp-2">
                {event.title}
              </h3>

              {/* CTA Button inside banner */}
              <div className="pt-2">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-md rounded-full px-5">
                  Join a free online class
                </Button>
              </div>
            </div>

            {/* Right: Instructor/Artist Portrait Image */}
            {artist?.image_url && (
              <div className="flex-shrink-0 ml-3 self-end">
                <img
                  src={artist.image_url || "/placeholder.svg"}
                  alt={artist.name}
                  className="h-48 w-36 object-cover object-top rounded-tl-[3rem]"
                />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2 p-5 bg-white">
          {/* Urgency Badge - rounded pill */}
          {urgencyBadge && (
            <Badge
              variant="secondary"
              className="bg-violet-100 text-violet-900 hover:bg-violet-100 font-medium rounded-full px-3 py-1"
            >
              {urgencyBadge}
            </Badge>
          )}

          {/* Event Title for details section - bold */}
          <h4 className="text-xl font-bold text-slate-900 leading-snug">{event.summary || event.title}</h4>

          {/* Date/Time - clear separator */}
          <div className="text-sm font-medium text-slate-700">{formatDate(event.starts_at)}</div>

          {/* Price - prominent */}
          <div className="text-lg font-semibold text-slate-900 pt-1">{priceLabel}</div>

          {/* Promoted Label - subtle and muted */}
          {promoted && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-1">
              <span className="font-medium">Promoted</span>
              <Info className="h-3.5 w-3.5" />
            </div>
          )}
        </div>
      </Card>
    </Link>
  )
}
