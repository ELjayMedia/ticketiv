import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { Card } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"
import { Photo } from "@/components/quiet/ui/primitives"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getFollowSnapshot } from "@/lib/data/public/follows"
import { FollowButton } from "@/components/follows/follow-button"
import { ARTIST_LINK_KEYS, PERFORMER_TYPES } from "@/lib/artists/core"
import { BookingRequestForm } from "@/components/artists/booking-request-form"
import { submitArtistBookingAction } from "@/lib/artists/booking-actions"
import { getOrgUpcomingEvents } from "@/lib/artists/bookings-data"
import { getMyManagedOrgs } from "@/lib/venues/marketplace-data"
import { ExpandableText } from "@/components/quiet/screens/event-detail/expandable-text"
import type { ArtistRecord } from "@/types"
import {
  artistHref,
  groupTourDatesByMonth,
  isArtistId,
  splitArtistTourDates,
  toArtistTourDate,
  tourCities,
  tourDateParts,
  type ArtistTourDate,
} from "@/lib/events/artist-tour-dates"

interface ArtistPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ city?: string }>
}

export default async function ArtistPage({ params, searchParams }: ArtistPageProps) {
  const { id: rawId } = await params
  const id = decodeURIComponent(rawId)
  const { city: cityParam } = await searchParams
  const supabase = createServerSupabaseClient()
  let artist: ArtistRecord | null = null

  // The URL segment is the profile id or its slug (lineup links use the slug).
  if (supabase) {
    const query = supabase.from("artists").select("*")
    const { data, error } = await (isArtistId(id) ? query.eq("id", id) : query.eq("slug", id.toLowerCase())).maybeSingle<ArtistRecord>()
    if (!error && data) artist = data
  }

  if (!artist) {
    // TICK-353: a profile merged into another keeps its old URL working.
    if (supabase) {
      const { data: moved } = await (supabase as any)
        .from("artist_redirects")
        .select("artist_id")
        .or(`old_id.eq.${isArtistId(id) ? id : "00000000-0000-0000-0000-000000000000"},old_slug.eq.${id.replace(/[^a-z0-9-]/gi, "")}`)
        .maybeSingle()
      if (moved?.artist_id) redirect(`/artists/${moved.artist_id}`)
    }
    notFound()
  }

  const selfHref = artistHref(artist as { id: string; slug?: string | null })
  let tourDates: ArtistTourDate[] = []

  if (supabase) {
    const { data: eventRelations } = await supabase
      .from("event_artists")
      .select(`
        role,
        events:events (
          id, title, slug, starts_at, ends_at, status, cancelled_at,
          event_dates(starts_at, ends_at),
          venues:venue_id(name, slug, city, tz)
        )
      `)
      .eq("artist_id", artist.id)
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
  const cities = tourCities(currentDates)
  const activeCity = cityParam && cities.includes(cityParam) ? cityParam : null
  const shownDates = activeCity ? currentDates.filter((d) => d.city === activeCity) : currentDates
  const monthGroups = groupTourDatesByMonth(shownDates)

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

  // TICK-461: claimed artists take booking requests from organisation managers.
  const claimed = Boolean((artist as { primary_user_id?: string | null }).primary_user_id)
  const managedOrgs = claimed ? await getMyManagedOrgs() : []
  const orgEvents = (
    await Promise.all(managedOrgs.map(async (o) => (await getOrgUpcomingEvents(o.id)).map((e) => ({ id: e.id, orgId: o.id, title: e.title }))))
  ).flat()
  const bookingPanel = claimed ? (
    <Card>
      <div className="flex flex-col gap-3 p-5">
        <h2 className="text-h3">Request a booking</h2>
        {managedOrgs.length > 0 ? (
          <BookingRequestForm artistId={artist.id} orgs={managedOrgs} events={orgEvents} action={submitArtistBookingAction} />
        ) : (
          <p className="text-[13px] text-ink-3">
            Organisers can send {artist.name} a booking request here.{" "}
            <Link href={`/login?from=${selfHref}`} className="font-semibold text-accent hover:underline">
              Sign in
            </Link>{" "}
            with an organiser account to send one.
          </p>
        )}
      </div>
    </Card>
  ) : null

  const upcomingLabel =
    currentDates.length === 0 ? "No upcoming dates" : `${currentDates.length} upcoming date${currentDates.length === 1 ? "" : "s"}`

  return (
    <main className="flex flex-col pb-12">
      {/* Hero: cover, name, genres, follow. */}
      <section className="relative">
        <Photo
          src={raw.cover_image_url || artist.image_url || "/placeholder.svg?height=400&width=1200"}
          alt={artist.name}
          height={300}
          overlay="dim"
        />
        <div className="page-frame absolute inset-x-0 bottom-0 flex items-end gap-4 pb-6 sm:gap-6">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-surface bg-surface sm:h-28 sm:w-28">
            <img src={artist.image_url || "/placeholder.svg?height=200&width=200"} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-white">
            {profile.typeLabel || profile.genres.length > 0 ? (
              <p className="font-mono text-[11px] uppercase tracking-wider text-white/80">
                {[profile.typeLabel, ...profile.genres].filter(Boolean).join(" · ")}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[28px] font-semibold leading-tight sm:text-[40px]">{artist.name}</h1>
              {profile.verified ? (
                <span className="inline-flex items-center gap-1 rounded bg-success-soft px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-success">
                  <Icon name="check" size={10} strokeWidth={3} /> Verified artist
                </span>
              ) : null}
            </div>
            <p className="font-mono text-[12px] text-white/85">
              {upcomingLabel}
              {cities.length > 0 ? ` · ${cities.length} cit${cities.length === 1 ? "y" : "ies"}` : ""}
            </p>
          </div>
          <div className="hidden shrink-0 sm:block">
            <FollowButton
              kind="artist"
              id={artist.id}
              name={artist.name}
              initialFollowing={follow.following}
              initialCount={follow.followerCount}
              signedIn={follow.signedIn}
              returnTo={selfHref}
            />
          </div>
        </div>
      </section>

      <div className="page-frame grid grid-cols-1 gap-8 pt-6 lg:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-8">
          <div className="sm:hidden">
            <FollowButton
              kind="artist"
              id={artist.id}
              name={artist.name}
              initialFollowing={follow.following}
              initialCount={follow.followerCount}
              signedIn={follow.signedIn}
              returnTo={selfHref}
            />
          </div>

          {/* Tour dates guide. */}
          <section id="tour-dates" className="flex flex-col gap-4" aria-labelledby="tour-dates-heading">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 id="tour-dates-heading" className="text-h2">Tour dates</h2>
              <span className="font-mono text-[11px] text-ink-3">{upcomingLabel}</span>
            </div>

            {cities.length > 1 ? (
              <nav className="flex flex-wrap gap-2" aria-label="Filter by city">
                <CityChip href={`${selfHref}#tour-dates`} active={!activeCity} label="All cities" />
                {cities.map((c) => (
                  <CityChip key={c} href={`${selfHref}?city=${encodeURIComponent(c)}#tour-dates`} active={activeCity === c} label={c} />
                ))}
              </nav>
            ) : null}

            {shownDates.length === 0 ? (
              <Card flat className="border-dashed">
                <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                  <p className="text-[13px] text-ink-3">No scheduled tour dates at the moment. Follow {artist.name} to hear when new dates are announced.</p>
                </div>
              </Card>
            ) : (
              <div className="flex flex-col gap-6">
                {monthGroups.map((group) => (
                  <div key={group.label} className="flex flex-col">
                    <h3 className="mb-2 text-label text-ink-3">{group.label}</h3>
                    <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
                      {group.dates.map((date) => (
                        <TourDateRow key={date.id} date={date} />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          {pastDates.length > 0 ? (
            <details className="group rounded-[var(--radius-lg)] border border-line bg-surface">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[14px] font-semibold">
                Past appearances · {pastDates.length}
                <Icon name="chevD" size={16} className="transition-transform group-open:rotate-180" />
              </summary>
              <ul className="flex flex-col divide-y divide-line border-t border-line">
                {pastDates.map((date) => {
                  const parts = tourDateParts(date.starts_at, date.tz)
                  return (
                    <li key={date.id}>
                      <Link href={`/events/${date.slug}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-bg">
                        <div className="min-w-0">
                          <div className="truncate text-[14px] font-semibold text-ink">{date.title}</div>
                          <div className="mt-0.5 font-mono text-[11px] uppercase text-ink-3">
                            {[parts ? `${parts.day} ${parts.month} ${parts.year}` : null, date.venue_name, date.city].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-[11px] uppercase text-ink-3">
                          {date.lifecycle === "cancelled" ? "Cancelled" : "Past"}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </details>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4">
          <Card>
            <div className="flex flex-col gap-3 p-5">
              <h2 className="text-h3">About {artist.name}</h2>
              {artist.bio ? (
                <ExpandableText text={artist.bio} />
              ) : (
                <p className="text-[13px] text-ink-3">No biography yet.</p>
              )}
              {profile.links.length > 0 ? (
                <div className="flex flex-col gap-2 border-t border-line pt-3">
                  <span className="text-label text-ink-3">Links</span>
                  <ul className="flex flex-wrap gap-2" aria-label="Links">
                    {profile.links.map((l) => (
                      <li key={l.key}>
                        <a
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="inline-flex items-center gap-1 rounded-full border border-line-2 px-2.5 py-1 text-[12px] font-medium text-ink-2 hover:bg-bg"
                        >
                          {l.label} <Icon name="arrowUR" size={11} />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {!raw.primary_user_id ? (
                <Link
                  href={`/onboarding/talent?claim=${encodeURIComponent(artist.name)}`}
                  className="w-fit border-t border-line pt-3 text-[12px] font-semibold text-accent hover:underline"
                >
                  Is this you? Claim this profile
                </Link>
              ) : null}
            </div>
          </Card>

          {bookingPanel}

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
        </aside>
      </div>
    </main>
  )
}

function CityChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={
        active
          ? "rounded-full border border-ink bg-ink px-3 py-1 text-[12px] font-semibold text-surface"
          : "rounded-full border border-line-2 px-3 py-1 text-[12px] font-medium text-ink-2 hover:bg-bg"
      }
    >
      {label}
    </Link>
  )
}

/** One tour date: date block, city and venue, event, and a tickets button. */
function TourDateRow({ date }: { date: ArtistTourDate }) {
  const parts = tourDateParts(date.starts_at, date.tz)
  const eventHref = `/events/${date.slug}`
  const place = [date.city, date.venue_name].filter(Boolean)
  return (
    <li className="flex items-center gap-4 px-4 py-4 sm:gap-6 sm:px-5">
      <div className="flex w-12 shrink-0 flex-col items-center text-center sm:w-14">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-accent">{parts?.month ?? "TBA"}</span>
        <span className="font-mono text-[26px] font-semibold leading-none tabular-nums text-ink">{parts?.day ?? "–"}</span>
        <span className="mt-0.5 font-mono text-[10px] uppercase text-ink-3">{parts?.weekday ?? ""}</span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-x-1.5 text-[15px] font-semibold text-ink">
          {date.city ? <span>{date.city}</span> : null}
          {date.city && date.venue_name ? <span className="text-ink-3">·</span> : null}
          {date.venue_name ? (
            date.venue_slug ? (
              <Link href={`/venues/${date.venue_slug}`} className="hover:underline">
                {date.venue_name}
              </Link>
            ) : (
              <span>{date.venue_name}</span>
            )
          ) : null}
          {place.length === 0 ? <span>Venue to be announced</span> : null}
        </div>
        <Link href={eventHref} className="truncate text-[13px] text-ink-2 hover:underline">
          {date.title}
        </Link>
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-ink-3">
          {parts ? <span>{parts.weekday} {parts.time}</span> : null}
          {date.display_order === 1 ? <Chip size="sm" variant="accent">Headlining</Chip> : null}
          {date.lifecycle === "live" ? <Chip size="sm" variant="accent">On now</Chip> : null}
        </div>
      </div>

      <Link
        href={eventHref}
        className="shrink-0 rounded-[var(--radius)] border border-ink bg-ink px-3 py-2 text-[13px] font-semibold text-surface hover:opacity-90"
      >
        <span className="hidden sm:inline">Find tickets</span>
        <span className="sm:hidden">Tickets</span>
      </Link>
    </li>
  )
}
