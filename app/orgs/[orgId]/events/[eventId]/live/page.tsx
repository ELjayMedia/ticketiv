import { redirect } from "next/navigation"

/** Retired: Door live is now the Live tab of the event's Door page. */
export default async function DoorLivePage({ params }: { params: Promise<{ orgId: string; eventId: string }> }) {
  const { orgId, eventId } = await params
  redirect(`/orgs/${orgId}/events/${eventId}/door?view=live`)
}
