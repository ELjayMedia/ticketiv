import Link from "next/link"

import { EnquiryList } from "@/components/venues/enquiry-view"
import { requireOrganizerSection } from "@/lib/organizer/access"
import { listEnquiries } from "@/lib/venues/marketplace-data"

export const dynamic = "force-dynamic"

/** The organisation's venue enquiries and bookings (TICK-460). */
export default async function OrgVenueEnquiriesPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params
  await requireOrganizerSection(orgId, "bookings")
  const enquiries = await listEnquiries({ orgId })
  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex max-w-3xl flex-col gap-5 p-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-h1">Venue enquiries</h1>
          <p className="text-[13px] text-ink-3">
            Ask a verified venue for a date from its page. When the venue accepts, the date is booked for you and you can create
            the event draft with the venue and times filled in.{" "}
            <Link href="/venues" className="font-semibold text-accent hover:underline">
              Find a venue
            </Link>
          </p>
        </header>
        <EnquiryList
          enquiries={enquiries}
          hrefFor={(e) => `/orgs/${orgId}/venue-enquiries/${e.id}`}
          counterpart={(e) => e.venueName ?? "Venue"}
          empty="No enquiries yet. Find a venue and ask about a date."
        />
      </div>
    </main>
  )
}
