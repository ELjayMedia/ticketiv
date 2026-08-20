import { redirect } from "next/navigation"

import { ContactDiscoveryScreen } from "@/components/quiet/screens/friends/contact-discovery-screen"
import { getMyFriendsOverview } from "@/lib/data/attendee/friends"
import { getMySocialPrivacySettings } from "@/lib/data/attendee/social-privacy"
import { mapFriends } from "@/lib/mappers/friends"

export const metadata = { title: "Find people" }
export const dynamic = "force-dynamic"

export default async function FindPeoplePage() {
  const [overview, privacy] = await Promise.all([
    getMyFriendsOverview(),
    getMySocialPrivacySettings(),
  ])

  if (!overview || !privacy) {
    redirect("/login?next=/friends/find")
  }

  const { inviteLink } = mapFriends(overview)

  return (
    <ContactDiscoveryScreen
      inviteLink={inviteLink}
      discoverByPhone={privacy.discoverByPhone}
    />
  )
}
