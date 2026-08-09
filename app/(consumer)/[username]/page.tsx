import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { PublicProfileScreen } from "@/components/quiet/screens/profile/public-profile-screen"
import { getPublicProfile } from "@/lib/data/attendee/public-profile"

export const dynamic = "force-dynamic"

interface PublicProfilePageProps {
  params: Promise<{ username: string }>
}

function parseHandle(username: string) {
  let decoded: string
  try {
    decoded = decodeURIComponent(username)
  } catch {
    return null
  }

  if (!decoded.startsWith("@")) return null
  return decoded.slice(1)
}

export async function generateMetadata({
  params,
}: PublicProfilePageProps): Promise<Metadata> {
  const handle = parseHandle((await params).username)
  if (!handle) return { title: "Profile not found" }

  const profile = await getPublicProfile(handle)
  if (!profile) return { title: "Profile not found" }

  return {
    title: `${profile.displayName} (@${profile.handle})`,
    description: `View ${profile.displayName}'s profile on Ticketiv.`,
  }
}

export default async function PublicProfilePage({
  params,
}: PublicProfilePageProps) {
  const handle = parseHandle((await params).username)
  if (!handle) notFound()

  const profile = await getPublicProfile(handle)
  if (!profile) notFound()

  return <PublicProfileScreen profile={profile} />
}
