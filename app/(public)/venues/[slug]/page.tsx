import Link from "next/link"
import { notFound } from "next/navigation"

import { FollowButton } from "@/components/follows/follow-button"
import { Card, CardBody } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
import { getFollowSnapshot } from "@/lib/data/public/follows"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

type PublicVenue = {
  id: string
  name: string
  slug: string
  city: string | null
  address: string | null
  capacity: number | null
  description: string | null
  website: string | null
  contact_email: string | null
  contact_phone: string | null
  verification_status: string
}

type VenueEvent = { id: string; title: string; slug: string | null; starts_at: string | null; tz: string | null }

function when(startsAt: string | null, tz: string | null) {
  if (!startsAt) return "Date to be announced"
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: tz || "Africa/Mbabane",
  }).format(new Date(startsAt))
}

function EventList({ events, empty }: { events: VenueEvent[]; empty: string }) {
  if (events.length === 0) return <p className="text-[13px] text-ink-3">{empty}</p>
  return (
    <ul className="flex flex-col divide-y divide-line">
      {events.map((e) => (
        <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
          <Link href={`/events/${e.slug ?? e.id}`} className="min-w-0 truncate text-[14px] font-medium text-ink hover:underline">
            {e.title}
          </Link>
          <span className="shrink-0 font-mono text-[12px] text-ink-3">{when(e.starts_at, e.tz)}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Public venue profile (TICK-460 / TICK-452). Readable when the venue is
 * verified or hosts a public event (venues RLS). Shows public events only.
 */
export default async function PublicVenuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = createServerSupabaseClient()
  if (!supabase) notFound()

  const { data } = await (supabase as any)
    .from("venues")
    .select("id, name, slug, city, address, capacity, description, website, contact_email, contact_phone, verification_status")
    .eq("slug", slug)
    .maybeSingle()
  const venue = data as PublicVenue | null
  if (!venue) notFound()

  const nowIso = new Date().toISOString()
  const base = () =>
    supabase.from("events").select("id, title, slug, starts_at, tz").eq("venue_id", venue.id).eq("status", "published").eq("visibility", "public")
  const [upcomingRes, pastRes, follow] = await Promise.all([
    base().gte("starts_at", nowIso).order("starts_at", { ascending: true }).limit(20),
    base().lt("starts_at", nowIso).order("starts_at", { ascending: false }).limit(10),
    getFollowSnapshot("venue", venue.id),
  ])
  const upcoming = (upcomingRes.data ?? []) as VenueEvent[]
  const past = (pastRes.data ?? []) as VenueEvent[]
  const verified = venue.verification_status === "verified"

  return (
    <main className="page-frame flex flex-col gap-6 py-8 sm:py-12">
      <Link href="/venues" className="inline-flex w-fit items-center gap-1.5 text-[13px] text-ink-3 underline-offset-4 hover:underline">
        <Icon name="chevL" size={14} />
        All venues
      </Link>

      <Card>
        <CardBody className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:p-6">
          <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-accent-soft text-accent">
            <Icon name="building" size={24} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-h1 sm:text-[28px]">{venue.name}</h1>
              {verified ? (
                <span className="inline-flex items-center gap-1 rounded bg-success-soft px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-success">
                  <Icon name="checkCircle" size={10} />
                  Verified venue
                </span>
              ) : null}
            </div>
            <p className="text-[13px] text-ink-3">
              {[venue.address, venue.city, venue.capacity ? `capacity ${venue.capacity.toLocaleString("en-GB")}` : null].filter(Boolean).join(" · ")}
            </p>
            {venue.description ? <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink-2">{venue.description}</p> : null}
            <FollowButton
              kind="venue"
              id={venue.id}
              name={venue.name}
              initialFollowing={follow.following}
              initialCount={follow.followerCount}
              signedIn={follow.signedIn}
              returnTo={`/venues/${venue.slug}`}
            />
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardBody className="flex flex-col gap-3 p-5">
              <h2 className="text-h2">Upcoming events</h2>
              <EventList events={upcoming} empty="No upcoming public events here yet. Follow the venue to hear when one is announced." />
            </CardBody>
          </Card>
          {past.length > 0 ? (
            <Card>
              <CardBody className="flex flex-col gap-3 p-5">
                <h2 className="text-h2">Past events</h2>
                <EventList events={past} empty="" />
              </CardBody>
            </Card>
          ) : null}
        </div>

        {venue.website || venue.contact_email || venue.contact_phone ? (
          <Card className="self-start">
            <CardBody className="flex flex-col gap-2 p-5">
              <h2 className="text-h3">Booking contact</h2>
              {venue.website ? (
                <a href={venue.website} rel="noopener noreferrer nofollow" target="_blank" className="text-[13px] font-semibold text-accent hover:underline">
                  Website
                </a>
              ) : null}
              {venue.contact_email ? (
                <a href={`mailto:${venue.contact_email}`} className="text-[13px] text-ink-2 hover:underline">
                  {venue.contact_email}
                </a>
              ) : null}
              {venue.contact_phone ? (
                <a href={`tel:${venue.contact_phone.replace(/\s+/g, "")}`} className="text-[13px] text-ink-2 hover:underline">
                  {venue.contact_phone}
                </a>
              ) : null}
            </CardBody>
          </Card>
        ) : null}
      </div>
    </main>
  )
}
