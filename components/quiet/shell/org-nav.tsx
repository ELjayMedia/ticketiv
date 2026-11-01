"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/quiet/ui/icon";
import { cn } from "@/lib/cn";

/* ──────────────────────────────────────────────────────────────
 * Organizer workspace navigation for every /orgs/[orgId]/… page.
 *
 * Desktop: a left sidebar with the org name, the workspace sections and
 * a way back to the attendee side. Phone: a sticky top strip with the org
 * name and horizontally scrollable section tabs (pages keep their own
 * bottom action bars, so the strip stays at the top).
 *
 * Managers (owner / admin / organizer) see every section; other members
 * (staff, scanner) see only the sections they can open.
 * ────────────────────────────────────────────────────────────── */

interface OrgNavItem {
  label: string;
  icon: IconName;
  path: string;
  /** Extra path segments that also mark this item active. */
  also?: string[];
  managersOnly?: boolean;
  ownersOnly?: boolean;
}

export const ORG_NAV_ITEMS: OrgNavItem[] = [
  { label: "Dashboard", icon: "trending", path: "dashboard", also: ["onboarding"] },
  { label: "Events", icon: "cal", path: "events" },
  { label: "Series", icon: "spark", path: "series", managersOnly: true },
  { label: "Finance", icon: "fileText", path: "finance", managersOnly: true },
  { label: "Payouts", icon: "wallet", path: "payouts", managersOnly: true },
  { label: "Team", icon: "users", path: "team", managersOnly: true },
  {
    label: "Settings",
    icon: "settings",
    path: "settings",
    also: ["profile", "feature-flags", "pricing-plans"],
    ownersOnly: true,
  },
];

export function visibleOrgNavItems({ canManage, isOwner }: { canManage: boolean; isOwner: boolean }) {
  return ORG_NAV_ITEMS.filter((item) => (item.ownersOnly ? isOwner : item.managersOnly ? canManage : true));
}

export function isOrgNavItemActive(item: OrgNavItem, orgId: string, pathname: string): boolean {
  return [item.path, ...(item.also ?? [])].some((segment) => {
    const base = `/orgs/${orgId}/${segment}`;
    return pathname === base || pathname.startsWith(`${base}/`);
  });
}

interface OrgNavProps {
  orgId: string;
  orgName: string;
  roleLabel: string | null;
  canManage: boolean;
  isOwner: boolean;
}

export function OrgSidebar({ orgId, orgName, roleLabel, canManage, isOwner }: OrgNavProps) {
  const pathname = usePathname() ?? "";
  const items = visibleOrgNavItems({ canManage, isOwner });

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface md:flex print:hidden">
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-4">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] bg-accent text-[15px] font-bold text-white">
          {orgName.trim().charAt(0).toUpperCase() || "O"}
        </span>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-[14px] font-semibold text-ink">{orgName}</span>
          <span className="truncate font-mono text-[10px] uppercase tracking-wider text-ink-3">
            {roleLabel ?? "Organizer workspace"}
          </span>
        </div>
      </div>

      <nav aria-label="Workspace" className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        {items.map((item) => {
          const active = isOrgNavItemActive(item, orgId, pathname);
          return (
            <Link
              key={item.path}
              href={`/orgs/${orgId}/${item.path}`}
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

export function OrgTopTabs({ orgId, orgName, canManage, isOwner }: OrgNavProps) {
  const pathname = usePathname() ?? "";
  const items = visibleOrgNavItems({ canManage, isOwner });

  return (
    <div className="sticky top-0 z-30 border-b border-line bg-surface pt-[env(safe-area-inset-top)] md:hidden print:hidden">
      <div className="flex items-center gap-2 px-4 pb-1 pt-2.5">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent text-[12px] font-bold text-white">
          {orgName.trim().charAt(0).toUpperCase() || "O"}
        </span>
        <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">{orgName}</span>
        <Link
          href="/"
          className="inline-flex items-center gap-1 rounded-full border border-line-2 px-2.5 py-1 text-[12px] font-medium text-ink-2 hover:bg-surface-2"
        >
          <Icon name="ticket" size={13} />
          Ticketiv
        </Link>
      </div>
      <nav aria-label="Workspace" className="flex gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none]">
        {items.map((item) => {
          const active = isOrgNavItemActive(item, orgId, pathname);
          return (
            <Link
              key={item.path}
              href={`/orgs/${orgId}/${item.path}`}
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
