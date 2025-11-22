import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, MapPin, Calendar, Users, Clock, Ticket as TicketIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getEventById } from "@/lib/events"
import { formatCurrency } from "@/lib/pricing"

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

  const primaryDate = event.dates.find((date) => date.is_primary) ?? event.dates[0]
  const categorySlug = event.category ? event.category.toLowerCase().replace(/\s+/g, "-") : null
  const priceLabel =
    event.minimum_price != null ? formatCurrency(event.minimum_price, event.currency) : "Free registration"
  const totalCapacity = event.tickets_available ?? event.venue?.capacity ?? null
  const ticketsSold = event.tickets_sold ?? null
  const availabilityPercentage =
    totalCapacity != null && ticketsSold != null && totalCapacity > 0
      ? Math.min(100, Math.round((ticketsSold / totalCapacity) * 100))
      : null

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/browse" className="mb-4 inline-flex items-center gap-2 text-primary hover:underline">
        <ArrowLeft size={20} />
        Back to events
      </Link>

      <div className="space-y-6">
        <div className="overflow-hidden rounded-lg bg-muted">
          <img
            src={event.banner_image_url || event.cover_image_url || "/placeholder.svg"}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold leading-tight">{event.title}</h1>
            {event.category && (
              <Link href={`/category/${categorySlug}`}>
                <Badge className="bg-primary text-primary-foreground">{event.category}</Badge>
              </Link>
            )}
          </div>
          <div className="text-left sm:text-right">
            <p className="text-2xl font-semibold text-primary">{priceLabel}</p>
            <p className="text-sm text-muted-foreground">per ticket</p>
          </div>
        </div>

        <p className="text-muted-foreground sm:text-lg">{event.full_description ?? event.description}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Event details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <Calendar className="mt-1 h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-semibold">{formatDateRange(primaryDate?.starts_at, primaryDate?.ends_at)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="mt-1 h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Timezone</p>
                  <p className="font-semibold">{primaryDate ? primaryDate.timezone : "TBA"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-1 h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-semibold">{event.location ?? event.venue?.name ?? "TBA"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="mt-1 h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Capacity</p>
                  <p className="font-semibold">
                    {totalCapacity ? `${totalCapacity.toLocaleString()} seats` : "General admission"}
                    {availabilityPercentage != null && <span className="block text-xs text-muted-foreground">{availabilityPercentage}% sold</span>}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {event.ticket_types.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tickets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {event.ticket_types.map((ticket) => (
                  <div key={ticket.id} className="flex items-start justify-between gap-4 rounded-lg border bg-card p-4">
                    <div className="space-y-1">
                      <p className="flex items-center gap-2 font-semibold">
                        <TicketIcon className="h-4 w-4 text-primary" />
                        {ticket.name}
                      </p>
                      {ticket.description && <p className="text-sm text-muted-foreground">{ticket.description}</p>}
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold">{formatCurrency(ticket.price, ticket.currency)}</p>
                      <p className="text-xs text-muted-foreground">{ticket.quantity_remaining} left</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ready to go?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span>From</span>
                <span className="font-semibold text-primary">{priceLabel}</span>
              </div>
              {availabilityPercentage != null && (
                <p className="text-xs text-muted-foreground">{availabilityPercentage}% of seats claimed</p>
              )}
              <Button asChild className="w-full">
                <Link href={`/checkout/${event.id}`}>Get tickets</Link>
              </Button>
              <p className="text-xs text-muted-foreground">Contact the organizer if you need additional details.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
