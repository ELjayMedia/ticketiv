import { redirect } from "next/navigation"
import { requireOrganizerEventManager } from "@/lib/org-management"
import EventWizardClient from "./EventWizardClient"

export const dynamic = "force-dynamic"

export default async function EventEditPage({ params }: { params: Promise<{ orgId: string; eventId: string }> }) {
  const { orgId, eventId } = await params

  // Authorize the organizer (and confirm the event belongs to the org)
  // before rendering the editor; the wizard client fetches its own event
  // data via /api/events/[eventId].
  const { event } = await requireOrganizerEventManager(
    orgId,
    eventId,
    "id, title, description, starts_at, status, venue_id, org_id",
  )

  if (!event) {
    return redirect("/403")
  }

  return <EventWizardClient orgId={orgId} eventId={eventId} />
}
