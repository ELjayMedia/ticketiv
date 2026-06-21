"use client"

import type React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MapPin, Heart, CheckCircle2 } from "lucide-react"
import { useState } from "react"
import { toggleFavourite } from "@/app/(consumer)/favourites/actions"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  formatPriceLabel,
  formatVenueLabel,
  formatSoldCount,
  type Currency,
} from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * Standardized EventCard data contract (from v_events_public).
 *
 * All nullable display fields run through the shared `lib/format` helpers
 * so a missing venue / price / sold count never renders as a blank label.
 */
export interface EventCardData {
  id: string
  slug: string
  title: string
  poster_url?: string | null
  starts_at: string
  city?: string | null
  venue_name?: string | null
  min_price_cents?: number | null
  max_price_cents?: number | null
  currency?: string | null
  is_promoted?: boolean
  organizer_name?: string | null
  /** Presence of a logo URL is the verified-organizer signal — matches the
   *  rule used by the event-detail mapper so cards and detail agree. */
  organizer_logo_url?: string | null
  tickets_remaining?: number
  /** Aggregated sold count, surfaced as "1.2k sold" when above the safe
   *  display threshold (5). Below threshold we hide rather than fake
   *  momentum. */
  tickets_sold?: number | null
  /** When set, this card represents a collapsed series and links to /series/[slug] */
  series_slug?: string | null
  /** Number of additional upcoming events under the series (rendered as "+N more dates" badge) */
  series_extra_dates?: number
}

interface EventCardProps {
  event: EventCardData
  onSave?: (eventId: string, saved: boolean) => void
}

const ALLOWED_CURRENCIES: ReadonlySet<Currency> = new Set<Currency>([
  "SZL",
  "ZAR",
  "USD",
  "EUR",
  "GBP",
])

function toCurrency(raw: string | null | undefined): Currency {
  if (raw && ALLOWED_CURRENCIES.has(raw as Currency)) return raw as Currency
  return "SZL"
}

function formatDateShort(date: string) {
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

export function EventCardStandard({ event, onSave }: EventCardProps) {
  const router = useRouter()
  const [isSaved, setIsSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const priceLabel = formatPriceLabel(
    event.min_price_cents,
    toCurrency(event.currency),
    { prefix: "From" }
  )

  // Prefer "Venue, City" when both are present; fall back to whichever side
  // is filled in and only show the calm "Venue to be announced" copy when
  // both are missing.
  const venueLabel =
    event.venue_name && event.city
      ? `${event.venue_name}, ${event.city}`
      : event.venue_name
        ? formatVenueLabel(event.venue_name)
        : event.city
          ? event.city
          : formatVenueLabel(null)

  const soldLabel = formatSoldCount(event.tickets_sold)
  const verified = Boolean(event.organizer_logo_url)

  const showSellingFast = event.tickets_remaining != null && event.tickets_remaining < 20 && event.tickets_remaining > 0
  const hasExtraDates = event.series_extra_dates != null && event.series_extra_dates > 0
  const badgeText = event.is_promoted
    ? "Promoted"
    : hasExtraDates
      ? `+${event.series_extra_dates} more dates`
      : showSellingFast
        ? "Selling fast"
        : null
  const href = event.series_slug ? `/series/${event.series_slug}` : `/events/${event.slug}`

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isSaving) return
    const newSavedState = !isSaved
    setIsSaved(newSavedState)
    setIsSaving(true)
    onSave?.(event.id, newSavedState)
    const result = await toggleFavourite(event.id, newSavedState)
    setIsSaving(false)
    if (!result.ok) {
      setIsSaved(!newSavedState)
      if (result.error === "Not authenticated") {
        router.push("/login?next=/favourites")
      }
    }
  }

  return (
    <>
      {/* Mobile: Row layout */}
      <Link
        href={href}
        className="lg:hidden flex p-4 bg-background hover:bg-accent/50 transition-colors min-h-[96px] rounded-sm items-center gap-3"
      >
        <div className="shrink-0">
          <img
            src={event.poster_url || "/placeholder.svg?height=72&width=72"}
            alt={event.title}
            className="w-[72px] h-[72px] object-cover rounded-xs"
            loading="lazy"
          />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <h3 className="font-semibold text-sm leading-tight line-clamp-2">{event.title}</h3>
          <p className="text-xs text-muted-foreground">
            {formatDateShort(event.starts_at)} • {venueLabel}
          </p>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium">{priceLabel}</span>
            {soldLabel && (
              <span className="font-mono text-[10px] text-muted-foreground">
                · {soldLabel}
              </span>
            )}
          </div>
          {badgeText && (
            <Badge
              variant={event.is_promoted ? "default" : "secondary"}
              className="text-[10px] h-5 px-2 font-semibold"
            >
              {badgeText}
            </Badge>
          )}
          {event.organizer_name && (
            <p className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <span>by {event.organizer_name}</span>
              {verified && (
                <CheckCircle2
                  className="h-3 w-3 text-primary"
                  aria-label="Verified organizer"
                />
              )}
            </p>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className={cn("shrink-0 h-11 w-11 rounded-full hover:bg-accent", isSaved && "text-primary")}
          onClick={handleSaveClick}
          disabled={isSaving}
          aria-label={isSaved ? "Remove from saved" : "Save event"}
        >
          <Heart className={cn("h-5 w-5", isSaved && "fill-current")} />
        </Button>
      </Link>

      {/* Desktop: Card layout */}
      <Link href={href} className="hidden lg:block group">
        <Card className="h-full overflow-hidden rounded-xl border bg-card transition hover:shadow-lg hover:border-primary/50">
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
            <img
              src={event.poster_url || "/placeholder.svg?height=256&width=384"}
              alt={event.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              loading="lazy"
            />

            {badgeText && (
              <Badge
                variant={event.is_promoted ? "default" : "secondary"}
                className="absolute left-3 top-3 bg-background/90 backdrop-blur"
              >
                {badgeText}
              </Badge>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur hover:bg-background"
              onClick={handleSaveClick}
              disabled={isSaving}
              aria-label={isSaved ? "Remove from saved" : "Save event"}
            >
              <Heart className={`h-4 w-4 ${isSaved ? "fill-primary text-primary" : ""}`} />
            </Button>
          </div>

          <div className="p-4 px-2.5 py-6 space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-xs">{formatDateShort(event.starts_at)}</span>
            </div>

            <h3 className="line-clamp-2 font-semibold leading-snug text-foreground text-base">{event.title}</h3>

            {event.organizer_name && (
              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <span>by {event.organizer_name}</span>
                {verified && (
                  <CheckCircle2
                    className="h-3 w-3 text-primary"
                    aria-label="Verified organizer"
                  />
                )}
              </p>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="line-clamp-1 text-xs">{venueLabel}</span>
            </div>

            <div className="flex items-center justify-between pt-1 text-sm">
              <span className="font-medium text-foreground">{priceLabel}</span>
              {soldLabel && (
                <span className="font-mono text-[11px] text-muted-foreground">
                  {soldLabel}
                </span>
              )}
            </div>
          </div>
        </Card>
      </Link>
    </>
  )
}

export default EventCardStandard
