import Link from "next/link"
import { notFound } from "next/navigation"

import { Card } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Photo } from "@/components/quiet/ui/primitives"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import type { ArtistRecord } from "@/types"

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
    const { data, error } = await supabase
      .from("artists")
      .select("*")
      .eq("id", params.id)
      .maybeSingle<ArtistRecord>()

    if (!error && data) {
      artist = data
    }
  }

  if (!artist) {
    notFound()
  }

  let tourDates: TourDateEvent[] = []

  if (supabase) {
    const { data: eventRelations } = await supabase
      .from("event_artists")
      .select(`
        display_order,
        events:events (
          id, title, slug,
          event_dates(starts_at),
          venues:venue_id(name)
        )
      `)
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
            city: undefined,
            display_order: relation.display_order || 2,
          }
        })
        .filter(Boolean) as TourDateEvent[]

      tourDates.sort((a, b) => {
        const dateA = new Date(a.starts_at).getTime()
        const dateB = new Date(b.starts_at).getTime()

        if (dateA !== dateB) {
          return dateA - dateB
        }

        return (a.display_order || 2) - (b.display_order || 2)
      })
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <Card className="overflow-hidden">
        <Photo
          src={(artist as any).banner_url || "/placeholder.svg?height=400&width=1200"}
          alt={artist.name}
          height={240}
          overlay="dim"
        />

        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-start sm:px-6 sm:pb-6">
          <div className="-mt-12 h-20 w-20 overflow-hidden rounded-full border-4 border-surface bg-surface sm:-mt-16 sm:h-24 sm:w-24">
            <img
              src={artist.image_url || "/placeholder.svg?height=200&width=200"}
              alt={artist.name}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="flex flex-1 flex-col gap-2 pt-2">
            <h1 className="text-h1 sm:text-[28px]">{artist.name}</h1>

            {artist.bio && (
              <p className="text-[14px] leading-relaxed text-ink-3">
                {artist.bio}
              </p>
            )}
          </div>
        </div>
      </Card>

      <section className="flex flex-col gap-6">
        <h2 className="text-h2">Tour dates</h2>

        {tourDates.length === 0 ? (
          <Card flat className="border-dashed">
            <div className="px-6 py-10 text-center">
              <p className="text-[13px] text-ink-3">
                No scheduled tour dates at the moment. Check back soon.
              </p>
            </div>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {tourDates.map((date) => {
              const eventDate = new Date(date.starts_at)
              const isHeadlining = date.display_order === 1

              return (
                <Link key={date.id} href={`/events/${date.slug}`} className="block">
                  <Card className="transition-colors hover:bg-bg">
                    <div className="flex items-center gap-4 p-4 sm:gap-6 sm:p-5">
                      <div className="flex w-20 flex-shrink-0 flex-col items-start">
                        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                          {eventDate.toLocaleDateString("en-US", { month: "short" })}
                        </span>
                        <span className="font-mono text-[28px] font-semibold tabular-nums text-ink">
                          {eventDate.getDate()}
                        </span>
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <h3 className="truncate text-[16px] font-semibold text-ink">
                          {date.title}
                        </h3>

                        <div className="flex items-center gap-2 text-[13px] text-ink-3">
                          {date.venue_name && <span>{date.venue_name}</span>}
                          {date.city && <span>·</span>}
                          {date.city && <span>{date.city}</span>}
                        </div>

                        {isHeadlining && (
                          <Chip size="sm" variant="accent" className="mt-1 w-fit">
                            Headlining
                          </Chip>
                        )}
                      </div>

                      <span className="hidden shrink-0 items-center gap-1 rounded-[var(--radius)] border border-ink bg-ink px-3 py-1.5 text-[13px] font-semibold text-surface sm:inline-flex">
                        Get tickets
                      </span>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-4 border-t border-line pt-6">
        {(artist as any).website_url && (
          <Link
            href={(artist as any).website_url}
            target="_blank"
            rel="noreferrer"
            className="text-[13px] font-semibold text-ink underline-offset-4 hover:underline"
          >
            Website
          </Link>
        )}

        {(artist as any).twitter && (
          <Link
            href={(artist as any).twitter}
            target="_blank"
            rel="noreferrer"
            className="text-[13px] font-semibold text-ink underline-offset-4 hover:underline"
          >
            Twitter
          </Link>
        )}

        {(artist as any).instagram && (
          <Link
            href={(artist as any).instagram}
            target="_blank"
            rel="noreferrer"
            className="text-[13px] font-semibold text-ink underline-offset-4 hover:underline"
          >
            Instagram
          </Link>
        )}

        {(artist as any).youtube && (
          <Link
            href={(artist as any).youtube}
            target="_blank"
            rel="noreferrer"
            className="text-[13px] font-semibold text-ink underline-offset-4 hover:underline"
          >
            YouTube
          </Link>
        )}
      </div>
    </main>
  )
}
