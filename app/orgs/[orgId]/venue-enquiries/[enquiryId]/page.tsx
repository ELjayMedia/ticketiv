import Link from "next/link"
import { notFound } from "next/navigation"

import { FormField, Textarea } from "@/components/quiet/ui/form"
import { EnquiryDetailView } from "@/components/venues/enquiry-view"
import { ActionForm } from "@/components/venues/marketplace-forms"
import { requireOrganizerSection } from "@/lib/organizer/access"
import {
  cancelVenueBookingAction,
  createEventFromBookingAction,
  replyToEnquiryAction,
  withdrawVenueEnquiryAction,
} from "@/lib/venues/enquiry-actions"
import { getEnquiry } from "@/lib/venues/marketplace-data"

export const dynamic = "force-dynamic"

export default async function OrgVenueEnquiryPage({ params }: { params: Promise<{ orgId: string; enquiryId: string }> }) {
  const { orgId, enquiryId } = await params
  await requireOrganizerSection(orgId, "bookings")
  const enquiry = await getEnquiry(enquiryId)
  if (!enquiry || enquiry.orgId !== orgId) notFound()
  const hidden = { enquiryId, venueId: enquiry.venueId, orgId }
  const booking = enquiry.booking?.status === "confirmed" ? enquiry.booking : null

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex max-w-3xl flex-col gap-5 p-6">
        <Link href={`/orgs/${orgId}/venue-enquiries`} className="text-[13px] font-semibold text-accent hover:underline">
          ← Bookings
        </Link>
        <EnquiryDetailView
          enquiry={enquiry}
          side="organizer"
          actions={
            <div className="flex flex-col gap-3 border-t border-line pt-3">
              {booking ? (
                booking.eventId ? (
                  <Link href={`/orgs/${orgId}/events/${booking.eventId}`} className="text-[14px] font-semibold text-accent hover:underline">
                    Open the event
                  </Link>
                ) : (
                  <ActionForm action={createEventFromBookingAction} hidden={{ ...hidden, bookingId: booking.id }} submitLabel="Create event draft" variant="accent" pendingLabel="Creating…">
                    <FormField label="Event name" name="title" required maxLength={200} placeholder="e.g. Gospel Night" />
                  </ActionForm>
                )
              ) : null}
              {enquiry.status === "open" ? (
                <ActionForm action={withdrawVenueEnquiryAction} hidden={hidden} submitLabel="Withdraw enquiry" variant="ghost" confirm="Withdraw this enquiry?" />
              ) : null}
              {booking ? (
                <ActionForm
                  action={cancelVenueBookingAction}
                  hidden={{ ...hidden, bookingId: booking.id }}
                  submitLabel="Cancel booking"
                  variant="ghost"
                  confirm="Cancel this booking? The venue is told in the conversation and the date is released."
                >
                  <Textarea name="reason" rows={2} required minLength={5} maxLength={500} placeholder="Reason (shared with the venue)" />
                </ActionForm>
              ) : null}
            </div>
          }
          reply={
            enquiry.status === "open" || enquiry.status === "accepted" ? (
              <ActionForm action={replyToEnquiryAction} hidden={hidden} submitLabel="Send message" variant="primary" pendingLabel="Sending…">
                <Textarea name="body" rows={3} required maxLength={4000} placeholder="Message the venue" />
              </ActionForm>
            ) : null
          }
        />
      </div>
    </main>
  )
}
