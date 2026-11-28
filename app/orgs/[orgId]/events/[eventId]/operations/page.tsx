import { redirect } from "next/navigation"

/** Retired: status controls live on the event overview; live counts on the Door page. */
export default async function EventOperationsPage({ params }: { params: Promise<{ orgId: string; eventId: string }> }) {
  const { orgId, eventId } = await params
  redirect(`/orgs/${orgId}/events/${eventId}`)
}
