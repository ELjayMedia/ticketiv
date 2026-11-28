import Link from "next/link"
import { notFound } from "next/navigation"

import { BookingDetailView } from "@/components/artists/booking-view"
import { Textarea } from "@/components/quiet/ui/form"
import { ActionForm } from "@/components/venues/marketplace-forms"
import { requireOrganizerSection } from "@/lib/organizer/access"
import { linkBookingEventAction, organizerBookingAction, replyToBookingAction } from "@/lib/artists/booking-actions"
import { getBooking, getOrgUpcomingEvents } from "@/lib/artists/bookings-data"

export const dynamic = "force-dynamic"

export default async function OrgArtistBookingPage({ params }: { params: Promise<{ orgId: string; requestId: string }> }) {
  const { orgId, requestId } = await params
  await requireOrganizerSection(orgId, "bookings")
  const booking = await getBooking(requestId)
  if (!booking || booking.orgId !== orgId) notFound()
  const hidden = { requestId, artistId: booking.artistId, orgId }
  const events = booking.status === "accepted" && !booking.eventId ? await getOrgUpcomingEvents(orgId) : []

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex max-w-3xl flex-col gap-5 p-6">
        <Link href={`/orgs/${orgId}/artist-bookings`} className="text-[13px] font-semibold text-accent hover:underline">
          ← Bookings
        </Link>
        <BookingDetailView
          booking={booking}
          side="organizer"
          actions={
            <div className="flex flex-col gap-3 border-t border-line pt-3">
              {booking.status === "countered" ? (
                <ActionForm action={organizerBookingAction} hidden={{ ...hidden, action: "accept_counter" }} submitLabel="Accept counter-offer" variant="accent" />
              ) : null}
              {booking.status === "open" || booking.status === "countered" ? (
                <ActionForm action={organizerBookingAction} hidden={{ ...hidden, action: "withdraw" }} submitLabel="Withdraw request" variant="ghost" confirm="Withdraw this request?" />
              ) : null}
              {booking.status === "accepted" && booking.eventId ? (
                <Link href={`/orgs/${orgId}/events/${booking.eventId}`} className="text-[14px] font-semibold text-accent hover:underline">
                  Open the event (the artist is on its line-up)
                </Link>
              ) : null}
              {booking.status === "accepted" && !booking.eventId ? (
                events.length > 0 ? (
                  <ActionForm action={linkBookingEventAction} hidden={hidden} submitLabel="Add to this event's line-up" variant="accent">
                    <label className="flex flex-col gap-1">
                      <span className="text-label">Event</span>
                      <select name="eventId" required className="h-[42px] rounded-md border border-line-2 bg-surface px-3 text-[14px]">
                        {events.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  </ActionForm>
                ) : (
                  <p className="text-[13px] text-ink-3">
                    Create the event, then come back to add the artist to its line-up.{" "}
                    <Link href={`/orgs/${orgId}/events/new`} className="font-semibold text-accent hover:underline">
                      Create event
                    </Link>
                  </p>
                )
              ) : null}
            </div>
          }
          reply={
            booking.status !== "declined" && booking.status !== "withdrawn" ? (
              <ActionForm action={replyToBookingAction} hidden={hidden} submitLabel="Send message" variant="primary" pendingLabel="Sending…">
                <Textarea name="body" rows={3} required maxLength={4000} placeholder="Message the artist" />
              </ActionForm>
            ) : null
          }
        />
      </div>
    </main>
  )
}
