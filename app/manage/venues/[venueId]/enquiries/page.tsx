import { redirect } from "next/navigation"

import { EnquiryList } from "@/components/venues/enquiry-view"
import { getVenueAccess } from "@/lib/venues/access"
import { listEnquiries } from "@/lib/venues/marketplace-data"

export const dynamic = "force-dynamic"

/** Booking requests (leads) from organisers for this venue (TICK-460, venue MVP). Open ones first. */
export default async function VenueEnquiriesPage({ params }: { params: Promise<{ venueId: string }> }) {
  const { venueId } = await params
  const access = await getVenueAccess(venueId)
  if (!access) return redirect("/403")
  const enquiries = (await listEnquiries({ venueId })).sort((a, b) => Number(b.status === "open") - Number(a.status === "open"))
  const open = enquiries.filter((e) => e.status === "open").length
  const verified = access.venue.verificationStatus === "verified"
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-5 py-8 md:px-10">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Booking requests · {open} open</span>
        <h1 className="text-h1">Booking requests</h1>
        <p className="text-[13px] text-ink-3">
          {verified
            ? "Organisers ask for a date from your venue page. Each request is a lead: reply to agree the details, then accept to book the date (it can't be double-booked) or decline. Contracts and payment are agreed directly with the organiser."
            : "Organisers can send booking requests once Ticketiv has verified the venue."}
        </p>
      </header>
      <EnquiryList
        enquiries={enquiries}
        hrefFor={(e) => `/manage/venues/${venueId}/enquiries/${e.id}`}
        counterpart={(e) => e.orgName ?? "Organiser"}
        empty="No booking requests yet. Organisers find you on your public venue page."
      />
    </main>
  )
}
