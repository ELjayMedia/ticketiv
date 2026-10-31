"use client";

import * as React from "react";
import Link from "next/link";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { Icon, type IconName } from "@/components/quiet/ui/icon";
import { Avatar } from "@/components/quiet/ui/primitives";
import type { UserContext } from "@/lib/data/identity/contexts";
import { cn } from "@/lib/cn";

/* ──────────────────────────────────────────────────────────────
 * Desktop profile menu — the avatar in the top nav opens a panel
 * that mirrors the mobile profile page (`/me`): identity header,
 * quick links, Account, Activity, workspaces and Help & legal,
 * ending in Sign out. Built on Radix DropdownMenu for keyboard
 * navigation, focus management and outside-click dismissal.
 * ────────────────────────────────────────────────────────────── */

interface ProfileMenuProps {
  displayName?: string;
  fullName?: string;
  email?: string;
  avatarUrl?: string;
  contexts?: UserContext[];
}

interface MenuRow {
  icon: IconName;
  label: string;
  href: string;
  description?: string;
}

const QUICK_LINKS: MenuRow[] = [
  { icon: "ticket", label: "My tickets", href: "/tickets" },
  { icon: "fileText", label: "Orders", href: "/orders" },
  { icon: "heart", label: "Favourites", href: "/favourites" },
];

const ACCOUNT_ROWS: MenuRow[] = [
  { icon: "user", label: "Personal information", href: "/account/settings?tab=profile" },
  { icon: "bell", label: "Notifications", href: "/account/settings?tab=notifications" },
  { icon: "settings", label: "Security", href: "/account/settings?tab=security" },
];

const ACTIVITY_ROWS: MenuRow[] = [
  { icon: "users", label: "Friends", href: "/friends", description: "Connections and invites" },
  { icon: "clock", label: "Waitlist", href: "/waitlist", description: "Sold-out requests and offers" },
  { icon: "share", label: "Resale", href: "/resale", description: "Tickets you've listed or bought" },
  { icon: "zap", label: "TapBand", href: "/me/tapband", description: "Your wristband and access" },
];

const HELP_ROWS: Array<{ label: string; href: string }> = [
  { label: "Help centre", href: "/help" },
  { label: "Privacy policy", href: "/privacy" },
  { label: "Send feedback", href: "mailto:support@ticketiv.app?subject=Ticketiv%20feedback" },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .slice(0, 2)
    .join("");
}

export function ProfileMenu({
  displayName,
  fullName,
  email,
  avatarUrl,
  contexts = [],
}: ProfileMenuProps) {
  const name = fullName || displayName || email?.split("@")[0] || "Your account";
  const workspaces = contexts.filter((c) => c.kind === "admin" || c.kind === "org" || c.kind === "talent");
  const hasOrgOrAdmin = workspaces.some((c) => c.kind === "admin" || c.kind === "org");
  const hasTalent = workspaces.some((c) => c.kind === "talent");

  return (
    <Dropdown.Root modal={false}>
      <Dropdown.Trigger
        aria-label="Open profile menu"
        className="group inline-flex shrink-0 items-center gap-1.5 rounded-full p-0.5 pr-2 transition-colors hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 data-[state=open]:bg-bg"
      >
        <Avatar src={avatarUrl} label={initials(name)} size={32} className="ring-0" />
        <Icon
          name="chevD"
          size={14}
          className="text-ink-3 transition-transform group-data-[state=open]:rotate-180"
        />
      </Dropdown.Trigger>

      <Dropdown.Portal>
        <Dropdown.Content
          align="end"
          sideOffset={10}
          collisionPadding={16}
          className={cn(
            "z-50 w-[360px] overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-[var(--shadow-card)]",
            "max-h-[min(720px,calc(100dvh-96px))] overflow-y-auto",
            "data-[state=open]:animate-[fadeIn_120ms_ease] data-[state=closed]:animate-[fadeOut_100ms_ease]",
          )}
        >
          {/* Identity header — like the top of /me */}
          <div className="flex items-center gap-3 border-b border-line px-4 py-4">
            <Avatar src={avatarUrl} label={initials(name)} size={48} className="ring-0" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[15px] font-semibold text-ink">{name}</span>
              {email && <span className="truncate font-mono text-[11px] text-ink-3">{email}</span>}
            </div>
            <Dropdown.Item asChild>
              <Link
                href="/me"
                className="shrink-0 rounded-[var(--radius)] border border-line-2 px-2.5 py-1.5 text-[12px] font-semibold text-ink outline-none hover:bg-bg data-[highlighted]:bg-bg"
              >
                View profile
              </Link>
            </Dropdown.Item>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-3 gap-2 border-b border-line p-3">
            {QUICK_LINKS.map((q) => (
              <Dropdown.Item key={q.href} asChild>
                <Link
                  href={q.href}
                  className="flex flex-col items-center gap-1.5 rounded-[var(--radius-md)] bg-bg px-2 py-3 text-center outline-none transition-colors hover:bg-accent-soft data-[highlighted]:bg-accent-soft"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <Icon name={q.icon} size={16} />
                  </span>
                  <span className="text-[12px] font-semibold text-ink">{q.label}</span>
                </Link>
              </Dropdown.Item>
            ))}
          </div>

          <MenuSection title="Account" rows={ACCOUNT_ROWS} />
          <MenuSection title="Activity" rows={ACTIVITY_ROWS} />

          {/* Workspaces — organizer / admin / talent, as on /me */}
          <div className="border-b border-line px-3 py-3">
            <SectionLabel>Ticketiv for organizers and talent</SectionLabel>
            <div className="mt-2 flex flex-col gap-1.5">
              {workspaces.map((w) => (
                <WorkspaceRow
                  key={w.key}
                  href={w.href}
                  icon={w.kind === "admin" ? "settings" : w.kind === "talent" ? "music" : "trending"}
                  title={w.kind === "org" ? `${w.label} dashboard` : w.label}
                  subtitle={
                    w.sublabel ??
                    (w.kind === "admin"
                      ? "Platform operations, payments & payouts"
                      : w.kind === "talent"
                        ? "Talent profile & line-ups"
                        : "Events, orders & payouts")
                  }
                  dark={w.kind !== "talent"}
                />
              ))}
              {!hasOrgOrAdmin && (
                <WorkspaceRow
                  href="/onboarding/organizer"
                  icon="spark"
                  title="Organize your own event"
                  subtitle="Set up in 5 min"
                  dark
                />
              )}
              {!hasTalent && (
                <WorkspaceRow
                  href="/onboarding/talent"
                  icon="music"
                  title="Perform on Ticketiv"
                  subtitle="Create a talent profile · get added to line-ups"
                />
              )}
            </div>
          </div>

          {/* Help & legal + sign out */}
          <div className="px-2 py-2">
            {HELP_ROWS.map((h) => (
              <Dropdown.Item key={h.label} asChild>
                <a
                  href={h.href}
                  className="flex items-center rounded-[var(--radius)] px-2.5 py-2 text-[13px] text-ink-2 outline-none hover:bg-bg data-[highlighted]:bg-bg"
                >
                  {h.label}
                </a>
              </Dropdown.Item>
            ))}
            <form action="/api/sign-out" method="post">
              <Dropdown.Item asChild>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-[var(--radius)] px-2.5 py-2 text-left text-[13px] font-semibold text-danger outline-none hover:bg-danger-soft data-[highlighted]:bg-danger-soft"
                >
                  <Icon name="close" size={14} /> Sign out
                </button>
              </Dropdown.Item>
            </form>
          </div>
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-label px-1">{children}</div>;
}

function MenuSection({ title, rows }: { title: string; rows: MenuRow[] }) {
  return (
    <div className="border-b border-line px-2 py-3">
      <div className="px-1"><SectionLabel>{title}</SectionLabel></div>
      <div className="mt-1.5 flex flex-col">
        {rows.map((r) => (
          <Dropdown.Item key={r.href} asChild>
            <Link
              href={r.href}
              className="flex items-center gap-2.5 rounded-[var(--radius)] px-2 py-2 outline-none transition-colors hover:bg-bg data-[highlighted]:bg-bg"
            >
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Icon name={r.icon} size={14} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[13px] font-medium text-ink">{r.label}</span>
                {r.description && (
                  <span className="truncate font-mono text-[10px] text-ink-3">{r.description}</span>
                )}
              </span>
              <Icon name="chevR" size={14} className="text-ink-3" />
            </Link>
          </Dropdown.Item>
        ))}
      </div>
    </div>
  );
}

function WorkspaceRow({
  href,
  icon,
  title,
  subtitle,
  dark,
}: {
  href: string;
  icon: IconName;
  title: string;
  subtitle: string;
  dark?: boolean;
}) {
  return (
    <Dropdown.Item asChild>
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 outline-none transition-opacity",
          dark
            ? "bg-ink text-white hover:opacity-90 data-[highlighted]:opacity-90"
            : "border border-line bg-surface text-ink hover:bg-bg data-[highlighted]:bg-bg",
        )}
      >
        <span
          className={cn(
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            dark ? "bg-accent text-white" : "bg-accent-soft text-accent",
          )}
        >
          <Icon name={icon} size={16} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13px] font-semibold">{title}</span>
          <span className={cn("truncate font-mono text-[10px]", dark ? "text-white/60" : "text-ink-3")}>
            {subtitle}
          </span>
        </span>
        <Icon name="chevR" size={14} className={dark ? "text-white/60" : "text-ink-3"} />
      </Link>
    </Dropdown.Item>
  );
}
