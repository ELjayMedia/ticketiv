"use client"

import type React from "react"

import { useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MOCK_EVENTS } from "@/lib/mock-data"
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  Clock,
  AlertCircle,
  MapPinIcon,
  Wifi,
  Utensils,
  ParkingCircle,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  WiFi: <Wifi size={16} />,
  Catering: <Utensils size={16} />,
  Parking: <ParkingCircle size={16} />,
}

export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string

  const event = useMemo(() => {
    return MOCK_EVENTS.find((e) => e.id === eventId)
  }, [eventId])

  if (!event) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-primary hover:underline mb-6">
          <ArrowLeft size={20} />
          Back
        </button>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground text-lg">Event not found</p>
          <Button onClick={() => router.push("/browse")} className="mt-4">
            Browse Events
          </Button>
        </div>
      </div>
    )
  }

  const availabilityPercentage = (event.attendees / (event.attendees + event.ticketsAvailable)) * 100
  const categorySlug = event.category.toLowerCase().replace(/\s+/g, "-")

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <button onClick={() => router.back()} className="flex items-center gap-2 text-primary hover:underline mb-6">
        <ArrowLeft size={20} />
        Back to Events
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero Image */}
          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
            <img src={event.image || "/placeholder.svg"} alt={event.title} className="w-full h-full object-cover" />
          </div>

          {/* Event Info */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold mb-2">{event.title}</h1>
                <Link href={`/category/${categorySlug}`}>
                  <Badge className="bg-primary cursor-pointer hover:opacity-80 transition-opacity">
                    {event.category}
                  </Badge>
                </Link>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-primary">${event.price}</p>
                <p className="text-sm text-muted-foreground">per ticket</p>
              </div>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed">{event.fullDescription}</p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6 flex items-start gap-3">
                <Calendar className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-semibold">{event.date}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-semibold">
                    {event.time} - {event.endTime}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-semibold">{event.location}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-start gap-3">
                <Users className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Attending</p>
                  <p className="font-semibold">{event.attendees.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {event.artists && event.artists.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Featured Speakers & Artists</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {event.artists.map((artist) => (
                    <Link key={artist.id} href={`/artists/${artist.id}`}>
                      <div className="flex gap-4 cursor-pointer group">
                        <img
                          src={artist.image || "/placeholder.svg"}
                          alt={artist.name}
                          className="w-20 h-20 rounded-lg object-cover shrink-0 group-hover:opacity-80 transition-opacity"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold group-hover:text-primary transition-colors">{artist.name}</h3>
                          <p className="text-sm text-primary font-medium mb-1">{artist.role}</p>
                          {artist.description && <p className="text-sm text-muted-foreground">{artist.description}</p>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {event.venueDetails && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Map Visualization */}
              <div className="bg-muted rounded-lg overflow-hidden h-80 md:h-auto">
                <iframe
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyB41DFb05-BlusSH4BI2-5dNN3HSm0ZeIw&q=${encodeURIComponent(
                    `${event.venueDetails.address}, ${event.venueDetails.city}`,
                  )}`}
                />
              </div>

              {/* Venue Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Venue Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{event.venueDetails.name}</h3>
                    <p className="text-muted-foreground flex items-center gap-2">
                      <MapPinIcon size={16} />
                      {event.venueDetails.address}, {event.venueDetails.city}
                    </p>
                  </div>

                  {event.venueDetails.description && (
                    <p className="text-muted-foreground text-sm">{event.venueDetails.description}</p>
                  )}

                  <div>
                    <p className="text-sm font-medium mb-2">Capacity: {event.venueDetails.capacity.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">
                      Occupancy: {Math.round((event.attendees / event.venueDetails.capacity) * 100)}%
                    </p>
                  </div>

                  {event.venueDetails.amenities && event.venueDetails.amenities.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Amenities</p>
                      <div className="flex flex-wrap gap-2">
                        {event.venueDetails.amenities.map((amenity) => (
                          <Badge key={amenity} variant="secondary" className="gap-1">
                            {AMENITY_ICONS[amenity] || <MapPinIcon size={14} />}
                            {amenity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="text-2xl">${event.price}</CardTitle>
              <p className="text-sm text-muted-foreground">per ticket</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Availability */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Available</span>
                  <span className="font-semibold">{event.ticketsAvailable} left</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(availabilityPercentage, 100)}%` }}
                  />
                </div>
              </div>

              {event.ticketsAvailable < 50 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Only {event.ticketsAvailable} tickets left! Book now.</AlertDescription>
                </Alert>
              )}

              <Button onClick={() => router.push(`/checkout/${event.id}`)} className="w-full h-12 text-base">
                Get Tickets
              </Button>
              <p className="text-xs text-muted-foreground text-center pt-2">Secure checkout · No hidden fees</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
