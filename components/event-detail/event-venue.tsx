import Link from "next/link"
import { MapPin, Navigation } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { EventDetailData } from "@/lib/data/public/event-detail"

interface EventVenueProps {
  venue: EventDetailData["venue"]
}

export function EventVenue({ venue }: EventVenueProps) {
  if (!venue) return null

  const addressParts = [venue.address, venue.city].filter(Boolean)
  const fullAddress = addressParts.join(", ")
  const mapsUrl = fullAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
    : null

  return (
    <section aria-labelledby="venue-heading">
      <h2 id="venue-heading" className="mb-3 font-display text-xl font-bold">
        Venue
      </h2>
      <div className="rounded-xl border border-border/50 bg-card p-4">
        {/* Map placeholder */}
        <div
          className="mb-4 flex h-32 items-center justify-center rounded-lg bg-muted"
          aria-hidden="true"
        >
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <MapPin className="h-6 w-6" />
            <span className="text-xs">Map preview</span>
          </div>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {venue.slug ? (
              <Link
                href={`/venues/${venue.slug}`}
                className="font-semibold text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                {venue.name}
              </Link>
            ) : (
              <p className="font-semibold text-foreground">{venue.name}</p>
            )}
            {fullAddress && (
              <p className="mt-0.5 text-sm text-muted-foreground">{fullAddress}</p>
            )}
            {venue.capacity && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Capacity: {venue.capacity.toLocaleString()}
              </p>
            )}
          </div>
          {mapsUrl && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="shrink-0"
            >
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" aria-label={`Get directions to ${venue.name}`}>
                <Navigation className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Directions
              </a>
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
