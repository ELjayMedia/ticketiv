import { redirect } from "next/navigation"

import { FriendsSettingsScreen } from "@/components/quiet/screens/friends/friends-settings-screen"
import { getMySocialPrivacySettings } from "@/lib/data/attendee/social-privacy"

export const metadata = { title: "Friends privacy" }
export const dynamic = "force-dynamic"

export default async function FriendsSettingsPage() {
  const settings = await getMySocialPrivacySettings()
  if (!settings) redirect("/login?next=/friends/settings")

  return <FriendsSettingsScreen settings={settings} />
}
