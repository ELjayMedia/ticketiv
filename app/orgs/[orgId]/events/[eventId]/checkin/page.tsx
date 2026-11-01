import { redirect } from "next/navigation"

/**
 * Retired duplicate scanner (ADR 0002). /scan is the single scanner (offline,
 * device pairing); old links land on this event's scanner entry instead.
 */
export default async function EventCheckinPage({ params }: { params: Promise<{ orgId: string; eventId: string }> }) {
  const { orgId, eventId } = await params
  redirect(`/orgs/${orgId}/events/${eventId}/scanner`)
}
