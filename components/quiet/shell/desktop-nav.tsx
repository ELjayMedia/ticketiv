"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/quiet/ui/icon";
import { Avatar } from "@/components/quiet/ui/primitives";
import { SearchTrigger } from "@/components/quiet/search/search-overlay";
import { ContextSwitcher } from "@/components/quiet/shell/context-switcher";
import type { UserContext } from "@/lib/data/identity/contexts";
import { cn } from "@/lib/cn";

const NAV_ITEMS = [
  { href: "/", label: "Discover" },
  { href: "/series", label: "Series" },
  { href: "/calendar", label: "Calendar" },
  { href: "/organizers", label: "Organizers" },
];

interface DesktopNavProps {
  /** Optional crumb to show after the divider, e.g. "Discover › Music › Tribal Tales" */
  breadcrumb?: string;
  /** Logged-in user's avatar URL */
  avatarUrl?: string;
  /** Show "Sign in" CTA instead of avatar when not authenticated */
  signedIn?: boolean;
  /** Signed-in user's display name (first name preferred) */
  displayName?: string;
  /** Context-switcher entries from the effective-roles resolver (TICK-275). */
  contexts?: UserContext[];
  /** The user's last-used context key (cookie-persisted). */
  activeContextKey?: string | null;
}

export function DesktopNav({
  breadcrumb,
  avatarUrl,
  signedIn = false,
  displayName,
  contexts = [],
  activeContextKey = null,
}: DesktopNavProps) {
  const pathname = usePathname() ?? "";
  const showSwitcher = contexts.length > 1;

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-5 px-10">
        {/* Brand */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius)] bg-accent text-[14px] font-bold text-white">
            T
          </span>
          <span className="text-[18px] font-semibold tracking-tight">ticketiv</span>
        </Link>

        {showSwitcher && <ContextSwitcher contexts={contexts} activeKey={activeContextKey} />}

        {breadcrumb && (
          <>
            <span className="h-4 w-px bg-line" />
            <span className="font-mono text-[11px] text-ink-3">{breadcrumb}</span>
          </>
        )}

        {/* Universal search — the header's centrepiece */}
        <SearchTrigger className="mx-auto hidden h-11 min-w-0 max-w-[560px] flex-1 items-center gap-2.5 rounded-full border border-line-2 bg-bg px-5 text-[14px] text-ink-3 transition-colors hover:border-line hover:bg-surface hover:text-ink md:flex">
          <span className="flex-1 truncate">Search events, artists, venues…</span>
          <span className="hidden rounded border border-line bg-surface px-1.5 font-mono text-[10px] lg:inline">⌘K</span>
          <Icon name="search" size={18} className="text-ink-2" />
        </SearchTrigger>
        <Link
          href="/search"
          aria-label="Search events"
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60 md:hidden"
        >
          <Icon name="search" size={18} />
        </Link>

        {!breadcrumb && (
          <nav className="hidden shrink-0 items-center gap-1 text-[14px] font-medium lg:flex">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-[var(--radius)] px-3 py-2 transition-colors",
                    active ? "text-ink" : "text-ink-2 hover:bg-bg hover:text-ink"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        <Link
          href="/favourites"
          aria-label="Saved events"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-bg hover:text-ink"
        >
          <Icon name="heart" size={20} />
        </Link>

        {signedIn ? (
          <>
            {displayName && (
              <span className="hidden max-w-[180px] truncate text-[12px] text-ink-3 lg:inline">
                Hi, {displayName}
              </span>
            )}
            <Link
              href="/notifications"
              aria-label="Notifications"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-bg hover:text-ink"
            >
              <Icon name="bell" size={20} />
            </Link>
            <Avatar src={avatarUrl} size={28} />
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="shrink-0 text-[14px] font-medium text-ink-2 hover:text-ink"
            >
              Sign in
            </Link>
            <Link
              href="/onboarding/organizer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius)] bg-accent px-3.5 py-2 text-[14px] font-semibold text-white hover:opacity-90"
            >
              For organizers
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
