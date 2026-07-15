import { redirect } from "next/navigation"

import { ProfileScreen } from "@/components/quiet/screens/profile/profile-screen"
import { getMyProfile } from "@/lib/data/attendee/profile"
import { getMyTapBandProfile } from "@/lib/data/attendee/tapband"
import { mapProfile } from "@/lib/mappers/profile"

export const metadata = { title: "Profile" }
export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  const [profile, tapBand] = await Promise.all([getMyProfile(), getMyTapBandProfile()])
  if (!profile) {
    redirect("/login")
  }

  return (
    <div className="mx-auto max-w-[480px]">
      <ProfileScreen user={mapProfile(profile!)} tapBand={tapBand} />
    </div>
  )
}
