import Link from "next/link"
import { redirect } from "next/navigation"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getVenueAccess } from "@/lib/venues/access"
import { canEditVenueProfile, claimStatusLabel, type VenueClaimStatus } from "@/lib/venues/core"
import { UtilisationCard } from "@/components/venues/utilisation-card"
import { formatVenueRange, groupVenueBookings } from "@/lib/venues/marketplace"
import { getVenueUtilisation, listEnquiries, listVenueBookings } from "@/lib/venues/marketplace-data"
import { addDays, venueLocalDate } from "@/lib/venues/utilisation"

export const dynamic = "force-dynamic"

function eventWhen(startsAt: string | null, tz: string | null) {
  if (!startsAt) return "Date to be announced"
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz || "Africa/Mbabane",
  }).format(new Date(startsAt))
}

/** Venue overview: verification state, profile completeness and public events here. */
export default async function VenueOverviewPage({ params }: { params: Promise<{ venueId: string }> }) {
  const { venueId } = await params
  const access = await getVenueAccess(venueId)
  if (!access) return redirect("/403")
  const { venue, role } = access

  const supabase = createServerSupabaseClient()
  const today = venueLocalDate(new Date())
  const [upcomingUse, pastUse, enquiries, bookings] = await Promise.all([
    getVenueUtilisation(venueId, today, addDays(today, 89)),
    getVenueUtilisation(venueId, addDays(today, -90), addDays(today, -1)),
    listEnquiries({ venueId }),
    listVenueBookings(venueId),
  ])
  const openRequests = enquiries.filter((e) => e.status === "open").sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const nextBookings = groupVenueBookings(bookings).upcoming.slice(0, 5)
  // Public events only (events RLS): a venue sees what attendees see, never
  // the organiser's drafts or its buyers.
  const [eventsRes, claimRes] = await Promise.all([
    supabase
      ? supabase
          .from("events")
          .select("id, title, slug, starts_at, tz")
          .eq("venue_id", venueId)
          .eq("status", "published")
          .eq("visibility", "public")
          .gte("starts_at", new Date().toISOString())
          .order("starts_at", { ascending: true })
          .limit(10)
      : Promise.resolve({ data: [], error: null }),
    supabase
      ? supabase
          .from("venue_claims")
          .select("status, kind, created_at, review_note")
          .eq("venue_id", venueId)
          .eq("claimant_id", access.userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])
  if (eventsRes.error) console.error("[venue overview] events:", eventsRes.error)
  const events = eventsRes.data ?? []
  const claim = claimRes.data as { status: VenueClaimStatus; kind: string; review_note: string | null } | null

  const missing = [
    !venue.description && "a description",
    !venue.address && "the street address",
    !venue.capacity && "capacity",
    !venue.contactEmail && !venue.contactPhone && "a booking contact",
  ].filter(Boolean) as string[]

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-5 py-8 md:px-10">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Venue workspace</span>
        <h1 className="text-h1">{venue.name}</h1>
        <p className="text-[13px] text-ink-3">{[venue.city, venue.capacity ? `${venue.capacity.toLocaleString("en-GB")} capacity` : null].filter(Boolean).join(" · ")}</p>
      </header>

      {venue.verificationStatus !== "verified" ? (
        <Card>
          <CardBody className="flex items-start gap-3 p-4">
            <Icon name="shield" size={18} className="mt-0.5 shrink-0 text-warning" />
            <div className="flex flex-col gap-1">
              <h2 className="text-h3">Verification in progress</h2>
              <p className="text-[13px] text-ink-2">
                {claim?.status === "pending"
                  ? "Ticketiv is checking your connection to this venue. You can prepare the profile meanwhile; it shows as unverified until we approve it."
                  : claim
                    ? `${claimStatusLabel(claim.status)}.${claim.review_note ? ` "${claim.review_note}"` : ""}`
                    : "Ticketiv hasn't verified this venue yet. Organisers can send booking requests once it's verified."}
              </p>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {missing.length > 0 && canEditVenueProfile(role) ? (
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-[13px] text-ink-2">Organisers look for {missing.join(", ")} before they enquire.</p>
            <Link href={`/manage/venues/${venueId}/profile`} className="text-[13px] font-semibold text-accent hover:underline">
              Complete the profile
            </Link>
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardBody className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-h3">Booking requests to answer</h2>
              <span className="font-mono text-[12px] text-ink-3">{openRequests.length}</span>
            </div>
            {openRequests.length === 0 ? (
              <p className="text-[13px] text-ink-3">No open requests. Organisers send them from your public venue page.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {openRequests.slice(0, 5).map((e) => (
                  <li key={e.id} className="py-2">
                    <Link href={`/manage/venues/${venueId}/enquiries/${e.id}`} className="flex flex-col hover:underline">
                      <span className="truncate text-[14px] font-medium text-ink">{e.orgName ?? "Organiser"}</span>
                      <span className="font-mono text-[12px] text-ink-3">
                        {formatVenueRange(e.startsAt, e.endsAt)}
                        {e.expectedAttendance ? ` · ${e.expectedAttendance.toLocaleString("en-GB")} people` : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link href={`/manage/venues/${venueId}/enquiries`} className="text-[13px] font-semibold text-accent hover:underline">
              All booking requests
            </Link>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-h3">Next bookings</h2>
              <span className="font-mono text-[12px] text-ink-3">{nextBookings.length}</span>
            </div>
            {nextBookings.length === 0 ? (
              <p className="text-[13px] text-ink-3">Nothing booked yet. Accepting a request books the date.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {nextBookings.map((b) => (
                  <li key={b.id} className="flex flex-col py-2">
                    <span className="truncate text-[14px] font-medium text-ink">{b.orgName ?? "Organiser"}</span>
                    <span className="font-mono text-[12px] text-ink-3">
                      {formatVenueRange(b.startsAt, b.endsAt)} · {b.spaceName ?? "Whole venue"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link href={`/manage/venues/${venueId}/bookings`} className="text-[13px] font-semibold text-accent hover:underline">
              All bookings
            </Link>
          </CardBody>
        </Card>
      </div>

      {upcomingUse ? <UtilisationCard title="Next 90 days" data={upcomingUse} /> : null}
      {pastUse && (pastUse.bookings > 0 || pastUse.events > 0 || pastUse.enquiriesReceived > 0) ? (
        <UtilisationCard title="Last 90 days" data={pastUse} />
      ) : null}

      <Card>
        <CardBody className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-h2">Upcoming public events here</h2>
            <span className="font-mono text-[12px] text-ink-3">{events.length}</span>
          </div>
          {events.length === 0 ? (
            <p className="text-[13px] text-ink-3">
              No public events are listed at this venue yet. Events appear here when an organiser publishes one with this venue.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {events.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/events/${e.slug ?? e.id}`} className="min-w-0 truncate text-[14px] font-medium text-ink hover:underline">
                    {e.title}
                  </Link>
                  <span className="shrink-0 font-mono text-[12px] text-ink-3">{eventWhen(e.starts_at, e.tz)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </main>
  )
}
