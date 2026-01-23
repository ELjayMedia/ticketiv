import Link from "next/link"
import { notFound } from "next/navigation"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import type { ArtistRecord } from "@/types"
import { getPublicEvents } from "@/lib/data/events"
import { DEMO_ARTISTS } from "@/lib/demo-data"

interface ArtistPageProps {
  params: { id: string }
}

interface TourDateEvent {
  id: string
  title: string
  slug: string
  starts_at: string
  venue_name?: string
  city?: string
  display_order?: number
}

export default async function ArtistPage({ params }: ArtistPageProps) {
  const supabase = createServerSupabaseClient()
  let artist: ArtistRecord | null = null

  if (supabase) {
    const { data, error } = await supabase.from("artists").select("*").eq("id", params.id).maybeSingle<ArtistRecord>()

    if (!error && data) {
      artist = data
    }
  }

  if (!artist) {
    const demoArtist = DEMO_ARTISTS.find((a) => a.id === params.id)
    if (!demoArtist) {
      notFound()
    }

    // Map demo artist to ArtistRecord shape
    artist = {
      id: demoArtist.id,
      name: demoArtist.name,
      role: demoArtist.role || null,
      bio: demoArtist.bio || null,
      avatar_url: demoArtist.avatar_url || null,
      banner_url: null,
      website_url: null,
      twitter: null,
      instagram: null,
      youtube: null,
      created_at: demoArtist.created_at,
      updated_at: demoArtist.created_at,
    }
    console.log("[v0] Using demo artist data for:", params.id)
  }

  let tourDates: TourDateEvent[] = []

  if (supabase) {
    // Fetch artist's events with display_order and dates
    const { data: eventRelations } = await supabase
      .from("event_artists")
      .select(
        `
        display_order,
        events:events (
          id, title, slug, 
          event_dates(starts_at),
          venues:venue_id(name, city)
        )
      `
      )
      .eq("artist_id", params.id)
      .eq("events.visibility", "public")
      .eq("events.status", "published")

    if (eventRelations && eventRelations.length > 0) {
      tourDates = eventRelations
        .map((relation: any) => {
          const event = relation.events
          if (!event) return null

          const eventDate = event.event_dates?.[0]?.starts_at
          return {
            id: event.id,
            title: event.title,
            slug: event.slug,
            starts_at: eventDate || "",
            venue_name: event.venues?.name,
            city: event.venues?.city,
            display_order: relation.display_order || 2,
          }
        })
        .filter(Boolean) as TourDateEvent[]

      // Sort by date ascending (soonest first), then by display_order
      tourDates.sort((a, b) => {
        const dateA = new Date(a.starts_at).getTime()
        const dateB = new Date(b.starts_at).getTime()
        if (dateA !== dateB) return dateA - dateB
        return (a.display_order || 2) - (b.display_order || 2)
      })
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6 sm:space-y-8">
      {/* Artist Header Card */}
      <Card className="overflow-hidden">
        <div className="relative h-48 sm:h-64 bg-muted">
          <img
            src={artist.banner_url || "/placeholder.svg?height=400&width=1200"}
            alt={artist.name}
            className="h-full w-full object-cover"
          />
        </div>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-full border-4 border-background -mt-12 sm:-mt-16">
            <img
              src={artist.avatar_url || "/placeholder.svg?height=200&width=200"}
              alt={artist.name}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex-1 space-y-2 sm:space-y-3">
            <CardTitle className="text-2xl sm:text-3xl">{artist.name}</CardTitle>
            {artist.role && <Badge className="w-fit">{artist.role}</Badge>}
            {artist.bio && <CardDescription className="text-sm sm:text-base">{artist.bio}</CardDescription>}
          </div>
        </CardHeader>
      </Card>

      {/* Tour Dates Section */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold mb-6">Tour Dates</h2>

        {tourDates.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm sm:text-base">No scheduled tour dates at the moment. Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {tourDates.map((date) => {
              const eventDate = new Date(date.starts_at)
              const isHeadlining = date.display_order === 1

              return (
                <Link key={date.id} href={`/events/${date.slug}`}>
                  <div className="flex items-center gap-3 sm:gap-6 p-4 rounded-lg border hover:bg-muted transition-colors cursor-pointer">
                    {/* Left: Date */}
                    <div className="flex-shrink-0 min-w-24">
                      <div className="text-sm font-semibold text-muted-foreground">
                        {eventDate.toLocaleDateString("en-US", { month: "short" })}
                      </div>
                      <div className="text-2xl font-bold">{eventDate.getDate()}</div>
                    </div>

                    {/* Center: Event Title + Venue */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold truncate">{date.title}</h3>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        {date.venue_name && <span>{date.venue_name}</span>}
                        {date.city && <span>•</span>}
                        {date.city && <span>{date.city}</span>}
                      </div>
                      {isHeadlining && (
                        <Badge variant="secondary" className="mt-2 text-xs">
                          Headlining
                        </Badge>
                      )}
                    </div>

                    {/* Right: Get Tickets Button */}
                    <div className="flex-shrink-0">
                      <Button variant="default" size="sm">
                        Get Tickets
                      </Button>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Social Links */}
      <div className="flex flex-wrap gap-3 sm:gap-4 pt-6 border-t">
        {artist.website_url && (
          <Link href={artist.website_url} className="text-primary hover:underline text-sm sm:text-base" target="_blank" rel="noreferrer">
            Website
          </Link>
        )}
        {artist.twitter && (
          <Link href={artist.twitter} className="text-primary hover:underline text-sm sm:text-base" target="_blank" rel="noreferrer">
            Twitter
          </Link>
        )}
        {artist.instagram && (
          <Link href={artist.instagram} className="text-primary hover:underline text-sm sm:text-base" target="_blank" rel="noreferrer">
            Instagram
          </Link>
        )}
        {artist.youtube && (
          <Link href={artist.youtube} className="text-primary hover:underline text-sm sm:text-base" target="_blank" rel="noreferrer">
            YouTube
          </Link>
        )}
      </div>
    </div>
  )
}
