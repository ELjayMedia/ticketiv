import Link from "next/link"
import { DEFAULT_EVENT_TIME_ZONE } from "@ticketiv/shared"
import { notFound } from "next/navigation"

import { Card } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Photo } from "@/components/quiet/ui/primitives"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getFollowSnapshot } from "@/lib/data/public/follows"
import { FollowButton } from "@/components/follows/follow-button"
import { ARTIST_LINK_KEYS, PERFORMER_TYPES } from "@/lib/artists/core"
import type { ArtistRecord } from "@/types"
import { splitArtistTourDates, toArtistTourDate, type ArtistTourDate } from "@/lib/events/artist-tour-dates"

interface ArtistPageProps {
  params: Promise<{ id: string }>
}

export default async function ArtistPage({ params }: ArtistPageProps) {
  const { id } = await params
  const supabase = createServerSupabaseClient()
  let artist: ArtistRecord | null = null

  if (supabase) {
    const { data, error } = await supabase
      .from("artists")
      .select("*")
      .eq("id", id)
      .maybeSingle<ArtistRecord>()

    if (!error && data) {
      artist = data
    }
  }

  if (!artist) {
    notFound()
  }

  let tourDates: ArtistTourDate[] = []

  if (supabase) {
    const { data: eventRelations } = await supabase
      .from("event_artists")
      .select(`
        role,
        events:events (
          id, title, slug, starts_at, ends_at, status, cancelled_at,
          event_dates(starts_at, ends_at),
          venues:venue_id(name)
        )
      `)
      .eq("artist_id", id)
      .eq("events.visibility", "public")
      // Published events plus cancelled ones (kept as history, never transactional).
      .or("status.eq.published,cancelled_at.not.is.null", { referencedTable: "events" })

    if (eventRelations && eventRelations.length > 0) {
      tourDates = eventRelations
        .filter((relation: any) => relation.events)
        // event_artists has no ordering column; headliners sort first.
        .map((relation: any) => toArtistTourDate(relation.events, relation.role === "headliner" ? 1 : 2))
    }
  }

  const { current: currentDates, past: pastDates } = splitArtistTourDates(tourDates)
  const follow = await getFollowSnapshot("artist", artist.id)
  const raw = artist as any
  const isHttps = (v: unknown): v is string => typeof v === "string" && /^https:\/\//i.test(v)
  const profile = {
    verified: raw.verification_status === "verified",
    typeLabel: PERFORMER_TYPES.find(([v]) => v === raw.performer_type)?.[1] ?? null,
    genres: (raw.genres ?? []) as string[],
    links: ARTIST_LINK_KEYS.filter(([k]) => isHttps(raw.links?.[k])).map(([key, label]) => ({ key, label, url: raw.links[key] as string })),
    pressKitUrl: isHttps(raw.press_kit_url) ? raw.press_kit_url : null,
    bookingEmail: (raw.booking_email as string | null) ?? null,
    bookingInfo: (raw.booking_info as string | null) ?? null,
  }

  return (
    <main className="page-frame flex flex-col gap-6 py-8 sm:py-12">
      <Card className="overflow-hidden">
        <Photo
          src={(artist as any).cover_image_url || artist.image_url || "/placeholder.svg?height=400&width=1200"}
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
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-h1 sm:text-[28px]">{artist.name}</h1>
              {profile.verified ? (
                <span className="inline-flex items-center gap-1 rounded bg-success-soft px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-success">
                  Verified artist
                </span>
              ) : null}
            </div>
            {profile.typeLabel || profile.genres.length > 0 ? (
              <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                {[profile.typeLabel, ...profile.genres].filter(Boolean).join(" · ")}
              </p>
            ) : null}

            {artist.bio && (
              <p className="text-[14px] leading-relaxed text-ink-3">
                {artist.bio}
              </p>
            )}
            {profile.links.length > 0 ? (
              <ul className="flex flex-wrap gap-2" aria-label="Links">
                {profile.links.map((l) => (
                  <li key={l.key}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex rounded-full border border-line-2 px-2.5 py-1 text-[12px] font-medium text-ink-2 hover:bg-bg">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            <FollowButton
              kind="artist"
              id={artist.id}
              name={artist.name}
              initialFollowing={follow.following}
              initialCount={follow.followerCount}
              signedIn={follow.signedIn}
              returnTo={`/artists/${id}`}
            />
          </div>
        </div>
      </Card>

      {profile.pressKitUrl || profile.bookingEmail || profile.bookingInfo ? (
        <Card>
          <div className="flex flex-col gap-2 p-5">
            <h2 className="text-h3">Bookings and press</h2>
            {profile.bookingInfo ? <p className="whitespace-pre-line text-[13px] text-ink-2">{profile.bookingInfo}</p> : null}
            <div className="flex flex-wrap gap-3 text-[13px]">
              {profile.bookingEmail ? (
                <a href={`mailto:${profile.bookingEmail}`} className="font-semibold text-accent hover:underline">
                  {profile.bookingEmail}
                </a>
              ) : null}
              {profile.pressKitUrl ? (
                <a href={profile.pressKitUrl} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-accent hover:underline">
                  Press kit
                </a>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}

      <section className="flex flex-col gap-6">
        <h2 className="text-h2">Tour dates</h2>

        {currentDates.length === 0 ? (
          <Card flat className="border-dashed">
            <div className="px-6 py-10 text-center">
              <p className="text-[13px] text-ink-3">
                No scheduled tour dates at the moment. Check back soon.
              </p>
            </div>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {currentDates.map((date) => {
              const eventDate = new Date(date.starts_at)
              const isHeadlining = date.display_order === 1

              return (
                <Link key={date.id} href={`/events/${date.slug}`} className="block">
                  <Card className="transition-colors hover:bg-bg">
                    <div className="flex items-center gap-4 p-4 sm:gap-6 sm:p-5">
                      <div className="flex w-20 flex-shrink-0 flex-col items-start">
                        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                          {eventDate.toLocaleDateString("en-US", { timeZone: DEFAULT_EVENT_TIME_ZONE, month: "short" })}
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

      {pastDates.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-h2">Past appearances</h2>
          <div className="flex flex-col gap-2">
            {pastDates.map((date) => (
              <Link key={date.id} href={`/events/${date.slug}`} className="block">
                <Card className="transition-colors hover:bg-bg">
                  <div className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <h3 className="truncate text-[14px] font-semibold text-ink">{date.title}</h3>
                      <div className="mt-1 font-mono text-[11px] uppercase text-ink-3">
                        {date.lifecycle === "cancelled" ? "Cancelled" : "Past event"}
                      </div>
                    </div>
                    <span className="text-[12px] font-semibold text-ink-3">View →</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

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
