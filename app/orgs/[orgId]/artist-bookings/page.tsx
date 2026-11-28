import { BookingList } from "@/components/artists/booking-view"
import { BookingsSwitch } from "@/components/organizer/bookings-switch"
import { requireOrganizerSection } from "@/lib/organizer/access"
import { listBookings } from "@/lib/artists/bookings-data"

export const dynamic = "force-dynamic"

/** Booking requests the organisation sent to artists (TICK-461). */
export default async function OrgArtistBookingsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params
  await requireOrganizerSection(orgId, "bookings")
  const bookings = await listBookings({ orgId })
  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex max-w-3xl flex-col gap-5 p-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-h1">Bookings</h1>
          <p className="text-[13px] text-ink-3">
            Send a booking request from a claimed artist&apos;s profile. When they accept, they&apos;re added to the event&apos;s line-up.
          </p>
        </header>
        <BookingsSwitch orgId={orgId} active="artists" />
        <BookingList
          bookings={[...bookings].reverse()}
          hrefFor={(b) => `/orgs/${orgId}/artist-bookings/${b.id}`}
          counterpart={(b) => b.artistName ?? "Artist"}
          empty="No booking requests yet. Open an artist's profile and choose Request booking."
        />
      </div>
    </main>
  )
}
