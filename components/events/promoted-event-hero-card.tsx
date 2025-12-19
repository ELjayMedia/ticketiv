import Link from "next/link"
import { Info, MapPin, Calendar } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { EventSummary } from "@/types"
import { formatCurrency } from "@/lib/pricing"

interface PromotedEventHeroCardProps {
  event: EventSummary
  urgencyBadge?: string
  artist?: {
    name: string
    image_url?: string | null
  }
  tagline?: string
  brandLabel?: string
  ctaText?: string
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

  if (parsed.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow • ${parsed.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZoneName: "short" })}`
  }

  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function PromotedEventHeroCard({
  event,
  urgencyBadge,
  artist,
  tagline,
  brandLabel,
  ctaText = "Get Tickets",
}: PromotedEventHeroCardProps) {
  const priceLabel = event.minimum_price != null ? formatCurrency(event.minimum_price, event.currency) : "Free"

  return (
    <Link href={`/events/${event.id}`} className="block group">
      <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
        {/* Hero Banner Section with Gradient Background */}
        <div className="relative h-56 sm:h-64 w-full overflow-hidden bg-gradient-to-br from-amber-300 via-amber-200 to-orange-200">
          {/* Background Pattern/Image - subtle overlay */}
          {event.cover_image_url && (
            <img
              src={event.cover_image_url || "/placeholder.svg"}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-overlay"
            />
          )}

          {/* Content Wrapper */}
          <div className="relative h-full flex items-center justify-between px-6 py-6 sm:px-8">
            {/* Left: Text Content */}
            <div className="flex-1 space-y-3 max-w-[60%] sm:max-w-[65%]">
              {/* Tagline - inspirational quote */}
              {tagline && (
                <p className="text-xs sm:text-sm italic text-amber-900/80 leading-relaxed max-w-[200px]">{tagline}</p>
              )}

              {/* Brand/Category Label */}
              {brandLabel && (
                <p className="text-xs sm:text-sm font-semibold text-slate-700 tracking-wide uppercase">{brandLabel}</p>
              )}

              {/* Event Title - Large, Bold, Attention-Grabbing */}
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 leading-tight line-clamp-2">
                {event.title}
              </h3>

              {/* Call-to-Action Button */}
              <div className="pt-1">
                <Button
                  size="default"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md rounded-full px-6"
                >
                  {ctaText}
                </Button>
              </div>
            </div>

            {/* Right: Artist/Speaker Portrait */}
            {artist?.image_url && (
              <div className="flex-shrink-0 ml-4 self-end">
                <img
                  src={artist.image_url || "/placeholder.svg"}
                  alt={artist.name}
                  className="h-44 sm:h-52 w-32 sm:w-40 object-cover object-top rounded-tl-3xl shadow-lg"
                />
              </div>
            )}
          </div>
        </div>

        {/* Details Section - Clean White Background */}
        <div className="space-y-3 p-6 bg-card">
          {/* Urgency Badge */}
          {urgencyBadge && (
            <Badge
              variant="secondary"
              className="bg-accent text-accent-foreground hover:bg-accent font-medium rounded-full"
            >
              {urgencyBadge}
            </Badge>
          )}

          {/* Event Summary/Title */}
          <h4 className="text-xl font-bold text-foreground leading-snug">{event.summary || event.title}</h4>

          {/* Date and Location Info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">{formatDate(event.starts_at)}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                <span>{event.location}</span>
              </div>
            )}
          </div>

          {/* Price - Prominent Display */}
          <div className="text-lg font-semibold text-foreground pt-1">{priceLabel}</div>

          {/* Promoted Indicator */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
            <Info className="h-3.5 w-3.5" />
            <span className="font-medium">Promoted Event</span>
          </div>
        </div>
      </Card>
    </Link>
  )
}
