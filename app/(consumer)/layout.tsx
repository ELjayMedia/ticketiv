import { DesktopNav } from "@/components/quiet/shell/desktop-nav";
import { MobileTabBar } from "@/components/quiet/shell/mobile-shell";
import { getCurrentUserProfile } from "@/lib/auth";

/**
 * Consumer surface layout.
 *
 * On mobile we render a tab bar; on desktop a slim top nav.
 * Both shells are present in the DOM and toggled with Tailwind's
 * responsive utilities — this lets server components stay
 * server components (no useMediaQuery dance) and matches the
 * Linear/Vercel approach of two distinct shells, not one
 * responsive blob.
 */
export default async function ConsumerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userSession = await getCurrentUserProfile();
  const profile = userSession?.profile ?? null;

  const displayName = profile?.full_name
    ? profile.full_name.split(" ")[0]
    : profile?.email
    ? profile.email.split("@")[0]
    : undefined;

  return (
    <div className="min-h-dvh">
      {/* Desktop nav (≥ md) */}
      <div className="hidden md:block">
        <DesktopNav
          signedIn={!!profile}
          displayName={displayName}
          avatarUrl={profile?.avatar_url ?? undefined}
        />
      </div>

      <main className="pb-20 md:pb-12">{children}</main>

      {/* Mobile tab bar (< md) */}
      <div className="block md:hidden">
        <MobileTabBar />
      </div>
    </div>
  );
}
