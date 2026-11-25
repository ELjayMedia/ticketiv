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
          <h1 className="text-h1">Venue requests</h1>
          <p className="text-[13px] text-ink-3">
            Send a verified venue a booking request from its page. The venue team gets it as a lead and replies here. If they accept,
            the date is held for you and you can create the event draft with the venue and times filled in. Contracts and payment are
            agreed with the venue directly.{" "}
            <Link href="/venues" className="font-semibold text-accent hover:underline">
              Find a venue
            </Link>
          </p>
        </header>
        <EnquiryList
          enquiries={enquiries}
          hrefFor={(e) => `/orgs/${orgId}/venue-enquiries/${e.id}`}
          counterpart={(e) => e.venueName ?? "Venue"}
          empty="No venue requests yet. Find a venue and send a booking request."
        />
      </div>
    </main>
  )
}
