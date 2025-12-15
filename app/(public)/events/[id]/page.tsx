import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, MapPin, Calendar, MapPinIcon, Wifi, Utensils, ParkingCircle, TicketIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getEventById } from "@/lib/events"
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

export default async function EventDetailPage({ params }: EventDetailPageProps) {
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <Link href="/browse" className="flex items-center gap-2 text-primary hover:underline mb-4 sm:mb-6">
        <ArrowLeft size={20} />
        Back to Events
      </Link>

      <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-6 sm:mb-8">
        <img
          src={event.banner_image_url || event.cover_image_url || "/placeholder.svg"}
          alt={event.title}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex flex-col sm:flex-row items-start justify-between mb-4 gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">{event.title}</h1>
                {event.category && (
                  <Link href={`/category/${categorySlug}`}>
                    <Badge className="bg-primary cursor-pointer hover:opacity-80 transition-opacity">
                      {event.category}
                    </Badge>
                  </Link>
                )}
              </div>
              <div className="text-left sm:text-right">
                <p className="text-2xl sm:text-3xl font-bold text-primary">{priceLabel}</p>
                <p className="text-sm text-muted-foreground">per ticket</p>
              </div>
            </div>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              {event.full_description ?? event.description}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6 flex items-start gap-3">
                <Calendar className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-semibold">{formatDateRange(event.start_date, event.end_date)}</p>
                </div>
              </CardContent>
            </Card>
            {event.start_date && <EventCountdown eventDate={event.start_date} />}
            <Card>
              <CardContent className="pt-6 flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-semibold">{event.location ?? event.venue?.name ?? "TBA"}</p>
                </div>
              </CardContent>
            </Card>
            {event.artists && event.artists.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-3">Featured Artists</p>
                  <div className="flex items-center gap-3">
                    {event.artists.slice(0, 3).map((artist) => (
                      <Link
                        key={artist.id}
                        href={`/artists/${artist.id}`}
                        className="group flex flex-col items-center gap-1.5"
                      >
                        <Avatar className="w-12 h-12 border-2 border-background ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all">
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
                        <p className="text-xs font-medium text-center max-w-[60px] truncate group-hover:text-primary transition-colors">
                          {artist.name}
                        </p>
                      </Link>
                    ))}
                    {event.artists.length > 3 && (
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border-2 border-background">
                          <span className="text-xs font-semibold text-muted-foreground">
                            +{event.artists.length - 3}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">more</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {event.ticket_types.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Ticket Types</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {event.ticket_types.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4"
                  >
                    <div>
                      <p className="font-semibold flex items-center gap-2">
                        <TicketIcon className="h-4 w-4 text-primary" />
                        {ticket.name}
                      </p>
                      {ticket.description && <p className="text-sm text-muted-foreground">{ticket.description}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(ticket.price, ticket.currency)}</p>
                      <p className="text-xs text-muted-foreground">
                        {ticket.quantity_remaining} of {ticket.quantity_total} remaining
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {event.venueDetails && mapEmbedSrc && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-muted rounded-lg overflow-hidden h-64 sm:h-80 lg:h-auto">
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

              <Card>
                <CardHeader>
                  <CardTitle>Venue Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{event.venue.name}</h3>
                    <p className="text-muted-foreground flex items-center gap-2">
                      <MapPinIcon size={16} />
                      {[event.venue.address_line1, event.venue.city, event.venue.country].filter(Boolean).join(", ")}
                    </p>
                  </div>

                  {event.venue.description && (
                    <p className="text-muted-foreground text-sm">{event.venue.description}</p>
                  )}

                  {event.venue.capacity && (
                    <p className="text-sm text-muted-foreground">Capacity: {event.venue.capacity.toLocaleString()}</p>
                  )}

                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Amenities</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(AMENITY_ICONS).map(([key, icon]) => (
                        <Badge key={key} variant="outline" className="flex items-center gap-1">
                          {icon}
                          <span className="capitalize">{key}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Tickets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span>Starting from</span>
                <span className="font-semibold text-primary">{priceLabel}</span>
              </div>
              {availabilityPercentage != null && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Sales progress</span>
                  <span>{availabilityPercentage}%</span>
                </div>
              )}
              {isSoldOut ? (
                <div className="space-y-3 mt-4">
                  <Badge variant="destructive" className="w-full justify-center py-1">
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
                  <Button className="w-full mt-4">Get Tickets</Button>
                </Link>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Need help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Contact the organizer for additional information about this event.
              </p>
              <Button variant="outline" asChild>
                <Link href={`mailto:${event.organizer_id}@ticketiv.com`}>Email organizer</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
