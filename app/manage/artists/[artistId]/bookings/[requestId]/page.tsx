import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { BookingDetailView } from "@/components/artists/booking-view"
import { FormField, Textarea } from "@/components/quiet/ui/form"
import { ActionForm } from "@/components/venues/marketplace-forms"
import { getArtistAccess } from "@/lib/artists/access"
import { replyToBookingAction, respondToBookingAction } from "@/lib/artists/booking-actions"
import { getBooking } from "@/lib/artists/bookings-data"

export const dynamic = "force-dynamic"

export default async function ArtistBookingPage({ params }: { params: Promise<{ artistId: string; requestId: string }> }) {
  const { artistId, requestId } = await params
  const access = await getArtistAccess(artistId)
  if (!access) return redirect("/403")
  const booking = await getBooking(requestId)
  if (!booking || booking.artistId !== artistId) notFound()
  const hidden = { requestId, artistId, orgId: booking.orgId }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-5 py-8 md:px-10">
      <Link href={`/manage/artists/${artistId}/bookings`} className="text-[13px] font-semibold text-accent hover:underline">
        ← Bookings
      </Link>
      <BookingDetailView
        booking={booking}
        side="artist"
        actions={
          booking.status === "open" ? (
            <div className="grid gap-3 border-t border-line pt-3 sm:grid-cols-3">
              <ActionForm action={respondToBookingAction} hidden={{ ...hidden, action: "accept" }} submitLabel="Accept" variant="accent" pendingLabel="Confirming…">
                <Textarea name="note" rows={2} maxLength={2000} placeholder="Optional note" />
              </ActionForm>
              <ActionForm action={respondToBookingAction} hidden={{ ...hidden, action: "counter" }} submitLabel="Send counter-offer">
                <FormField label="Your fee (SZL)" name="counter" inputMode="decimal" required />
                <Textarea name="note" rows={2} maxLength={2000} placeholder="What the fee covers" />
              </ActionForm>
              <ActionForm action={respondToBookingAction} hidden={{ ...hidden, action: "decline" }} submitLabel="Decline" variant="ghost">
                <Textarea name="note" rows={2} maxLength={2000} placeholder="Optional reason" />
              </ActionForm>
            </div>
          ) : booking.status === "countered" ? (
            <p className="border-t border-line pt-3 text-[13px] text-ink-3">Waiting for the organiser to accept your counter-offer.</p>
          ) : null
        }
        reply={
          booking.status !== "declined" && booking.status !== "withdrawn" ? (
            <ActionForm action={replyToBookingAction} hidden={hidden} submitLabel="Send reply" variant="primary" pendingLabel="Sending…">
              <Textarea name="body" rows={3} required maxLength={4000} placeholder="Reply to the organiser" />
            </ActionForm>
          ) : null
        }
      />
    </main>
  )
}
