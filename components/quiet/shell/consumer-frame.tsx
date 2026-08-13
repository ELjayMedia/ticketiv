import Link from "next/link";

import { DesktopNav } from "@/components/quiet/shell/desktop-nav";
import { MobileTabBar } from "@/components/quiet/shell/mobile-shell";
import type { UserContext } from "@/lib/data/identity/contexts";

const FOOTER_LINKS = [
  { href: "/help", label: "Help" },
  { href: "/support", label: "Support" },
  { href: "/refund-policy", label: "Refund policy" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/data-deletion", label: "Data deletion" },
] as const;

interface ConsumerFrameProps {
  children: React.ReactNode;
  signedIn?: boolean;
  displayName?: string;
  avatarUrl?: string;
  contexts?: UserContext[];
  activeContextKey?: string | null;
  desktopNav?: React.ReactNode;
}

/** Shared responsive shell for cached public discovery and consumer routes. */
export function ConsumerFrame({
  children,
  signedIn = false,
  displayName,
  avatarUrl,
  contexts = [],
  activeContextKey = null,
  desktopNav,
}: ConsumerFrameProps) {
  return (
    <div className="min-h-dvh">
      <div className="hidden md:block">
        {desktopNav ?? (
          <DesktopNav
            signedIn={signedIn}
            displayName={displayName}
            avatarUrl={avatarUrl}
            contexts={contexts}
            activeContextKey={activeContextKey}
          />
        )}
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

      <div className="block md:hidden">
        <MobileTabBar />
      </div>
    </div>
  );
}
