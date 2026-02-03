"use client"

import Link from "next/link"
import { ArrowLeft, MapPin, Calendar, Clock, Share2, Shield, QrCode, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/pricing"
import { EventCountdown } from "@/components/event-countdown"
import type { EventSummary } from "@/types"

interface EventDetailClientProps {
  event: EventSummary
}

function formatDateRange(start?: string | null, end?: string | null) {
  if (!start) return "Date TBA"
  const startDate = new Date(start)
  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })
  return `${dateFormatter.format(startDate)} • ${timeFormatter.format(startDate)}`
}

export function EventDetailClient({ event }: EventDetailClientProps) {
  const isSoldOut = event.ticketsAvailable === 0 || event.ticket_types?.every((tt) => tt.quantity_remaining === 0)
  const priceLabel = event.price ? formatCurrency(event.price, event.currency) : "TBA"

  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section */}
      <div className="relative w-full bg-muted overflow-hidden">
        <img
          src={event.banner_image_url || event.cover_image_url || "/placeholder.svg"}
          alt={event.title}
          className="w-full h-auto aspect-[16/9] object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        {/* Header Buttons */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
          <Link
            href="/browse"
            className="bg-background/80 backdrop-blur-sm rounded-full p-2.5 hover:bg-background transition-colors inline-flex"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="bg-background/80 backdrop-blur-sm rounded-full hover:bg-background"
          >
            <Share2 className="h-5 w-5" />
          </Button>
        </div>

        {/* Content Over Image */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white space-y-4">
          {event.category && (
            <Badge className="bg-primary/90 backdrop-blur w-fit">{event.category}</Badge>
          )}
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-2">{event.title}</h1>
            <p className="text-white/90 text-sm">{event.location || event.venue?.name || "Location TBA"}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Key Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card className="border-0 bg-muted/50">
            <CardContent className="p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="text-xs font-medium">Date</span>
              </div>
              <p className="font-semibold text-sm">
                {event.start_date ? new Date(event.start_date).toLocaleDateString() : "TBA"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-muted/50">
            <CardContent className="p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-medium">Time</span>
              </div>
              <p className="font-semibold text-sm">
                {event.start_date ? new Date(event.start_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "TBA"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-muted/50">
            <CardContent className="p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="text-xs font-medium">Status</span>
              </div>
              <p className="font-semibold text-sm">{isSoldOut ? "Sold Out" : "Selling"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Performers */}
        {event.performers && event.performers.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-bold text-lg">Artists & Performers</h2>
            <div className="space-y-2">
              {event.performers.map((performer, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>{performer}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <div className="space-y-3">
            <h2 className="font-bold text-lg">About This Event</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{event.description}</p>
          </div>
        )}

        {/* Ticket Selection */}
        {!isSoldOut && event.ticket_types && event.ticket_types.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-bold text-lg">Select Ticket</h2>
            <div className="space-y-3">
              {event.ticket_types.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/events/${event.id}/checkout?ticket_type_id=${ticket.id}`}
                  className="block"
                >
                  <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer border-border/50">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="space-y-1 flex-1">
                        <h3 className="font-semibold text-foreground">{ticket.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {ticket.quantity_remaining} available
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-primary">
                          {formatCurrency(ticket.price, event.currency)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Trust Indicators */}
        <div className="grid grid-cols-2 gap-4 py-6 border-y border-border/40">
          <div className="flex flex-col items-center text-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-xs font-medium">Secure Payment</span>
          </div>
          <div className="flex flex-col items-center text-center gap-2">
            <QrCode className="h-6 w-6 text-primary" />
            <span className="text-xs font-medium">Instant QR Ticket</span>
          </div>
        </div>

        {/* Primary CTA */}
        {!isSoldOut && event.ticket_types && event.ticket_types.length > 0 ? (
          <Button size="lg" className="w-full h-12 text-base font-semibold rounded-lg" asChild>
            <Link href={`/events/${event.id}/checkout`}>
              Buy Ticket Now
            </Link>
          </Button>
        ) : (
          <Button size="lg" disabled className="w-full h-12 text-base font-semibold rounded-lg">
            Sold Out
          </Button>
        )}
      </div>
    </div>
  )
}
