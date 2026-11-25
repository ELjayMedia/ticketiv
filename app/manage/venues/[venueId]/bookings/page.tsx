import Link from "next/link"
import { redirect } from "next/navigation"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Textarea } from "@/components/quiet/ui/form"
import { ActionForm } from "@/components/venues/marketplace-forms"
import { getVenueAccess } from "@/lib/venues/access"
import { canEditVenueProfile } from "@/lib/venues/core"
import { cancelVenueBookingAction } from "@/lib/venues/enquiry-actions"
import { formatVenueRange, groupVenueBookings } from "@/lib/venues/marketplace"
import { listVenueBookings, type VenueBookingRow } from "@/lib/venues/marketplace-data"

export const dynamic = "force-dynamic"

const TABS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "cancelled", label: "Cancelled" },
] as const
type Tab = (typeof TABS)[number]["key"]

/** Venue MVP: every confirmed booking, with the organiser, the space and the event it became. */
export default async function VenueBookingsPage({ params, searchParams }: { params: Promise<{ venueId: string }>; searchParams: Promise<{ t?: string }> }) {
  const { venueId } = await params
  const { t } = await searchParams
  const access = await getVenueAccess(venueId)
  if (!access) return redirect("/403")
  const canManage = canEditVenueProfile(access.role)
  const tab: Tab = TABS.find((x) => x.key === t)?.key ?? "upcoming"

  const all = await listVenueBookings(venueId)
  const groups: Record<Tab, VenueBookingRow[]> = groupVenueBookings(all)
  const rows = groups[tab]

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-5 py-8 md:px-10">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Bookings</span>
        <h1 className="text-h1">Bookings</h1>
        <p className="text-[13px] text-ink-3">
          Dates you&apos;ve agreed with organisers. A booking is made when you accept a{" "}
          <Link href={`/manage/venues/${venueId}/enquiries`} className="font-semibold text-accent hover:underline">
            booking request
          </Link>
          ; the date is then held on your{" "}
          <Link href={`/manage/venues/${venueId}/calendar`} className="font-semibold text-accent hover:underline">
            availability calendar
          </Link>{" "}
          and can&apos;t be double-booked. Contracts and payment are agreed directly with the organiser.
        </p>
      </header>

      <nav className="flex flex-wrap gap-2" aria-label="Filter bookings">
        {TABS.map((x) => (
          <Link key={x.key} href={`/manage/venues/${venueId}/bookings?t=${x.key}`} aria-current={x.key === tab ? "page" : undefined}>
            <Chip variant={x.key === tab ? "active" : "default"}>
              {x.label} · {groups[x.key].length}
            </Chip>
          </Link>
        ))}
      </nav>

      <Card>
        <CardBody className="flex flex-col p-5">
          {rows.length === 0 ? (
            <p className="text-[13px] text-ink-3">
              {tab === "upcoming" ? "No upcoming bookings. Accept a booking request to book a date." : tab === "past" ? "No past bookings yet." : "No cancelled bookings."}
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {rows.map((b) => (
                <li key={b.id} className="flex flex-col gap-2 py-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 flex-col">
                      <span className="text-[14px] font-semibold text-ink">{b.orgName ?? "Organiser"}</span>
                      <span className="font-mono text-[12px] text-ink-3">
                        {formatVenueRange(b.startsAt, b.endsAt)} · {b.spaceName ?? "Whole venue"}
                      </span>
                      <span className="text-[12px] text-ink-3">
                        {b.eventId ? "The organiser has created an event for this booking." : "No event created for it yet."}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {b.enquiryId ? (
                        <Link href={`/manage/venues/${venueId}/enquiries/${b.enquiryId}`} className="text-[13px] font-semibold text-accent hover:underline">
                          Conversation
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  {canManage && tab === "upcoming" ? (
                    <ActionForm
                      action={cancelVenueBookingAction}
                      hidden={{ venueId, orgId: b.orgId, enquiryId: b.enquiryId ?? "", bookingId: b.id }}
                      submitLabel="Cancel booking"
                      variant="ghost"
                      confirm="Cancel this booking? The date becomes free and the organiser is told in the conversation."
                    >
                      <Textarea name="reason" rows={2} required minLength={5} maxLength={500} placeholder="Reason (shared with the organiser)" />
                    </ActionForm>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </main>
  )
}
