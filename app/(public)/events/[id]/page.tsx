import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, MapPin, Calendar, Users, Clock, MapPinIcon, Wifi, Utensils, ParkingCircle, Ticket as TicketIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getEventById } from "@/lib/events"
import { formatCurrency } from "@/lib/pricing"

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/browse" className="flex items-center gap-2 text-primary hover:underline mb-6">
        <ArrowLeft size={20} />
        Back to Events
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
            <img src={event.banner_image_url || event.cover_image_url || "/placeholder.svg"} alt={event.title} className="w-full h-full object-cover" />
          </div>

          <div>
            <div className="flex items-start justify-between mb-4 gap-4">
              <div>
                <h1 className="text-4xl font-bold mb-2">{event.title}</h1>
                {event.category && (
                  <Link href={`/category/${categorySlug}`}>
                    <Badge className="bg-primary cursor-pointer hover:opacity-80 transition-opacity">{event.category}</Badge>
                  </Link>
                )}
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-primary">{priceLabel}</p>
                <p className="text-sm text-muted-foreground">per ticket</p>
              </div>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed">{event.full_description ?? event.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6 flex items-start gap-3">
                <Calendar className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-semibold">{formatDateRange(primaryDate?.starts_at, primaryDate?.ends_at)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Timezone</p>
                  <p className="font-semibold">{primaryDate ? primaryDate.timezone : "TBA"}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-semibold">{event.location ?? event.venue?.name ?? "TBA"}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-start gap-3">
                <Users className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Capacity</p>
                  <p className="font-semibold">
                    {totalCapacity ? `${totalCapacity.toLocaleString()} seats` : "General Admission"}
                    {availabilityPercentage != null && <span className="block text-xs text-muted-foreground">{availabilityPercentage}% sold</span>}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {event.ticket_types.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Ticket Types</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {event.ticket_types.map((ticket) => (
                  <div key={ticket.id} className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-muted rounded-lg overflow-hidden h-80 md:h-auto">
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

                  {event.venue.description && <p className="text-muted-foreground text-sm">{event.venue.description}</p>}

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

        <div className="space-y-6">
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
              <Link href={`/checkout/${event.id}`}>
                <Button className="w-full mt-4">Get Tickets</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Need help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">Contact the organizer for additional information about this event.</p>
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
