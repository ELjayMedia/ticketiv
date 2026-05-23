"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/quiet/ui/icon";
import { SearchTrigger } from "@/components/quiet/search/search-overlay";
import { cn } from "@/lib/cn";

interface TabItem {
  href: string;
  icon: IconName;
  label: string;
  match: (pathname: string) => boolean;
}

const TABS: TabItem[] = [
  {
    href: "/",
    icon: "spark",
    label: "Discover",
    match: (p) => p === "/" || p.startsWith("/events"),
  },
  {
    href: "/calendar",
    icon: "cal",
    label: "Calendar",
    match: (p) => p.startsWith("/calendar"),
  },
  {
    href: "/tickets",
    icon: "ticket",
    label: "Tickets",
    match: (p) => p.startsWith("/tickets") || p.startsWith("/orders"),
  },
  {
    href: "/friends",
    icon: "users",
    label: "Friends",
    match: (p) => p.startsWith("/friends"),
  },
  {
    href: "/me",
    icon: "user",
    label: "Me",
    match: (p) => p.startsWith("/me"),
  },
];

/* ── Mobile bottom tab bar ──────────────────────────────── */
export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="sticky bottom-0 z-30 flex border-t border-line bg-surface pt-2.5 pb-7"
      aria-label="Primary"
    >
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 text-[10px] font-semibold uppercase tracking-wide",
              active ? "text-ink" : "text-ink-3"
            )}
          >
            <Icon name={tab.icon} size={22} strokeWidth={active ? 2 : 1.6} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/* ── Mobile top bar ─────────────────────────────────────── */
interface MobileTopBarProps {
  /** Shows a back chevron instead of the logo if provided */
  back?: string;
  /** Title shown center (when back is set) */
  title?: string;
  /** Right-aligned slot */
  action?: React.ReactNode;
  /** Show the unread-notification dot on the bell */
  hasNotifications?: boolean;
}

export function MobileTopBar({
  back,
  title,
  action,
  hasNotifications,
}: MobileTopBarProps) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 bg-bg px-5 pt-4 pb-3">
      {back ? (
        <>
          <Link
            href={back}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60"
            aria-label="Back"
          >
            <Icon name="chevL" size={20} />
          </Link>
          {title && (
            <span className="text-h3 truncate">{title}</span>
          )}
        </>
      ) : (
        <Link href="/" className="inline-flex items-center gap-1.5">
          <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-md bg-accent text-[12px] font-bold text-white">
            T
          </span>
          <span className="text-[17px] font-semibold tracking-tight">ticketiv</span>
        </Link>
      )}
      {!back && (
        <span className="ml-1.5 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-3">
          BETA
        </span>
      )}
      <span className="flex-1" />
      {action ?? (
        <>
          <SearchTrigger
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60"
            aria-label="Search"
          >
            <Icon name="search" size={20} />
          </SearchTrigger>
          <Link
            href="/notifications"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60"
            aria-label="Notifications"
          >
            <Icon name="bell" size={20} />
            {hasNotifications && (
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent" />
            )}
          </Link>
        </>
      )}
    </header>
  );
}
