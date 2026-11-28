import Link from "next/link"
import { redirect } from "next/navigation"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { FormField, Textarea } from "@/components/quiet/ui/form"
import { ActionForm } from "@/components/venues/marketplace-forms"
import { getArtistAccess } from "@/lib/artists/access"
import { postAnnouncementAction } from "@/lib/artists/booking-actions"
import { turnoutPct } from "@/lib/artists/bookings"
import { getArtistInsights, getArtistLineupDates, getRecentAnnouncements } from "@/lib/artists/bookings-data"

export const dynamic = "force-dynamic"

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-label">{label}</span>
      <span className="text-[22px] font-semibold leading-tight text-ink">{value}</span>
      {hint ? <span className="text-[12px] text-ink-3">{hint}</span> : null}
    </div>
  )
}

const day = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Mbabane" }).format(new Date(iso)) : "Date TBA"

/** Audience insights and follower announcements (TICK-486). Aggregates only. */
export default async function ArtistInsightsPage({ params }: { params: Promise<{ artistId: string }> }) {
  const { artistId } = await params
  const access = await getArtistAccess(artistId)
  if (!access) return redirect("/403")
  const [insights, announcements, upcoming] = await Promise.all([getArtistInsights(artistId), getRecentAnnouncements(artistId), getArtistLineupDates(artistId)])
  const turnout = insights ? turnoutPct(insights.ticketsSold, insights.checkedIn) : null

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-5 py-8 md:px-10">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Insights</span>
        <h1 className="text-h1">Audience</h1>
        <p className="text-[13px] text-ink-3">
          Totals from Ticketiv events you played. You never see who bought tickets or follows you, only the numbers.
        </p>
      </header>

      {insights ? (
        <>
          <Card>
            <CardBody className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
              <Stat label="Followers" value={insights.followers.toLocaleString("en-GB")} hint={`+${insights.followers30d.toLocaleString("en-GB")} in 30 days`} />
              <Stat label="Past events" value={insights.pastEvents.toLocaleString("en-GB")} hint={`${insights.upcomingEvents} upcoming`} />
              <Stat label="Tickets sold" value={insights.ticketsSold.toLocaleString("en-GB")} hint="At events you played" />
              <Stat label="Turnout" value={turnout === null ? "—" : `${turnout}%`} hint={`${insights.checkedIn.toLocaleString("en-GB")} scanned in`} />
            </CardBody>
          </Card>
          {insights.events.length > 0 ? (
            <Card>
              <CardBody className="flex flex-col gap-2 p-5">
                <h2 className="text-h2">By event</h2>
                <ul className="flex flex-col divide-y divide-line">
                  {insights.events.map((e) => (
                    <li key={e.eventId} className="flex items-center justify-between gap-3 py-2.5">
                      <Link href={e.slug ? `/events/${e.slug}` : "#"} className="flex min-w-0 flex-col hover:underline">
                        <span className="truncate text-[14px] font-semibold text-ink">{e.title}</span>
                        <span className="font-mono text-[12px] text-ink-3">{day(e.startsAt)}</span>
                      </Link>
                      <span className="shrink-0 text-right font-mono text-[12px] text-ink-3">
                        {e.ticketsSold.toLocaleString("en-GB")} sold
                        <br />
                        {e.checkedIn.toLocaleString("en-GB")} in
                      </span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}
        </>
      ) : (
        <p className="text-[13px] text-ink-3">Insights aren&apos;t available right now.</p>
      )}

      <Card>
        <CardBody className="flex flex-col gap-3 p-5">
          <h2 className="text-h2">Tell your followers</h2>
          <p className="text-[13px] text-ink-3">
            Announcements go to followers in the Ticketiv app, if they keep in-app notifications on. Up to 3 a week. Email, SMS and
            WhatsApp aren&apos;t used.
          </p>
          <ActionForm action={postAnnouncementAction} hidden={{ artistId }} submitLabel="Send announcement" variant="accent" pendingLabel="Sending…">
            <FormField label="Title" name="title" required minLength={3} maxLength={120} placeholder="New single out Friday" />
            <label className="flex flex-col gap-1">
              <span className="text-label">Message</span>
              <Textarea name="body" rows={3} required minLength={3} maxLength={600} />
            </label>
            {upcoming.length > 0 ? (
              <label className="flex flex-col gap-1">
                <span className="text-label">Link to one of your events (optional)</span>
                <select name="eventId" defaultValue="" className="h-[42px] rounded-md border border-line-2 bg-surface px-3 text-[14px]">
                  <option value="">No event</option>
                  {upcoming.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title} · {day(e.startsAt)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </ActionForm>
          {announcements.length > 0 ? (
            <ul className="flex flex-col divide-y divide-line border-t border-line pt-2">
              {announcements.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                  <span className="truncate text-ink">{a.title}</span>
                  <span className="shrink-0 font-mono text-[12px] text-ink-3">
                    {day(a.createdAt)} · {a.recipients} reached
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </CardBody>
      </Card>
    </main>
  )
}
