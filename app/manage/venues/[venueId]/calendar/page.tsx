import Link from "next/link"
import { redirect } from "next/navigation"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { ActionForm, BlockForm } from "@/components/venues/marketplace-forms"
import { addVenueBlockAction, removeVenueBlockAction } from "@/app/manage/venues/[venueId]/marketplace-actions"
import { getVenueAccess } from "@/lib/venues/access"
import { canEditVenueProfile } from "@/lib/venues/core"
import { formatVenueRange } from "@/lib/venues/marketplace"
import { getVenueCalendar, getVenueSpaces } from "@/lib/venues/marketplace-data"
import { buildCalendarRows } from "@/lib/venues/calendar"

export const dynamic = "force-dynamic"

/** Availability: bookings, blocks and events at the venue for the next 120 days (TICK-460). */
export default async function VenueCalendarPage({ params }: { params: Promise<{ venueId: string }> }) {
  const { venueId } = await params
  const access = await getVenueAccess(venueId)
  if (!access) return redirect("/403")
  const canEdit = canEditVenueProfile(access.role)
  const from = new Date()
  from.setUTCHours(0, 0, 0, 0)
  const to = new Date(from.getTime() + 120 * 24 * 3600 * 1000)
  const [calendar, spaces] = await Promise.all([getVenueCalendar(venueId, from.toISOString(), to.toISOString()), getVenueSpaces(venueId)])
  const spaceName = new Map(spaces.map((s) => [s.id, s.name]))
  const rows = buildCalendarRows(calendar)

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-5 py-8 md:px-10">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Calendar</span>
        <h1 className="text-h1">Availability</h1>
        <p className="text-[13px] text-ink-3">
          Confirmed bookings, blocked dates and published events at the venue for the next 120 days. Events published at the venue
          hold the date automatically. Organisers only see that a time is busy, never who booked it.
        </p>
      </header>

      <Card>
        <CardBody className="flex flex-col gap-1 p-5">
          {rows.length === 0 ? (
            <p className="text-[13px] text-ink-3">Nothing booked or blocked yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {rows.map((row) => (
                <li key={`${row.kind}:${row.id}`} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-col">
                    <span className="text-[14px] font-semibold text-ink">
                      {row.kind === "booking" ? `Booked · ${row.label}` : row.kind === "block" ? `Blocked${row.label ? ` · ${row.label}` : ""}` : `Event · ${row.label}`}
                    </span>
                    <span className="font-mono text-[12px] text-ink-3">
                      {formatVenueRange(row.startsAt, row.endsAt)} · {row.spaceId ? spaceName.get(row.spaceId) ?? "Space" : "Whole venue"}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {row.kind === "booking" && row.enquiryId ? (
                      <Link href={`/manage/venues/${venueId}/enquiries/${row.enquiryId}`} className="text-[13px] font-semibold text-accent hover:underline">
                        Open
                      </Link>
                    ) : null}
                    {row.kind === "event" && row.slug ? (
                      <Link href={`/events/${row.slug}`} className="text-[13px] font-semibold text-accent hover:underline">
                        Event page
                      </Link>
                    ) : null}
                    {row.kind === "block" && canEdit ? (
                      <ActionForm action={removeVenueBlockAction} hidden={{ venueId, blockId: row.id }} submitLabel="Remove" variant="ghost" />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {canEdit ? (
        <Card>
          <CardBody className="flex flex-col gap-3 p-5">
            <h2 className="text-h2">Block dates</h2>
            <p className="text-[13px] text-ink-3">Blocked dates can't be booked. Booked dates can't be blocked; cancel the booking first.</p>
            <BlockForm venueId={venueId} spaces={spaces.map((s) => ({ id: s.id, name: s.name }))} action={addVenueBlockAction} />
          </CardBody>
        </Card>
      ) : null}
    </main>
  )
}
