"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/quiet/ui/icon";
import { isFocusedAttendeePath } from "@/components/quiet/shell/mobile-shell";
import { cn } from "@/lib/cn";

export interface AccountNavItem {
  href: string;
  label: string;
  icon: IconName;
}

/**
 * The signed-in attendee's own pages. On mobile these are reached through the
 * tab bar and the "You" screen; on desktop they share one sidebar so the pages
 * read as one account area instead of a stack of phone screens.
 */
export const ACCOUNT_NAV: { label: string; items: AccountNavItem[] }[] = [
  {
    label: "Tickets",
    items: [
      { href: "/tickets", label: "My tickets", icon: "ticket" },
      { href: "/orders", label: "Orders", icon: "receipt" },
      { href: "/transfers", label: "Transfers", icon: "share" },
      { href: "/resale", label: "Resale", icon: "refresh" },
      { href: "/waitlist", label: "Waitlists", icon: "clock" },
    ],
  },
  {
    label: "You",
    items: [
      { href: "/me", label: "Profile", icon: "user" },
      { href: "/notifications", label: "Notifications", icon: "bell" },
      { href: "/favourites", label: "Saved", icon: "heart" },
      { href: "/friends", label: "Friends", icon: "users" },
      { href: "/calendar", label: "Calendar", icon: "cal" },
    ],
  },
];

const ACCOUNT_PREFIXES = ACCOUNT_NAV.flatMap((group) => group.items.map((item) => item.href));

function matches(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Account pages get the desktop sidebar; checkout-style flows inside them don't. */
export function isAccountPath(pathname: string) {
  return ACCOUNT_PREFIXES.some((href) => matches(pathname, href)) && !isFocusedAttendeePath(pathname);
}

export function activeAccountHref(pathname: string) {
  return ACCOUNT_PREFIXES.find((href) => matches(pathname, href)) ?? null;
}

/**
 * Desktop frame for account pages: sidebar on the left, the page on the right.
 * Below md it renders the page untouched (mobile keeps its tab bar).
 */
export function AccountDesktopLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  if (!isAccountPath(pathname)) return <>{children}</>;
  const active = activeAccountHref(pathname);

  return (
    <div className="md:mx-auto md:grid md:max-w-[1200px] md:grid-cols-[220px_minmax(0,1fr)] md:gap-10 md:px-10 md:pt-8">
      <aside className="hidden md:block">
        <nav aria-label="Account" className="sticky top-24 flex flex-col gap-6">
          {ACCOUNT_NAV.map((group) => (
            <div key={group.label} className="flex flex-col gap-0.5">
              <p className="px-3 pb-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-3">
                {group.label}
              </p>
              {group.items.map((item) => {
                const isActive = item.href === active;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-[var(--radius)] px-3 py-2 text-[14px] transition-colors",
                      isActive
                        ? "bg-surface font-semibold text-ink shadow-[var(--shadow-card)]"
                        : "text-ink-2 hover:bg-surface hover:text-ink"
                    )}
                  >
                    <Icon name={item.icon} size={16} className={isActive ? "text-accent" : "text-ink-3"} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 md:max-w-[760px]">{children}</div>
    </div>
  );
}
