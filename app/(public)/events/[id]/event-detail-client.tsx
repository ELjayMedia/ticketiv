"use client"

import Link from "next/link"
import {
  ArrowLeft,
  MapPin,
  Calendar,
  MapPinIcon,
  Wifi,
  Utensils,
  ParkingCircle,
  TicketIcon,
  Clock,
  Share2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatCurrency } from "@/lib/pricing"
import { EventCountdown } from "@/components/event-countdown"
import type { EventSummary } from "@/types"

const AMENITY_ICONS = {
  wifi: <Wifi size={16} />,
  catering: <Utensils size={16} />,
  parking: <ParkingCircle size={16} />,
}

interface EventDetailClientProps {
  event: EventSummary
}

function formatDateRange(start?: string | null, end?: string | null) {
  if (!start) return "Date TBA"
  const startDate = new Date(start)
  const endDate = end ? new Date(end) : null
  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })
  const startLabel = `${dateFormatter.format(startDate)} • ${timeFormatter.format(startDate)}`
  if (!endDate) return startLabel
  return `${startLabel} - ${timeFormatter.format(endDate)}`
}

export function EventDetailClient({ event }: EventDetailClientProps) {
  const availabilityPercentage = (event.attendees / (event.attendees + event.ticketsAvailable)) * 100
  const categorySlug = event.category.toLowerCase().replace(/\s+/g, "-")
  const mapQuery = event.venueDetails ? `${event.venueDetails.address}, ${event.venueDetails.city}` : ""
  const mapEmbedSrc = mapQuery ? `/api/maps/embed?${new URLSearchParams({ q: mapQuery }).toString()}` : ""
  const priceLabel = formatCurrency(event.price, event.currency)

  const isSoldOut = event.ticketsAvailable === 0 || event.ticket_types?.every((tt) => tt.quantity_remaining === 0)

  return (
    <>
      <style jsx global>{`
        #desktop-shell-bg {
          --page-bg-image: url(${event.banner_image_url || event.cover_image_url || ""});
          opacity: ${event.banner_image_url || event.cover_image_url ? "1" : "0"};
        }
      `}</style>

      {/* Mobile View */}
      <div className="lg:hidden min-h-screen bg-background pb-24">
        {/* Hero Image */}
        <div className="relative aspect-[4/3] bg-muted">
          <img
            src={event.banner_image_url || event.cover_image_url || "/placeholder.svg"}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <Link
            href="/browse"
            className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm rounded-full p-2 hover:bg-background transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background"
          >
            <Share2 className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="px-4 py-6 space-y-6">
          {/* Title & Price */}
          <div>
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1">
                {event.category && <Badge className="bg-primary mb-2">{event.category}</Badge>}
                <h1 className="text-2xl font-bold text-balance">{event.title}</h1>
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-bold text-primary">{priceLabel}</p>
                <p className="text-xs text-muted-foreground">per ticket</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{event.description}</p>
          </div>

          {/* Key Info Cards */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
                <Calendar className="w-5 h-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Date & Time</p>
                  <p className="font-semibold text-sm truncate">{formatDateRange(event.start_date, event.end_date)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
                <MapPin className="w-5 h-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="font-semibold text-sm">{event.location ?? event.venue?.name ?? "TBA"}</p>
                </div>
              </div>
            </div>

            {event.start_date && (
              <div className="p-4 rounded-lg bg-muted">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-primary" />
                  <p className="text-xs text-muted-foreground">Time Until Event</p>
                </div>
                <EventCountdown eventDate={event.start_date} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block">
        <div className="max-w-7xl mx-auto py-12 px-6 space-y-12">
          <div>
            <p className="text-xs font-semibold text-primary mb-4">Event Details</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-balance">{event.title}</h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-3xl">{event.description}</p>
            <div className="grid grid-cols-2 gap-6 max-w-2xl">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Date & Time</p>
                <p className="text-lg font-semibold">{formatDateRange(event.start_date, event.end_date)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Location</p>
                <p className="text-lg font-semibold">{event.location ?? event.venue?.name ?? "TBA"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
