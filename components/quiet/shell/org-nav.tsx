"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/quiet/ui/icon";
import { cn } from "@/lib/cn";
import {
  canChangeSettings,
  canManageTeam,
  canOpenSection,
  type OrganizerRole,
  type OrganizerSection,
} from "@ticketiv/shared";

/* ──────────────────────────────────────────────────────────────
 * Organizer workspace navigation for every /orgs/[orgId]/… page.
 *
 * Desktop: a left sidebar with the org name, the workspace sections and
 * a way back to the attendee side. Phone: a sticky top strip with the org
 * name and horizontally scrollable section tabs (pages keep their own
 * bottom action bars, so the strip stays at the top).
 *
 * Each organizer role (ADR 0002) sees only its sections: managers see
 * everything, finance sees money pages, door staff see their events and
 * the scanner, scanners see the scanner.
 * ────────────────────────────────────────────────────────────── */

interface OrgNavItem {
  label: string;
  icon: IconName;
  section: OrganizerSection;
  /** Workspace path segment, or an absolute href for items outside the workspace. */
  path: string;
  href?: string;
  /** Extra path segments that also mark this item active. */
  also?: string[];
}

export const ORG_NAV_ITEMS: OrgNavItem[] = [
  { label: "Dashboard", icon: "trending", section: "dashboard", path: "dashboard", also: ["onboarding"] },
  { label: "Events", icon: "cal", section: "events", path: "events" },
  { label: "Series", icon: "spark", section: "series", path: "series" },
  { label: "Finance", icon: "fileText", section: "finance", path: "finance" },
  { label: "Payouts", icon: "wallet", section: "payouts", path: "payouts" },
  { label: "Team", icon: "users", section: "team", path: "team" },
  {
    label: "Settings",
    icon: "settings",
    section: "settings",
    path: "settings",
    also: ["profile", "feature-flags", "pricing-plans"],
  },
  { label: "Scan", icon: "qr", section: "scan", path: "scan", href: "/scan" },
];

export interface OrgNavAccess {
  role: OrganizerRole;
  /** org_members.role (null for platform admins and event-only assignments). */
  storedRole: string | null;
  isPlatformAdmin: boolean;
}

export function visibleOrgNavItems({ role, storedRole, isPlatformAdmin }: OrgNavAccess) {
  return ORG_NAV_ITEMS.filter((item) => {
    if (!canOpenSection(role, item.section)) return false;
    if (item.section === "team") return isPlatformAdmin || canManageTeam(storedRole);
    if (item.section === "settings") return isPlatformAdmin || canChangeSettings(storedRole);
    // Managers reach the scanner from each event; the tab is for door roles.
    if (item.section === "scan") return role !== "manager" && role !== "finance";
    return true;
  });
}

function itemHref(item: OrgNavItem, orgId: string) {
  return item.href ?? `/orgs/${orgId}/${item.path}`;
}

export function isOrgNavItemActive(item: OrgNavItem, orgId: string, pathname: string): boolean {
  return [item.path, ...(item.also ?? [])].some((segment) => {
    const base = `/orgs/${orgId}/${segment}`;
    return pathname === base || pathname.startsWith(`${base}/`);
  });
}

interface OrgNavProps extends OrgNavAccess {
  orgId: string;
  orgName: string;
  roleLabel: string | null;
}

export function OrgSidebar({ orgId, orgName, roleLabel, ...access }: OrgNavProps) {
  const pathname = usePathname() ?? "";
  const items = visibleOrgNavItems(access);

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
              href={itemHref(item, orgId)}
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

export function OrgTopTabs({ orgId, orgName, ...access }: OrgNavProps) {
  const pathname = usePathname() ?? "";
  const items = visibleOrgNavItems(access);

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
              href={itemHref(item, orgId)}
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
