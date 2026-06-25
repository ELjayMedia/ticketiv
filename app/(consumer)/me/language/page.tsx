import { redirect } from "next/navigation"

import { LanguageScreen } from "@/components/quiet/screens/account/language-screen"
import { getMyProfile } from "@/lib/data/attendee/profile"

export const metadata = { title: "Language" }
export const dynamic = "force-dynamic"

export default async function LanguagePage() {
  const profile = await getMyProfile()
  if (!profile) {
    redirect("/login")
  }

  return <LanguageScreen current={profile!.locale} />
}
