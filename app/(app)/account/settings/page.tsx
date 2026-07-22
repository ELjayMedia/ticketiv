import { redirect } from "next/navigation"

import { AccountSettingsScreen } from "@/components/quiet/screens/account/account-settings-screen"
import { getAccountSettings } from "@/lib/data/attendee/account-settings"

export const metadata = { title: "Account settings" }
export const dynamic = "force-dynamic"

export default async function AccountSettingsPage() {
  const settings = await getAccountSettings()
  if (!settings) {
    redirect("/login?next=/account/settings")
  }

  return <AccountSettingsScreen settings={settings} />
}
