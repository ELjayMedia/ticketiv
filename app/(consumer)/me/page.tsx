import { ProfileScreen } from "@/components/quiet/screens/profile/profile-screen";

export const metadata = { title: "You" };

export default function MePage() {
  return (
    <div className="mx-auto max-w-[480px]">
      <ProfileScreen />
    </div>
  );
}
