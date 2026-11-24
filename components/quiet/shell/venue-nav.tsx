"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/quiet/ui/icon";
import { BrandLockup } from "@/components/brand/brand-mark";
import { cn } from "@/lib/cn";

/* ──────────────────────────────────────────────────────────────
 * Venue workspace navigation for every /manage/venues/[venueId]/… page
 * (TICK-481). Same shape as the organizer workspace: a sidebar on desktop,
 * a sticky strip of section tabs on phones.
 *
 * Spaces (TICK-482), calendar and enquiries (TICK-460) follow the profile.
 * ────────────────────────────────────────────────────────────── */

interface VenueNavItem {
  label: string;
  icon: IconName;
  /** Path segment under /manage/venues/[venueId]; "" is the overview. */
  path: string;
}

export const VENUE_NAV_ITEMS: VenueNavItem[] = [
  { label: "Overview", icon: "trending", path: "" },
  { label: "Venue profile", icon: "building", path: "profile" },
  { label: "Spaces", icon: "map", path: "spaces" },
  { label: "Calendar", icon: "cal", path: "calendar" },
  { label: "Enquiries", icon: "clipboard", path: "enquiries" },
  { label: "Team", icon: "users", path: "team" },
];

function itemHref(item: VenueNavItem, venueId: string) {
  return item.path ? `/manage/venues/${venueId}/${item.path}` : `/manage/venues/${venueId}`;
}

export function isVenueNavItemActive(item: VenueNavItem, venueId: string, pathname: string): boolean {
  const base = `/manage/venues/${venueId}`;
  if (!item.path) return pathname === base;
  return pathname === `${base}/${item.path}` || pathname.startsWith(`${base}/${item.path}/`);
}

interface VenueNavProps {
  venueId: string;
  venueName: string;
  roleLabel: string;
  verified: boolean;
}

function VerifiedMark({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 text-success">
      <Icon name="checkCircle" size={11} />
      Verified
    </span>
  ) : (
    <span className="text-warning">Unverified</span>
  );
}

export function VenueSidebar({ venueId, venueName, roleLabel, verified }: VenueNavProps) {
  const pathname = usePathname() ?? "";
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface md:flex print:hidden">
      <div className="px-4 pt-4">
        <BrandLockup size={20} textClassName="text-[13px]" />
      </div>
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-4">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] bg-success text-white">
          <Icon name="building" size={16} />
        </span>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-[14px] font-semibold text-ink">{venueName}</span>
          <span className="flex gap-1.5 truncate font-mono text-[10px] uppercase tracking-wider text-ink-3">
            {roleLabel} · <VerifiedMark verified={verified} />
          </span>
        </div>
      </div>

      <nav aria-label="Venue workspace" className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        {VENUE_NAV_ITEMS.map((item) => {
          const active = isVenueNavItemActive(item, venueId, pathname);
          return (
            <Link
              key={item.label}
              href={itemHref(item, venueId)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-[var(--radius)] px-3 py-2 text-[14px] font-medium transition-colors",
                active ? "bg-accent-soft text-accent" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
              )}
            >
              <Icon name={item.icon} size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-0.5 border-t border-line p-2">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-[var(--radius)] px-3 py-2 text-[13px] font-medium text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <Icon name="ticket" size={16} />
          Go to Ticketiv
          <Icon name="arrowUR" size={13} className="ml-auto" />
        </Link>
      </div>
    </aside>
  );
}

export function VenueTopTabs({ venueId, venueName }: VenueNavProps) {
  const pathname = usePathname() ?? "";
  return (
    <div className="sticky top-0 z-30 border-b border-line bg-surface pt-[env(safe-area-inset-top)] md:hidden print:hidden">
      <div className="flex items-center gap-2 px-4 pb-1 pt-2.5">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-success text-white">
          <Icon name="building" size={12} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">{venueName}</span>
        <Link
          href="/"
          className="inline-flex items-center gap-1 rounded-full border border-line-2 px-2.5 py-1 text-[12px] font-medium text-ink-2 hover:bg-surface-2"
        >
          <Icon name="ticket" size={13} />
          Ticketiv
        </Link>
      </div>
      <nav aria-label="Venue workspace" className="flex gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none]">
        {VENUE_NAV_ITEMS.map((item) => {
          const active = isVenueNavItemActive(item, venueId, pathname);
          return (
            <Link
              key={item.label}
              href={itemHref(item, venueId)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
                active ? "bg-ink text-surface" : "text-ink-2 hover:bg-surface-2",
              )}
            >
              <Icon name={item.icon} size={14} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
