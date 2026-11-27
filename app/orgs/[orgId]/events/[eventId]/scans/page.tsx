import { redirect } from "next/navigation"

/** Retired: scan history is now the Scan history tab of the event's Door page. */
export default async function ScansPage({ params }: { params: Promise<{ orgId: string; eventId: string }> }) {
  const { orgId, eventId } = await params
  redirect(`/orgs/${orgId}/events/${eventId}/door?view=scans`)
}
