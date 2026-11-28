import Link from "next/link"
import { redirect } from "next/navigation"

import { BookingList } from "@/components/artists/booking-view"
import { Card, CardBody } from "@/components/quiet/ui/card"
import { getArtistAccess } from "@/lib/artists/access"
import { isOpenBooking } from "@/lib/artists/bookings"
import { getArtistLineupDates, listBookings } from "@/lib/artists/bookings-data"

export const dynamic = "force-dynamic"

const day = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Mbabane" }).format(new Date(iso))

/** Booking inbox and performance calendar (TICK-461 / TICK-485). */
export default async function ArtistBookingsPage({ params }: { params: Promise<{ artistId: string }> }) {
  const { artistId } = await params
  const access = await getArtistAccess(artistId)
  if (!access) return redirect("/403")
  const [bookings, lineup] = await Promise.all([listBookings({ artistId }), getArtistLineupDates(artistId)])
  const now = new Date().toISOString()
  const inbox = bookings.filter((b) => isOpenBooking(b.status))
  const confirmed = bookings.filter((b) => b.status === "accepted" && b.startsAt >= now)
  const linkedEvents = new Set(confirmed.map((b) => b.eventId).filter(Boolean))
  const calendar = [
    ...confirmed.map((b) => ({ key: `b:${b.id}`, startsAt: b.startsAt, title: b.eventTitle, sub: b.orgName ?? "Organiser", href: `/manage/artists/${artistId}/bookings/${b.id}`, kind: "Booked" })),
    ...lineup
      .filter((e) => !linkedEvents.has(e.id))
      .map((e) => ({ key: `e:${e.id}`, startsAt: e.startsAt, title: e.title, sub: "On the line-up", href: e.slug ? `/events/${e.slug}` : "#", kind: "Line-up" })),
  ].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const past = bookings.filter((b) => !isOpenBooking(b.status) && !(b.status === "accepted" && b.startsAt >= now)).reverse()

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8 md:px-10">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Bookings</span>
        <h1 className="text-h1">Bookings and calendar</h1>
        <p className="text-[13px] text-ink-3">
          Organisers send requests from your public profile. Only your team and the organiser can see a request.
        </p>
      </header>

      <section className="flex flex-col gap-2" aria-labelledby="inbox">
        <h2 id="inbox" className="text-h2">
          Requests to answer · {inbox.length}
        </h2>
        <BookingList bookings={inbox} hrefFor={(b) => `/manage/artists/${artistId}/bookings/${b.id}`} counterpart={(b) => b.orgName ?? "Organiser"} empty="No open requests." />
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="calendar">
        <h2 id="calendar" className="text-h2">
          Upcoming dates
        </h2>
        <Card>
          <CardBody className="p-5">
            {calendar.length === 0 ? (
              <p className="text-[13px] text-ink-3">No confirmed dates yet.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {calendar.map((c) => (
                  <li key={c.key} className="flex items-center justify-between gap-3 py-2.5">
                    <Link href={c.href} className="flex min-w-0 flex-col hover:underline">
                      <span className="truncate text-[14px] font-semibold text-ink">{c.title}</span>
                      <span className="text-[12px] text-ink-3">{c.sub}</span>
                    </Link>
                    <span className="shrink-0 text-right font-mono text-[12px] text-ink-3">
                      {day(c.startsAt)}
                      <br />
                      {c.kind}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </section>

      {past.length > 0 ? (
        <section className="flex flex-col gap-2" aria-labelledby="history">
          <h2 id="history" className="text-h2">
            History
          </h2>
          <BookingList bookings={past} hrefFor={(b) => `/manage/artists/${artistId}/bookings/${b.id}`} counterpart={(b) => b.orgName ?? "Organiser"} empty="" />
        </section>
      ) : null}
    </main>
  )
}
