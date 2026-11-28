import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { Textarea } from "@/components/quiet/ui/form"
import { EnquiryDetailView } from "@/components/venues/enquiry-view"
import { ActionForm } from "@/components/venues/marketplace-forms"
import { decideVenueEnquiryAction } from "@/app/manage/venues/[venueId]/marketplace-actions"
import { getVenueAccess } from "@/lib/venues/access"
import { canEditVenueProfile } from "@/lib/venues/core"
import { cancelVenueBookingAction, replyToEnquiryAction } from "@/lib/venues/enquiry-actions"
import { getEnquiry } from "@/lib/venues/marketplace-data"

export const dynamic = "force-dynamic"

export default async function VenueEnquiryPage({ params }: { params: Promise<{ venueId: string; enquiryId: string }> }) {
  const { venueId, enquiryId } = await params
  const access = await getVenueAccess(venueId)
  if (!access) return redirect("/403")
  const enquiry = await getEnquiry(enquiryId)
  if (!enquiry || enquiry.venueId !== venueId) notFound()
  const canAct = canEditVenueProfile(access.role)
  const hidden = { enquiryId, venueId, orgId: enquiry.orgId }
  const bookingConfirmed = enquiry.booking?.status === "confirmed"

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-5 py-8 md:px-10">
      <Link href={`/manage/venues/${venueId}/enquiries`} className="text-[13px] font-semibold text-accent hover:underline">
        ← All enquiries
      </Link>
      <EnquiryDetailView
        enquiry={enquiry}
        side="venue"
        actions={
          canAct ? (
            <div className="flex flex-col gap-3 border-t border-line pt-3">
              {enquiry.status === "open" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <ActionForm action={decideVenueEnquiryAction} hidden={{ ...hidden, decision: "accept" }} submitLabel="Accept and book" variant="accent" pendingLabel="Booking…">
                    <Textarea name="note" rows={2} maxLength={1000} placeholder="Optional note to the organiser" />
                  </ActionForm>
                  <ActionForm action={decideVenueEnquiryAction} hidden={{ ...hidden, decision: "decline" }} submitLabel="Decline">
                    <Textarea name="note" rows={2} maxLength={1000} placeholder="Optional reason or another date" />
                  </ActionForm>
                </div>
              ) : null}
              {bookingConfirmed && enquiry.booking ? (
                <ActionForm
                  action={cancelVenueBookingAction}
                  hidden={{ ...hidden, bookingId: enquiry.booking.id }}
                  submitLabel="Cancel booking"
                  variant="ghost"
                  confirm="Cancel this booking? The organiser is told in the conversation."
                >
                  <Textarea name="reason" rows={2} required minLength={5} maxLength={500} placeholder="Reason (shared with the organiser)" />
                </ActionForm>
              ) : null}
            </div>
          ) : (
            <p className="text-[13px] text-ink-3">Staff can read enquiries. An owner or manager answers them.</p>
          )
        }
        reply={
          canAct && (enquiry.status === "open" || enquiry.status === "accepted") ? (
            <ActionForm action={replyToEnquiryAction} hidden={hidden} submitLabel="Send reply" variant="primary" pendingLabel="Sending…">
              <Textarea name="body" rows={3} required maxLength={4000} placeholder="Reply to the organiser" />
            </ActionForm>
          ) : null
        }
      />
    </main>
  )
}
