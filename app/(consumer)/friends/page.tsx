import { FriendsScreen } from "@/components/quiet/screens/friends/friends-screen";

export const metadata = { title: "Friends" };

export default function FriendsPage() {
  return (
    <div className="mx-auto max-w-[480px]">
      <FriendsScreen />
    </div>
  );
}
