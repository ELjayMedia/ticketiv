import { redirect } from "next/navigation";
import { ProfileScreen } from "@/components/quiet/screens/profile/profile-screen";
import { getMyProfile } from "@/lib/data/attendee/profile";
import { mapProfile } from "@/lib/mappers/profile";

export const metadata = { title: "You" };
export const dynamic = "force-dynamic";

export default async function MePage() {
  const profile = await getMyProfile();
  if (!profile) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-[480px]">
      <ProfileScreen user={mapProfile(profile!)} />
    </div>
  );
}
