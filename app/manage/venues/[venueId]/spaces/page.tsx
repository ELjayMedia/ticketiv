import { redirect } from "next/navigation"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { ActionForm, SpaceForm } from "@/components/venues/marketplace-forms"
import { deleteVenueSpaceAction, saveVenueSpaceAction } from "@/app/manage/venues/[venueId]/marketplace-actions"
import { getVenueAccess } from "@/lib/venues/access"
import { canEditVenueProfile } from "@/lib/venues/core"
import { ACCESSIBILITY, AMENITIES, formatRate, formatSpaceCapacity } from "@/lib/venues/marketplace"
import { getVenueSpaces } from "@/lib/venues/marketplace-data"

export const dynamic = "force-dynamic"

/** Spaces, facilities and indicative rates (TICK-482). */
export default async function VenueSpacesPage({ params }: { params: Promise<{ venueId: string }> }) {
  const { venueId } = await params
  const access = await getVenueAccess(venueId)
  if (!access) return redirect("/403")
  const canEdit = canEditVenueProfile(access.role)
  const spaces = await getVenueSpaces(venueId)
  const verified = access.venue.verificationStatus === "verified"

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-5 py-8 md:px-10">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Spaces</span>
        <h1 className="text-h1">Spaces and rates</h1>
        <p className="text-[13px] text-ink-3">
          List each room or area organisers can book. Spaces marked public appear on your venue page
          {verified ? "." : " once Ticketiv has verified the venue."} Rates are a guide; you agree the contract and payment with the organiser.
        </p>
      </header>

      {spaces.length === 0 ? (
        <Card flat className="border-dashed">
          <CardBody className="p-5 text-[13px] text-ink-3">No spaces yet. Add the main room first; organisers can also enquire about the whole venue.</CardBody>
        </Card>
      ) : (
        spaces.map((space) => {
          const capacity = formatSpaceCapacity(space.capacityStanding, space.capacitySeated)
          const rate = formatRate(space.rateCents, space.rateCurrency, space.rateUnit)
          return (
            <Card key={space.id}>
              <CardBody className="flex flex-col gap-3 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-h2">{space.name}</h2>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{space.isPublic ? "Public" : "Hidden"}</span>
                </div>
                <p className="text-[13px] text-ink-3">{[capacity, rate].filter(Boolean).join(" · ") || "No capacity or rate yet"}</p>
                {space.amenities.length + space.accessibility.length > 0 ? (
                  <p className="text-[13px] text-ink-2">
                    {[
                      ...space.amenities.map((a) => AMENITIES[a as keyof typeof AMENITIES] ?? a),
                      ...space.accessibility.map((a) => ACCESSIBILITY[a as keyof typeof ACCESSIBILITY] ?? a),
                    ].join(" · ")}
                  </p>
                ) : null}
                {canEdit ? (
                  <details className="rounded-md border border-line p-3">
                    <summary className="cursor-pointer text-[13px] font-semibold text-accent">Edit {space.name}</summary>
                    <div className="mt-4 flex flex-col gap-4">
                      <SpaceForm venueId={venueId} space={space} action={saveVenueSpaceAction} />
                      <ActionForm
                        action={deleteVenueSpaceAction}
                        hidden={{ venueId, spaceId: space.id }}
                        submitLabel="Delete space"
                        variant="ghost"
                        confirm={`Delete ${space.name}? Past bookings keep their dates.`}
                      />
                    </div>
                  </details>
                ) : null}
              </CardBody>
            </Card>
          )
        })
      )}

      {canEdit ? (
        <Card>
          <CardBody className="flex flex-col gap-4 p-5">
            <h2 className="text-h2">Add a space</h2>
            <SpaceForm venueId={venueId} action={saveVenueSpaceAction} />
          </CardBody>
        </Card>
      ) : (
        <p className="text-[13px] text-ink-3">Staff can view spaces. Ask an owner or manager to change them.</p>
      )}
    </main>
  )
}
