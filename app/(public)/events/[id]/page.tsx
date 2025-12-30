"use client"

import Link from "next/link"
import { notFound } from "next/navigation"
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
import { getEventById } from "@/lib/data/events"
import { formatCurrency } from "@/lib/pricing"
import { EventCountdown } from "@/components/event-countdown"

const AMENITY_ICONS = {
  wifi: <Wifi size={16} />,
  catering: <Utensils size={16} />,
  parking: <ParkingCircle size={16} />,
}

interface EventDetailPageProps {
  params: { id: string }
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

export default async function EventPage({ params }: { params: { id: string } }) {
  const event = await getEventById(params.id)

  if (!event) {
    notFound()
  }

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

          {/* Artists */}
          {event.artists && event.artists.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold">Featured Artists</h2>
              <div className="flex items-center gap-4 overflow-x-auto pb-2">
                {event.artists.map((artist) => (
                  <Link
                    key={artist.id}
                    href={`/artists/${artist.id}`}
                    className="flex flex-col items-center gap-2 shrink-0"
                  >
                    <Avatar className="w-16 h-16 border-2 border-background ring-2 ring-primary/10">
                      <AvatarImage src={artist.image_url || artist.avatar_url} alt={artist.name} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {artist.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-xs font-medium text-center max-w-[70px] line-clamp-2">{artist.name}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {event.full_description && (
            <div className="space-y-2">
              <h2 className="font-semibold">About This Event</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{event.full_description}</p>
            </div>
          )}

          {/* Ticket Types */}
          {event.ticket_types.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold">Ticket Types</h2>
              {event.ticket_types.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between gap-4 p-4 rounded-lg border">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm flex items-center gap-2">
                      <TicketIcon className="h-4 w-4 text-primary shrink-0" />
                      <span className="truncate">{ticket.name}</span>
                    </p>
                    {ticket.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ticket.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-sm">{formatCurrency(ticket.price, ticket.currency)}</p>
                    <p className="text-xs text-muted-foreground">{ticket.quantity_remaining} left</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Map & Venue */}
          {event.venueDetails && mapEmbedSrc && (
            <div className="space-y-3">
              <h2 className="font-semibold">Venue</h2>
              <div className="rounded-lg overflow-hidden h-48 bg-muted">
                <iframe
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={mapEmbedSrc}
                />
              </div>
              <div className="p-4 rounded-lg border space-y-2">
                <h3 className="font-semibold">{event.venue.name}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <MapPinIcon className="w-4 h-4 shrink-0" />
                  {[event.venue.address_line1, event.venue.city, event.venue.country].filter(Boolean).join(", ")}
                </p>
                {event.venue.description && (
                  <p className="text-xs text-muted-foreground pt-2 border-t">{event.venue.description}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Fixed Bottom CTA */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
          {isSoldOut ? (
            <Button className="w-full bg-transparent" variant="outline" asChild>
              <Link href={`/events/${event.id}/waitlist`}>Join Waitlist</Link>
            </Button>
          ) : (
            <Button className="w-full" size="lg" asChild>
              <Link href={`/checkout/${event.id}`}>Get Tickets • {priceLabel}</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block">
        <div className="max-w-[1200px] mx-auto px-6 py-10">
          <Link href="/browse" className="inline-flex items-center gap-2 text-primary hover:underline mb-8 text-sm">
            <ArrowLeft size={18} />
            Back to Events
          </Link>

          <div className="aspect-[2/1] bg-muted rounded-xl overflow-hidden mb-10 shadow-lg">
            <img
              src={event.banner_image_url || event.cover_image_url || "/placeholder.svg"}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content - 2 columns of 3 */}
            <div className="lg:col-span-2 space-y-8">
              {/* Header Section */}
              <div>
                <div className="flex items-start justify-between mb-4 gap-4">
                  <div className="flex-1">
                    <h1 className="text-4xl font-bold mb-3 text-balance">{event.title}</h1>
                    {event.category && (
                      <Link href={`/category/${event.category.toLowerCase().replace(/\s+/g, "-")}`}>
                        <Badge className="bg-primary cursor-pointer hover:opacity-80 transition-opacity">
                          {event.category}
                        </Badge>
                      </Link>
                    )}
                  </div>
                  <Button variant="outline" size="icon" className="shrink-0 bg-transparent">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-muted-foreground leading-relaxed text-base">
                  {event.full_description || event.description || "No description available."}
                </p>
              </div>

              {/* Info Cards - 3 columns with improved spacing */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="border-muted">
                  <CardContent className="pt-6 flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Date & Time</p>
                      <p className="font-semibold text-sm leading-tight">
                        {formatDateRange(event.start_date, event.end_date)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-muted">
                  <CardContent className="pt-6 flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Location</p>
                      <p className="font-semibold text-sm leading-tight">
                        {event.location ?? event.venue?.name ?? "TBA"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {event.start_date && <EventCountdown eventDate={event.start_date} />}
              </div>

              {/* Artists Section */}
              {event.artists && event.artists.length > 0 && (
                <Card className="border-muted">
                  <CardHeader>
                    <CardTitle className="text-xl">Featured Artists</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6 flex-wrap">
                      {event.artists.slice(0, 6).map((artist) => (
                        <Link
                          key={artist.id}
                          href={`/artists/${artist.id}`}
                          className="group flex flex-col items-center gap-2"
                        >
                          <Avatar className="w-20 h-20 border-2 border-background ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all">
                            <AvatarImage src={artist.image_url || artist.avatar_url} alt={artist.name} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                              {artist.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <p className="text-sm font-medium text-center max-w-[90px] truncate group-hover:text-primary transition-colors">
                            {artist.name}
                          </p>
                        </Link>
                      ))}
                      {event.artists.length > 6 && (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-background">
                            <span className="text-base font-semibold text-muted-foreground">
                              +{event.artists.length - 6}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">more</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Ticket Types */}
              {event.ticket_types.length > 0 && (
                <Card className="border-muted">
                  <CardHeader>
                    <CardTitle className="text-xl">Ticket Types</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {event.ticket_types.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="flex items-center justify-between gap-4 border border-muted bg-card p-5 rounded-lg hover:border-primary/30 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-semibold flex items-center gap-2 mb-1">
                            <TicketIcon className="h-4 w-4 text-primary" />
                            {ticket.name}
                          </p>
                          {ticket.description && <p className="text-sm text-muted-foreground">{ticket.description}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-lg">{formatCurrency(ticket.price, ticket.currency)}</p>
                          <p className="text-xs text-muted-foreground">
                            {ticket.quantity_remaining} of {ticket.quantity_total} left
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Venue Details */}
              {event.venueDetails && (
                <Card className="border-muted">
                  <CardHeader>
                    <CardTitle className="text-xl">Venue Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">{event.venue.name}</h3>
                      <p className="text-muted-foreground flex items-center gap-2 text-sm">
                        <MapPinIcon size={16} className="shrink-0" />
                        {[event.venue.address_line1, event.venue.city, event.venue.country].filter(Boolean).join(", ")}
                      </p>
                    </div>

                    {mapEmbedSrc && (
                      <div className="bg-muted rounded-lg overflow-hidden h-72 shadow-sm">
                        <iframe
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          loading="lazy"
                          allowFullScreen
                          referrerPolicy="no-referrer-when-downgrade"
                          src={mapEmbedSrc}
                        />
                      </div>
                    )}

                    {event.venue.description && (
                      <p className="text-muted-foreground text-sm leading-relaxed">{event.venue.description}</p>
                    )}

                    {event.venue.capacity && (
                      <p className="text-sm text-muted-foreground font-medium">
                        Capacity: {event.venue.capacity.toLocaleString()}
                      </p>
                    )}

                    <div className="space-y-3 pt-2 border-t">
                      <h4 className="font-semibold text-sm">Amenities</h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(AMENITY_ICONS).map(([key, icon]) => (
                          <Badge key={key} variant="outline" className="flex items-center gap-1.5 px-3 py-1.5">
                            {icon}
                            <span className="capitalize text-xs">{key}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar - 1 column of 3 with sticky positioning */}
            <div className="lg:col-span-1">
              <div className="sticky top-28 space-y-5">
                <Card className="border-muted shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Tickets</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-muted-foreground">Starting from</span>
                      <span className="font-bold text-primary text-2xl">{priceLabel}</span>
                    </div>
                    {availabilityPercentage != null && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                        <span>Sales progress</span>
                        <span className="font-medium">{availabilityPercentage}%</span>
                      </div>
                    )}
                    {isSoldOut ? (
                      <div className="space-y-3 mt-4">
                        <Badge variant="destructive" className="w-full justify-center py-2">
                          Sold Out
                        </Badge>
                        <Button className="w-full bg-transparent" variant="outline" asChild>
                          <Link href={`/events/${event.id}/waitlist`}>Join Waitlist</Link>
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                          Get notified when tickets become available
                        </p>
                      </div>
                    ) : (
                      <Link href={`/checkout/${event.id}`}>
                        <Button className="w-full mt-2" size="lg">
                          Get Tickets
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-muted">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Need help?</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Contact the organizer for additional information about this event.
                    </p>
                    <Button variant="outline" className="w-full bg-transparent" asChild>
                      <Link href={`mailto:${event.organizer_id}@ticketiv.com`}>Email organizer</Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
