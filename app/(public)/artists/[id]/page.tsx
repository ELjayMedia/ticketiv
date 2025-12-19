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

const MOCK_ARTISTS: Record<string, ArtistRecord> = {
  artist_1: {
    id: "artist_1",
    name: "Kabza De Small",
    role: "DJ & Producer",
    bio: "Pioneer of the Amapiano movement, known for creating infectious beats that have defined a generation.",
    avatar_url: "/placeholder.svg?height=200&width=200",
    banner_url: "/placeholder.svg?height=400&width=1200",
    website_url: "https://kabzadesmall.com",
    twitter: "https://twitter.com/kabzadesmall",
    instagram: "https://instagram.com/kabzadesmall",
    youtube: "https://youtube.com/@kabzadesmall",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  artist_2: {
    id: "artist_2",
    name: "Bonang Matheba",
    role: "TV Presenter & Entrepreneur",
    bio: "Award-winning media personality and businesswoman, hosting exclusive lifestyle and entertainment events.",
    avatar_url: "/placeholder.svg?height=200&width=200",
    banner_url: "/placeholder.svg?height=400&width=1200",
    website_url: "https://bonangmatheba.com",
    twitter: "https://twitter.com/bonang_m",
    instagram: "https://instagram.com/bonang_m",
    youtube: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  artist_3: {
    id: "artist_3",
    name: "Sho Madjozi",
    role: "Artist & Performer",
    bio: "Vibrant performer bringing Tsonga culture and contemporary African music to global audiences.",
    avatar_url: "/placeholder.svg?height=200&width=200",
    banner_url: "/placeholder.svg?height=400&width=1200",
    website_url: null,
    twitter: "https://twitter.com/ShoMadjozi",
    instagram: "https://instagram.com/shomadjozi",
    youtube: "https://youtube.com/@ShoMadjozi",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
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
    artist = MOCK_ARTISTS[params.id]
    if (!artist) {
      notFound()
    }
    console.log("[v0] Using mock artist data for:", params.id)
  }

  let relatedEvents = []
  if (supabase) {
    const { data: eventRelations } = await supabase
      .from("event_artists")
      .select("event:events(*)")
      .eq("artist_id", params.id)

    const relatedEventIds = (eventRelations ?? [])
      .map((relation: any) => relation.event?.id)
      .filter(Boolean) as string[]
    const events = await getAllEvents()
    relatedEvents = relatedEventIds.length
      ? events.filter((event) => relatedEventIds.includes(event.id))
      : events.slice(0, 3)
  } else {
    // Use mock events when Supabase not configured
    const events = await getAllEvents()
    relatedEvents = events.slice(0, 3)
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6 sm:space-y-8">
      <Card className="overflow-hidden">
        <div className="relative h-48 sm:h-64 bg-muted">
          <img src={artist.banner_url || "/placeholder.svg"} alt={artist.name} className="h-full w-full object-cover" />
        </div>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-full border-4 border-background -mt-12 sm:-mt-16">
            <img
              src={artist.avatar_url || "/placeholder.svg"}
              alt={artist.name}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl sm:text-3xl">{artist.name}</CardTitle>
            {artist.role && <Badge className="w-fit">{artist.role}</Badge>}
            {artist.bio && <CardDescription className="text-sm sm:text-base">{artist.bio}</CardDescription>}
          </div>
        </CardHeader>
      </Card>

      <div>
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Upcoming Appearances</h2>
        {relatedEvents.length === 0 ? (
          <p className="text-muted-foreground text-sm sm:text-base">
            No scheduled events at the moment. Check back soon!
          </p>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {relatedEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 sm:gap-4">
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
