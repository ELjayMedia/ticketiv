import Link from "next/link";

import { DesktopNav } from "@/components/quiet/shell/desktop-nav";
import { MobileTabBar } from "@/components/quiet/shell/mobile-shell";
import { getCurrentUserProfile } from "@/lib/auth";
import { getMyContexts } from "@/lib/data/identity/contexts";
import { getActiveContextKey } from "@/lib/identity/context";

const FOOTER_LINKS = [
  { href: "/help", label: "Help" },
  { href: "/support", label: "Support" },
  { href: "/refund-policy", label: "Refund policy" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/data-deletion", label: "Data deletion" },
] as const;

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
    <div className="min-h-dvh">
      {/* Desktop nav (≥ md) */}
      <div className="hidden md:block">
        <DesktopNav
          signedIn={!!profile}
          displayName={displayName}
          avatarUrl={profile?.avatar_url ?? undefined}
          contexts={contexts}
          activeContextKey={activeContextKey}
        />
      </div>

      <main className="pb-20 md:pb-12">{children}</main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-5 py-6 pb-28 md:flex-row md:items-center md:justify-between md:px-10 md:pb-6">
          <div>
            <p className="text-[13px] font-semibold text-ink">Ticketiv</p>
            <p className="mt-1 text-[12px] text-ink-3">
              Discover, book and manage tickets across Southern Africa.
            </p>
          </div>
          <nav
            aria-label="Legal and support"
            className="flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-ink-3"
          >
            {FOOTER_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-ink">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>

      {/* Mobile tab bar (< md) */}
      <div className="block md:hidden">
        <MobileTabBar />
      </div>
    </div>
  );
}
