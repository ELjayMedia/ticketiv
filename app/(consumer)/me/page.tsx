import { redirect } from "next/navigation";
import { ProfileScreen } from "@/components/quiet/screens/profile/profile-screen";
import { getMyProfile } from "@/lib/data/attendee/profile";
import { getMyTapBandProfile } from "@/lib/data/attendee/tapband";
import { getMyContexts } from "@/lib/data/identity/contexts";
import { mapProfile } from "@/lib/mappers/profile";

export const metadata = { title: "You" };
export const dynamic = "force-dynamic";

export default async function MePage() {
  const [profile, tapBand, contexts] = await Promise.all([
    getMyProfile(),
    getMyTapBandProfile(),
    getMyContexts(),
  ]);
  if (!profile) {
    redirect("/login?next=/me");
  }

  const organizerWorkspaces = contexts
    .filter((context) => context.kind === "org")
    .map(({ key, label, sublabel, href }) => ({ key, label, sublabel, href }));

  // getMyContexts already resolves the platform-admin context for super admins
  // (kind "admin", href /super-admin). It was being filtered out here, so a
  // super admin with no organizations saw the self-serve "organize your own
  // event" funnel instead of a way into the command centre.
  const admin = contexts.find((context) => context.kind === "admin");

  return (
    <div className="mx-auto max-w-[480px]">
      <ProfileScreen
        user={mapProfile(profile)}
        tapBand={tapBand}
        orgContexts={organizerWorkspaces}
        adminContext={
          admin ? { label: "Super admin dashboard", sublabel: admin.sublabel, href: admin.href } : null
        }
      />
    </div>
  );
}
