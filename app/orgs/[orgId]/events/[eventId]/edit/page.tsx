import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getDemoEventById } from "@/lib/demo-data"
import { requireOrganizerEventManager } from "@/lib/org-management"
import EventWizardClient from "./EventWizardClient"

export const dynamic = "force-dynamic"

export default async function EventEditPage({ params }: { params: { orgId: string; eventId: string } }) {
  const { orgId, eventId } = params
  const cookieStore = await cookies()
  const demoSessionCookie = cookieStore.get("demo_session")

  let event: any = null

  if (demoSessionCookie) {
    try {
      event = getDemoEventById(eventId)
      if (!event) {
        return redirect("/403")
      }
    } catch (error) {
      console.error("[v0] Failed to load demo event:", error)
      return redirect("/403")
    }
  } else {
    // Authorize the organizer (and confirm the event belongs to the org)
    // before rendering the editor; the wizard client fetches its own event
    // data via /api/events/[eventId].
    await requireOrganizerEventManager(
      orgId,
      eventId,
      "id, title, description, starts_at, status, venue_id, org_id",
    )
  }

  return <EventWizardClient orgId={orgId} eventId={eventId} />
}
