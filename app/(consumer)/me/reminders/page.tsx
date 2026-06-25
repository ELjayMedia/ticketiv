import { redirect } from "next/navigation"

import { RemindersScreen } from "@/components/quiet/screens/account/reminders-screen"
import { getAccountSettings } from "@/lib/data/attendee/account-settings"

export const metadata = { title: "Reminders" }
export const dynamic = "force-dynamic"

export default async function RemindersPage() {
  const settings = await getAccountSettings()
  if (!settings) {
    redirect("/login")
  }

  return <RemindersScreen initial={settings!.notifications} />
}
