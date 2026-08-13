import { ConsumerFrame } from "@/components/quiet/shell/consumer-frame";
import { getCurrentUserProfile } from "@/lib/auth";
import { getMyContexts } from "@/lib/data/identity/contexts";
import { getActiveContextKey } from "@/lib/identity/context";

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

  const [contexts, activeContextKey] = profile
    ? await Promise.all([getMyContexts(), getActiveContextKey()])
    : [[], null];

  const displayName = profile?.full_name
    ? profile.full_name.split(" ")[0]
    : profile?.email
    ? profile.email.split("@")[0]
    : undefined;

  return (
    <ConsumerFrame
      signedIn={!!profile}
      displayName={displayName}
      avatarUrl={profile?.avatar_url ?? undefined}
      contexts={contexts}
      activeContextKey={activeContextKey}
    >
      {children}
    </ConsumerFrame>
  );
}
