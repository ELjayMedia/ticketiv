import { redirect } from "next/navigation";
import { FriendsScreen } from "@/components/quiet/screens/friends/friends-screen";
import { getMyFriendsOverview } from "@/lib/data/attendee/friends";
import { mapFriends } from "@/lib/mappers/friends";

export const metadata = { title: "Friends" };
export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const overview = await getMyFriendsOverview();
  if (!overview) {
    redirect("/login");
  }

  const props = mapFriends(overview!);

  return (
    <div className="mx-auto max-w-[480px]">
      <FriendsScreen {...props} />
    </div>
  );
}
