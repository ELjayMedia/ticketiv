"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/quiet/ui/icon";
import { Button } from "@/components/quiet/ui/button";
import { Avatar } from "@/components/quiet/ui/primitives";
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
}

export function DesktopNav({
  breadcrumb,
  avatarUrl,
  signedIn = false,
}: DesktopNavProps) {
  const pathname = usePathname();

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-10 py-3">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-md bg-accent text-[12px] font-bold text-white">
            T
          </span>
          <span className="text-[15px] font-semibold tracking-tight">ticketiv</span>
        </Link>

        {breadcrumb ? (
          <>
            <span className="h-4 w-px bg-line" />
            <span className="font-mono text-[11px] text-ink-3">{breadcrumb}</span>
          </>
        ) : (
          <nav className="ml-4 flex gap-4 text-[13px]">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "py-1 transition-colors",
                    active ? "text-ink font-medium" : "text-ink-3 hover:text-ink"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        <span className="flex-1" />

        {/* Universal search */}
        <button className="hidden items-center gap-2 rounded-md border border-line-2 bg-bg px-3 py-1.5 text-[12px] text-ink-3 hover:border-line lg:flex">
          <Icon name="search" size={14} />
          <span>Search events, artists, venues</span>
          <span className="ml-6 rounded border border-line bg-surface px-1.5 font-mono text-[10px]">
            ⌘K
          </span>
        </button>

        {signedIn ? (
          <>
            <Button variant="ghost" size="xs" className="text-ink-3">
              <Icon name="bell" size={16} />
            </Button>
            <Avatar src={avatarUrl} size={28} />
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="text-[13px] text-ink-3 hover:text-ink"
            >
              Sign in
            </Link>
            <Link
              href="/onboarding/organizer"
              className="inline-flex items-center gap-1.5 rounded-[var(--radius)] bg-accent px-3 py-1.5 text-[13px] font-semibold text-white hover:opacity-90"
            >
              For organizers
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
