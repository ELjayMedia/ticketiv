import type React from "react"
import { redirect } from "next/navigation"

import { VenueSidebar, VenueTopTabs } from "@/components/quiet/shell/venue-nav"
import { getAuthUser } from "@/lib/auth/session"
import { getVenueAccess } from "@/lib/venues/access"
import { venueRoleLabel } from "@/lib/venues/core"

export const dynamic = "force-dynamic"
export const metadata = { title: "Venue workspace · Ticketiv" }

/**
 * Venue workspace for /manage/venues/[venueId]/… (TICK-481).
 * Admits venue_members of this venue only. Each page re-reads access and
 * every write goes through an RPC that checks the role again.
 */
export default async function VenueWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ venueId: string }>
}) {
  const { venueId } = await params
  if (!(await getAuthUser())) return redirect(`/login?from=/manage/venues/${venueId}`)

  const access = await getVenueAccess(venueId)
  if (!access) return redirect("/403")

  const navProps = {
    venueId,
    venueName: access.venue.name,
    roleLabel: venueRoleLabel(access.role),
    verified: access.venue.verificationStatus === "verified",
  }

  return (
    <div className="min-h-dvh bg-bg md:flex">
      <VenueSidebar {...navProps} />
      <VenueTopTabs {...navProps} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
