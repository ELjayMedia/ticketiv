import { redirect } from "next/navigation"

import { AccountSettingsScreen } from "@/components/quiet/screens/account/account-settings-screen"
import { getAccountSettings } from "@/lib/data/attendee/account-settings"

export const metadata = { title: "Account settings" }
export const dynamic = "force-dynamic"

type SettingsTab = "profile" | "notifications" | "security"

function parseTab(value: string | string[] | undefined): SettingsTab {
  const tab = Array.isArray(value) ? value[0] : value
  return tab === "notifications" || tab === "security" ? tab : "profile"
}

export default async function AccountSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>
}) {
  const settings = await getAccountSettings()
  if (!settings) {
    redirect("/login?next=/account/settings")
  }

  const params = await searchParams
  return <AccountSettingsScreen settings={settings} initialTab={parseTab(params.tab)} />
}
