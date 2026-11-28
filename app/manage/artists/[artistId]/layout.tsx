import type React from "react"
import { redirect } from "next/navigation"

import { ArtistSidebar, ArtistTopTabs } from "@/components/quiet/shell/artist-nav"
import { getArtistAccess } from "@/lib/artists/access"
import { artistRoleLabel } from "@/lib/artists/core"
import { getAuthUser } from "@/lib/auth/session"

export const dynamic = "force-dynamic"
export const metadata = { title: "Artist workspace · Ticketiv" }

/** Artist workspace for /manage/artists/[artistId]/… (TICK-484). Owners and managers only. */
export default async function ArtistWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ artistId: string }>
}) {
  const { artistId } = await params
  if (!(await getAuthUser())) return redirect(`/login?from=/manage/artists/${artistId}`)
  const access = await getArtistAccess(artistId)
  if (!access) return redirect("/403")
  const navProps = {
    artistId,
    artistName: access.artist.name,
    roleLabel: artistRoleLabel(access.role),
    verified: access.artist.verified,
  }
  return (
    <div className="min-h-dvh bg-bg md:flex">
      <ArtistSidebar {...navProps} />
      <ArtistTopTabs {...navProps} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
