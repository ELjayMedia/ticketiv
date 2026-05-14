"use client"

import type React from "react"

import Link from "next/link"
import { MapPin, Heart } from "lucide-react"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { EventSummary } from "@/types"
import { formatCurrency } from "@/lib/pricing"
import { cn } from "@/lib/utils"

interface EventCardProps {
  event: EventSummary & {
    organizer_name?: string | null
    is_promoted?: boolean
    tickets_remaining?: number
  }
  categoryLabel?: string | null
}

function formatDateShort(date: string | null | undefined) {
  if (!date) return "Date TBA"
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return "Date TBA"

  return (
    d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    }) +
    " · " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  )
}

export function EventCard({ event, categoryLabel }: EventCardProps) {
  const [isSaved, setIsSaved] = useState(false)
  const priceLabel = event.minimum_price != null ? `From ${formatCurrency(event.minimum_price, event.currency)}` : "Free"

  const showSellingFast = event.tickets_remaining != null && event.tickets_remaining < 20 && event.tickets_remaining > 0
  const badgeText = event.is_promoted ? "Promoted" : showSellingFast ? "Selling fast" : null
  const eventCategoryLabel = categoryLabel || event.category || null

  const handleSaveClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsSaved(!isSaved)
  }

  return (
    <>
      <Link
        href={`/events/${event.id}`}
        className="lg:hidden flex p-4 bg-background hover:bg-accent/50 transition-colors min-h-[96px] rounded-sm shadow-none border-b-0 py-px items-center gap-3 px-[0]"
      >
        <div className="shrink-0">
          <img
            src={event.cover_image_url || "/placeholder.svg?height=72&width=72"}
            alt={event.title}
            className="w-[72px] h-[72px] object-cover rounded-xs"
            loading="lazy"
          />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-1">
            {eventCategoryLabel && (
              <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-medium">
                {eventCategoryLabel}
              </Badge>
            )}
            {badgeText && (
              <Badge variant={event.is_promoted ? "default" : "secondary"} className="h-5 px-1.5 text-[10px] font-semibold">
                {badgeText}
              </Badge>
            )}
          </div>

          <h3 className="font-semibold text-sm leading-tight line-clamp-2">{event.title}</h3>

          <p className="text-xs text-muted-foreground">
            {formatDateShort(event.starts_at)} • {event.location || "TBA"}
          </p>

          <p className="text-xs font-medium">{priceLabel}</p>

          {event.organizer_name && <p className="text-[10px] text-muted-foreground">by {event.organizer_name}</p>}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className={cn("shrink-0 h-11 w-11 rounded-full hover:bg-accent", isSaved && "text-primary")}
          onClick={handleSaveClick}
          aria-label={isSaved ? "Remove from saved" : "Save event"}
        >
          <Heart className={cn("h-5 w-5", isSaved && "fill-current")} />
        </Button>
      </Link>

      <Link href={`/events/${event.id}`} className="hidden lg:block group rounded-xs shadow-none border-none border-0 bg-[rgba(255,255,255,0)] text-[rgba(255,255,255,0)]">
        <Card className="h-full overflow-hidden rounded-xl border bg-card transition hover:shadow-lg hover:border-primary/50">
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
            <img
              src={event.cover_image_url || "/placeholder.svg?height=256&width=384"}
              alt={event.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              loading="lazy"
            />

            <div className="absolute left-3 top-3 flex flex-wrap gap-2">
              {eventCategoryLabel && (
                <Badge variant="outline" className="bg-background/90 backdrop-blur">
                  {eventCategoryLabel}
                </Badge>
              )}
              {badgeText && (
                <Badge variant={event.is_promoted ? "default" : "secondary"} className="bg-background/90 backdrop-blur">
                  {badgeText}
                </Badge>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur hover:bg-background"
              onClick={handleSaveClick}
              aria-label={isSaved ? "Remove from saved" : "Save event"}
            >
              <Heart className={`h-4 w-4 ${isSaved ? "fill-primary text-primary" : ""}`} />
            </Button>
          </div>

          <div className="p-4 leading-4 px-2.5 py-6 shadow-none border-none space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-xs">{formatDateShort(event.starts_at)}</span>
            </div>

            <h3 className="line-clamp-2 font-semibold leading-snug text-foreground text-base">{event.title}</h3>

            {event.organizer_name && <p className="text-xs text-muted-foreground">by {event.organizer_name}</p>}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="line-clamp-1 text-xs">{event.location ?? "Location TBA"}</span>
            </div>

            <div className="pt-1 font-medium text-foreground text-sm">{priceLabel}</div>
          </div>
        </Card>
      </Link>
    </>
  )
}
