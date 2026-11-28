import { redirect } from "next/navigation"

/** One Bookings section: venue requests first, artists one tap away. */
export default async function OrgBookingsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params
  redirect(`/orgs/${orgId}/venue-enquiries`)
}
