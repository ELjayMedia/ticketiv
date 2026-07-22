import Link from "next/link";
import { Icon, type IconName } from "@/components/quiet/ui/icon";
import { Card } from "@/components/quiet/ui/card";
import { Avatar } from "@/components/quiet/ui/primitives";
import { ShareButton, ShareRow } from "@/components/quiet/screens/profile/profile-actions";
import { TapBandSection } from "@/components/quiet/screens/profile/tapband-section";
import type { MyTapBandProfile } from "@/lib/data/attendee/tapband";

interface ProfileScreenProps {
  user?: ProfileUser | null;
  appVersion?: string;
  tapBand?: MyTapBandProfile | null;
  /**
   * Org workspaces the user belongs to (from getMyContexts, kind "org").
   * When present, the profile shows dashboard links instead of the
   * "Organize your own event" onboarding CTA — existing organizers should
   * land in their workspace, not the self-serve funnel.
   */
  orgContexts?: OrgContextLink[];
}

interface OrgContextLink {
  key: string;
  label: string;
  sublabel?: string;
  href: string;
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

interface SettingRow {
  icon: IconName;
  label: string;
  value?: string;
  href?: string;
  /** Form POST endpoint — used for sign out so it works without a client island. */
  action?: string;
  accent?: boolean;
  description?: string;
}

export function ProfileScreen({ user, appVersion = "current", tapBand, orgContexts }: ProfileScreenProps) {
  if (!user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg p-6">
        <Card className="max-w-sm p-6 text-center" flat>
          <h1 className="text-[18px] font-semibold text-ink">Profile unavailable</h1>
          <p className="mt-2 text-[13px] text-ink-3">
            Sign in to view your Ticketiv profile, tickets, orders and preferences.
          </p>
          <Link
            href="/login?next=/me"
            className="mt-4 inline-flex items-center justify-center rounded-[var(--radius)] border border-line-2 px-4 py-2 text-[13px] font-semibold text-ink hover:bg-bg"
          >
            Sign in
          </Link>
        </Card>
      </div>
    );
  }

  const accountRows: SettingRow[] = [
    { icon: "settings", label: "Account settings", value: "profile · alerts", href: "/account/settings" },
    { icon: "user", label: "Personal info", value: user.email, href: "/account/settings" },
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
      value: user.pendingTransfers > 0 ? `${user.pendingTransfers} pending` : "none",
      href: "/tickets",
      accent: user.pendingTransfers > 0,
      description: "Manage incoming and outgoing transfers with your tickets",
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

      <header className="flex items-center gap-2.5 px-5 pb-2 pt-2">
        <span className="flex-1" />
        <Link href="/notifications" aria-label="Notifications" className="relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60">
          <Icon name="bell" size={20} />
          {user.unreadNotifications > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 font-mono text-[9px] font-semibold text-white ring-2 ring-surface">
              {user.unreadNotifications > 9 ? "9+" : user.unreadNotifications}
            </span>
          )}
        </Link>
        <ShareButton
          handle={user.handle}
          name={user.name}
          label="Share profile"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60"
        />
      </header>

      <section className="flex flex-col items-center gap-2.5 px-5 pt-2 pb-4">
        <div className="relative">
          <Avatar
            src={user.photo}
            label={user.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            size={84}
          />
          <Link
            href="/account/settings"
            className="absolute bottom-0 right-0 inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-accent text-white"
            aria-label="Edit profile photo"
          >
            <Icon name="plus" size={14} strokeWidth={3} />
          </Link>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <h1 className="text-h2 text-[20px]">{user.name}</h1>
          <span className="font-mono text-[11px] text-ink-3">@{user.handle} · {user.joinedLabel}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-4">
          <Stat value={user.stats.events} label="events" />
          <span className="h-5 w-px bg-line" />
          <Stat value={user.stats.friends} label="friends" />
          <span className="h-5 w-px bg-line" />
          <Stat value={user.stats.following} label="following" />
        </div>
      </section>

      <SettingsList title="Account" rows={accountRows} />

      <TapBandSection profile={tapBand} />

      <section className="px-5 pb-4">
        <div className="text-label mb-2">Friends</div>
        <Card className="overflow-hidden p-0">
          <Link
            href="/friends"
            className="flex items-center gap-2.5 border-b border-line px-3.5 py-3 transition-colors hover:bg-bg"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Icon name="users" size={14} />
            </span>
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="text-[14px] font-medium">My friends</span>
              <span className="font-mono text-[10px] leading-relaxed text-ink-3">
                {user.stats.friends} connected
              </span>
            </span>
            <Icon name="chevR" size={14} className="text-ink-3" />
          </Link>
          <ShareRow handle={user.handle} name={user.name} description="Share an invite link" />
        </Card>
      </section>

      <SettingsList title="Your activity" rows={activityRows} />

      {orgContexts && orgContexts.length > 0 ? (
        <section className="flex flex-col gap-2.5 px-5 pb-4">
          {orgContexts.map((org) => (
            <Link key={org.key} href={org.href}>
              <Card className="border-ink bg-ink p-3.5 text-white">
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-white"><Icon name="trending" size={18} /></div>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className="text-[13px] font-semibold">{org.label} dashboard</span>
                    <span className="font-mono text-[11px] text-white/60">
                      {org.sublabel ? `${org.sublabel} · ` : ""}events, orders & payouts
                    </span>
                  </div>
                  <Icon name="chevR" size={16} className="text-white/60" />
                </div>
              </Card>
            </Link>
          ))}
        </section>
      ) : (
        <section className="px-5 pb-4">
          <Link href="/onboarding/organizer">
            <Card className="border-ink bg-ink p-3.5 text-white">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-white"><Icon name="spark" size={18} /></div>
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-[13px] font-semibold">Organize your own event</span>
                  <span className="font-mono text-[11px] text-white/60">set up in 5 min · 0% commission first event</span>
                </div>
                <Icon name="chevR" size={16} className="text-white/60" />
              </div>
            </Card>
          </Link>
        </section>
      )}

      <section className="px-5 pb-4">
        <Link href="/onboarding/talent">
          <Card className="p-3.5">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"><Icon name="music" size={18} /></div>
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-[13px] font-semibold text-ink">Perform on Ticketiv</span>
                <span className="font-mono text-[11px] text-ink-3">create a talent profile · get added to line-ups</span>
              </div>
              <Icon name="chevR" size={16} className="text-ink-3" />
            </div>
          </Card>
        </Link>
      </section>

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
          { icon: "settings" as IconName, label: "Account settings", href: "/account/settings" },
          { icon: "spark" as IconName, label: "Help centre", href: "/help" },
          { icon: "fileText" as IconName, label: "Privacy policy", href: "/privacy" },
          {
            icon: "share" as IconName,
            label: "Send feedback",
            href: "mailto:support@ticketiv.app?subject=Ticketiv%20feedback",
          },
          { icon: "close" as IconName, label: "Sign out", accent: true, action: "/api/sign-out" },
        ]}
        plain
      />

      <div className="pb-6 text-center font-mono text-[10px] text-ink-3">ticketiv · {appVersion}</div>
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

function SettingsList({ title, rows, plain }: { title: string; rows: SettingRow[]; plain?: boolean }) {
  return (
    <section className="px-5 pb-4">
      <div className="text-label mb-2">{title}</div>
      <Card className="overflow-hidden p-0">
        {rows.map((r, i, arr) => {
          const Inner = (
            <div className={"flex items-center gap-2.5 px-3.5 py-3 " + (i < arr.length - 1 ? "border-b border-line" : "")}>
              {!plain && <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-accent"><Icon name={r.icon} size={14} /></div>}
              <div className="flex flex-1 flex-col gap-0.5">
                <span className={"text-[14px] font-medium " + (r.accent && plain ? "text-accent" : "")}>{r.label}</span>
                {r.description && <span className="font-mono text-[10px] leading-relaxed text-ink-3">{r.description}</span>}
              </div>
              {r.value && <span className={"font-mono text-[11px] " + (r.accent && !plain ? "font-semibold text-accent" : "text-ink-3")}>{r.value}</span>}
              {!(r.accent && plain) && <Icon name="chevR" size={14} className="text-ink-3" />}
            </div>
          );
          if (r.href?.startsWith("mailto:")) return <a key={r.label} href={r.href}>{Inner}</a>;
          if (r.href) return <Link key={r.label} href={r.href}>{Inner}</Link>;
          if (r.action)
            return (
              <form key={r.label} action={r.action} method="post" className="block w-full">
                <button type="submit" className="block w-full text-left">{Inner}</button>
              </form>
            );
          return <button key={r.label} type="button" className="block w-full text-left">{Inner}</button>;
        })}
      </Card>
    </section>
  );
}
