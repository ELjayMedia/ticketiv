import Link from "next/link"
import { notFound } from "next/navigation"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EventCard } from "@/components/events/event-card"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import type { ArtistRecord } from "@/types"
import { getAllEvents } from "@/lib/events"

interface ArtistPageProps {
  params: { id: string }
}

export default async function ArtistPage({ params }: ArtistPageProps) {
  const supabase = createServerSupabaseClient()
  const { data: artist, error } = await supabase.from("artists").select("*").eq("id", params.id).maybeSingle<ArtistRecord>()

  if (error || !artist) {
    notFound()
  }

  const { data: eventRelations } = await supabase
    .from("event_artists")
    .select("event:events(*)")
    .eq("artist_id", params.id)

  const relatedEventIds = (eventRelations ?? [])
    .map((relation: any) => relation.event?.id)
    .filter(Boolean) as string[]

  const events = await getAllEvents()
  const relatedEvents = relatedEventIds.length
    ? events.filter((event) => relatedEventIds.includes(event.id))
    : events.slice(0, 3)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <Card className="overflow-hidden">
        <div className="relative h-64 bg-muted">
          <img
            src={artist.banner_url || "/placeholder.svg"}
            alt={artist.name}
            className="h-full w-full object-cover"
          />
        </div>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-background -mt-16">
            <img src={artist.avatar_url || "/placeholder.svg"} alt={artist.name} className="h-full w-full object-cover" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl">{artist.name}</CardTitle>
            {artist.role && <Badge className="w-fit">{artist.role}</Badge>}
            {artist.bio && <CardDescription>{artist.bio}</CardDescription>}
          </div>
        </CardHeader>
      </Card>

      <div>
        <h2 className="text-2xl font-bold mb-4">Upcoming Appearances</h2>
        {relatedEvents.length === 0 ? (
          <p className="text-muted-foreground">No scheduled events at the moment. Check back soon!</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-4">
        {artist.website_url && (
          <Link href={artist.website_url} className="text-primary hover:underline" target="_blank" rel="noreferrer">
            Website
          </Link>
        )}
        {artist.twitter && (
          <Link href={artist.twitter} className="text-primary hover:underline" target="_blank" rel="noreferrer">
            Twitter
          </Link>
        )}
        {artist.instagram && (
          <Link href={artist.instagram} className="text-primary hover:underline" target="_blank" rel="noreferrer">
            Instagram
          </Link>
        )}
        {artist.youtube && (
          <Link href={artist.youtube} className="text-primary hover:underline" target="_blank" rel="noreferrer">
            YouTube
          </Link>
        )}
      </div>
    </div>
  )
}
