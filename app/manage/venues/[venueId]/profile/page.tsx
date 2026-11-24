import { redirect } from "next/navigation"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { VenueProfileForm } from "@/components/venues/venue-forms"
import { updateVenueProfileAction } from "@/app/manage/venues/[venueId]/actions"
import { getVenueAccess } from "@/lib/venues/access"
import { canEditVenueProfile } from "@/lib/venues/core"

export const dynamic = "force-dynamic"

export default async function VenueProfilePage({ params }: { params: Promise<{ venueId: string }> }) {
  const { venueId } = await params
  const access = await getVenueAccess(venueId)
  if (!access) return redirect("/403")

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-5 py-8 md:px-10">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Venue profile</span>
        <h1 className="text-h1">{access.venue.name}</h1>
        <p className="text-[13px] text-ink-3">
          {access.venue.city}. The name and town are how attendees and organisers find the venue; contact Ticketiv support to change them.
        </p>
      </header>
      <Card>
        <CardBody className="p-5">
          <VenueProfileForm venue={access.venue} action={updateVenueProfileAction} readOnly={!canEditVenueProfile(access.role)} />
        </CardBody>
      </Card>
    </main>
  )
}
