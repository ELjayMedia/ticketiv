import Link from "next/link";
import { Icon, type IconName } from "@/components/quiet/ui/icon";
import { Card } from "@/components/quiet/ui/card";
import type { AttendeeNotification, NotificationActionKind } from "@/lib/data/attendee/notifications";

interface NotificationsCentreProps {
  notifications: AttendeeNotification[];
}

const ICON_BY_KIND: Record<NotificationActionKind, IconName> = {
  ticket: "ticket",
  transfer: "arrowUR",
  waitlist: "clock",
  resale: "ticket",
  refund: "wallet",
  event: "cal",
  generic: "bell",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 0) return "now";
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" });
}

function statusLabel(status: string | null): string {
  if (!status) return "update";
  return status.replace(/[_-]+/g, " ");
}

export function NotificationsCentre({ notifications }: NotificationsCentreProps) {
  const hasNotifications = notifications.length > 0;

  return (
    <div className="mx-auto max-w-[480px] bg-bg pb-24">
      <div className="h-14" />

      <header className="px-5 pb-4 pt-2">
        <Link
          href="/me"
          className="mb-5 inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60"
          aria-label="Back to account"
        >
          <Icon name="chevL" size={20} />
        </Link>
        <div className="text-label">Updates</div>
        <div className="mt-1 flex items-end justify-between gap-3">
          <h1 className="text-h1">Notifications</h1>
          {hasNotifications && (
            <span className="rounded bg-accent-soft px-2 py-1 font-mono text-[10px] font-semibold uppercase text-accent">
              {notifications.length} recent
            </span>
          )}
        </div>
        <p className="mt-2 font-mono text-[12px] leading-relaxed text-ink-3">
          Ticket, transfer, waitlist, listing, refund and event updates appear here with direct actions.
        </p>
      </header>

      {!hasNotifications ? (
        <section className="px-5">
          <Card className="p-6 text-center">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Icon name="bell" size={22} />
            </div>
            <div className="mt-4 text-[15px] font-semibold">No notifications yet</div>
            <p className="mx-auto mt-1.5 max-w-[320px] font-mono text-[11px] leading-relaxed text-ink-3">
              When your tickets, transfers, waitlist requests, listings or event details change, the update will appear here.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Link
                href="/tickets"
                className="inline-flex items-center justify-center rounded-[var(--radius)] bg-ink px-3 py-2 text-[12px] font-semibold text-white hover:bg-ink-2"
              >
                My tickets
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-[var(--radius)] border border-line-2 px-3 py-2 text-[12px] font-semibold hover:bg-bg"
              >
                Discover events
              </Link>
            </div>
          </Card>
        </section>
      ) : (
        <section className="px-5">
          <ul className="flex flex-col gap-2">
            {notifications.map((n) => (
              <li key={n.id}>
                <Link href={n.actionHref}>
                  <Card className="flex items-start gap-3 p-3.5 transition-colors hover:bg-bg" flat>
                    <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                      <Icon name={ICON_BY_KIND[n.actionKind]} size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <span className="min-w-0 flex-1 text-[13px] font-semibold">
                          {n.title}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] text-ink-3">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-[11px] leading-relaxed text-ink-3">
                        {n.message}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] uppercase text-ink-3">
                          {statusLabel(n.status)}
                        </span>
                        {n.channel && (
                          <span className="font-mono text-[10px] uppercase text-ink-3">
                            {n.channel}
                          </span>
                        )}
                        <span className="ml-auto text-[11px] font-semibold text-accent">
                          {n.actionLabel}
                        </span>
                      </div>
                    </div>
                    <Icon name="chevR" size={14} className="mt-1 text-ink-3" />
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
