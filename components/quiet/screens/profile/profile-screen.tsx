import Link from "next/link";
import { Icon, type IconName } from "@/components/quiet/ui/icon";
import { Card } from "@/components/quiet/ui/card";
import { Avatar } from "@/components/quiet/ui/primitives";

/* ──────────────────────────────────────────────────────────────
 * /me · account hub
 *
 * The "You" tab now acts as the attendee account hub. It links the
 * post-purchase journeys introduced in UX Phase 2: tickets, saved events,
 * transfers, waitlist, resale/listings, notifications and order history.
 * ────────────────────────────────────────────────────────────── */

interface ProfileScreenProps {
  user?: ProfileUser;
  appVersion?: string;
}

interface ProfileUser {
  name: string;
  handle: string;
  photo: string;
  joinedLabel: string;
  stats: { events: number; friends: number; following: number };
  email: string;
  savedPaymentMethods: number;
  remindersEnabled: boolean;
  language: string;
  upcomingTickets: number;
  favouritesCount: number;
  pendingTransfers: number;
  unreadNotifications: number;
}

const DEFAULT_USER: ProfileUser = {
  name: "Smit Modi",
  handle: "smit",
  photo: "", // initials fallback
  joinedLabel: "joined Jan 2026",
  stats: { events: 24, friends: 10, following: 5 },
  email: "smit@mail.in",
  savedPaymentMethods: 2,
  remindersEnabled: true,
  language: "English",
  upcomingTickets: 4,
  favouritesCount: 12,
  pendingTransfers: 1,
  unreadNotifications: 0,
};

interface SettingRow {
  icon: IconName;
  label: string;
  value?: string;
  href?: string;
  accent?: boolean;
  description?: string;
}

export function ProfileScreen({
  user = DEFAULT_USER,
  appVersion = "v2.4.1 · build 2026-05",
}: ProfileScreenProps) {
  const accountRows: SettingRow[] = [
    { icon: "user", label: "Personal info", value: user.email, href: "/me/personal" },
    {
      icon: "wallet",
      label: "Payment methods",
      value: `${user.savedPaymentMethods} saved`,
      href: "/me/payment-methods",
    },
    {
      icon: "cal",
      label: "Reminders",
      value: user.remindersEnabled ? "on" : "off",
      href: "/me/reminders",
    },
    {
      icon: "globe",
      label: "Language",
      value: user.language,
      href: "/me/language",
    },
  ];

  const activityRows: SettingRow[] = [
    {
      icon: "ticket",
      label: "Tickets",
      value: `${user.upcomingTickets} upcoming`,
      href: "/tickets",
      accent: true,
      description: "QR tickets, past tickets and event-day access",
    },
    {
      icon: "heart",
      label: "Favourites",
      value: String(user.favouritesCount),
      href: "/favourites",
      accent: true,
      description: "Saved events and followed series",
    },
    {
      icon: "arrowUR",
      label: "Transfers",
      value:
        user.pendingTransfers > 0
          ? `${user.pendingTransfers} pending`
          : "none",
      href: "/transfers",
      accent: user.pendingTransfers > 0,
      description: "Incoming and outgoing ticket transfers",
    },
    {
      icon: "clock",
      label: "Waitlist",
      value: "offers",
      href: "/waitlist",
      accent: true,
      description: "Sold-out ticket requests and offer expiry",
    },
    {
      icon: "ticket",
      label: "Resale",
      value: "listings",
      href: "/resale",
      accent: true,
      description: "Tickets listed by you or bought from another fan",
    },
    {
      icon: "fileText",
      label: "Orders",
      value: "receipts",
      href: "/orders",
      description: "Purchase history, receipts and refund updates",
    },
  ];

  return (
    <div className="bg-bg pb-24">
      <div className="h-14" />

      {/* Top action bar */}
      <header className="flex items-center gap-2.5 px-5 pb-2 pt-2">
        <span className="flex-1" />
        <Link
          href="/notifications"
          aria-label="Notifications"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60"
        >
          <Icon name="bell" size={20} />
          {user.unreadNotifications > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 font-mono text-[9px] font-semibold text-white ring-2 ring-surface">
              {user.unreadNotifications > 9 ? "9+" : user.unreadNotifications}
            </span>
          )}
        </Link>
        <button
          aria-label="Share profile"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60"
        >
          <Icon name="share" size={20} />
        </button>
        <button
          aria-label="Filters"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60"
        >
          <Icon name="filter" size={20} />
        </button>
      </header>

      {/* Header card */}
      <section className="flex flex-col items-center gap-2.5 px-5 pt-2 pb-4">
        <div className="relative">
          <Avatar
            src={user.photo}
            label={user.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
            size={84}
          />
          <button
            className="absolute bottom-0 right-0 inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-accent text-white"
            aria-label="Edit avatar"
          >
            <Icon name="plus" size={14} strokeWidth={3} />
          </button>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <h1 className="text-h2 text-[20px]">{user.name}</h1>
          <span className="font-mono text-[11px] text-ink-3">
            @{user.handle} · {user.joinedLabel}
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-4">
          <Stat value={user.stats.events} label="events" />
          <span className="h-5 w-px bg-line" />
          <Stat value={user.stats.friends} label="friends" />
          <span className="h-5 w-px bg-line" />
          <Stat value={user.stats.following} label="following" />
        </div>
      </section>

      {/* Account */}
      <SettingsList title="Account" rows={accountRows} />
      <SettingsList title="Your activity" rows={activityRows} />

      {/* Organizer mode prompt */}
      <section className="px-5 pb-4">
        <Link href="/onboarding/organizer">
          <Card className="border-ink bg-ink p-3.5 text-white">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                <Icon name="spark" size={18} />
              </div>
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-[13px] font-semibold">
                  Organize your own event
                </span>
                <span className="font-mono text-[11px] text-white/60">
                  set up in 5 min · 0% commission first event
                </span>
              </div>
              <Icon name="chevR" size={16} className="text-white/60" />
            </div>
          </Card>
        </Link>
      </section>

      {/* More */}
      <SettingsList
        title="More"
        rows={[
          {
            icon: "bell" as IconName,
            label: "Notifications",
            value: user.unreadNotifications > 0 ? `${user.unreadNotifications} unread` : undefined,
            href: "/notifications",
            accent: user.unreadNotifications > 0,
          },
          { icon: "settings" as IconName, label: "Privacy & data" },
          { icon: "fileText" as IconName, label: "Help center" },
          { icon: "share" as IconName, label: "Send feedback" },
          { icon: "close" as IconName, label: "Sign out", accent: true },
        ]}
        plain
      />

      <div className="pb-6 text-center font-mono text-[10px] text-ink-3">
        ticketiv · {appVersion}
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-mono text-[16px] font-semibold">{value}</span>
      <span className="text-label">{label}</span>
    </div>
  );
}

function SettingsList({
  title,
  rows,
  plain,
}: {
  title: string;
  rows: SettingRow[];
  /** Plain mode hides the leading icon circle (used for "More" section). */
  plain?: boolean;
}) {
  return (
    <section className="px-5 pb-4">
      <div className="text-label mb-2">{title}</div>
      <Card className="overflow-hidden p-0">
        {rows.map((r, i, arr) => {
          const Inner = (
            <div
              className={
                "flex items-center gap-2.5 px-3.5 py-3 " +
                (i < arr.length - 1 ? "border-b border-line" : "")
              }
            >
              {!plain && (
                <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Icon name={r.icon} size={14} />
                </div>
              )}
              <div className="flex flex-1 flex-col gap-0.5">
                <span
                  className={
                    "text-[14px] font-medium " +
                    (r.accent && plain ? "text-accent" : "")
                  }
                >
                  {r.label}
                </span>
                {r.description && (
                  <span className="font-mono text-[10px] leading-relaxed text-ink-3">
                    {r.description}
                  </span>
                )}
              </div>
              {r.value && (
                <span
                  className={
                    "font-mono text-[11px] " +
                    (r.accent && !plain ? "font-semibold text-accent" : "text-ink-3")
                  }
                >
                  {r.value}
                </span>
              )}
              {!(r.accent && plain) && (
                <Icon name="chevR" size={14} className="text-ink-3" />
              )}
            </div>
          );
          return r.href ? (
            <Link key={r.label} href={r.href}>
              {Inner}
            </Link>
          ) : (
            <button
              key={r.label}
              type="button"
              className="block w-full text-left"
            >
              {Inner}
            </button>
          );
        })}
      </Card>
    </section>
  );
}
