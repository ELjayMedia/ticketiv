"use client"

import * as React from "react"
import Link from "next/link";
import { markAllNotificationsRead, markNotificationRead, toggleNotificationMute } from "@/app/(consumer)/notifications/actions";
import { Icon, type IconName } from "@/components/quiet/ui/icon";
import { Card } from "@/components/quiet/ui/card";
import type { AttendeeNotification, NotificationActionKind } from "@/lib/data/attendee/notifications";

interface NotificationsCentreProps {
  notifications: AttendeeNotification[];
  mutedTypes: string[];
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

export function NotificationsCentre({ notifications, mutedTypes }: NotificationsCentreProps) {
  const [readIds, setReadIds] = React.useState<Set<string>>(new Set())
  const [allMarkedRead, setAllMarkedRead] = React.useState(false)
  const [loadingId, setLoadingId] = React.useState<string | null>(null)
  const [loadingAll, setLoadingAll] = React.useState(false)
  const [localMutedTypes, setLocalMutedTypes] = React.useState(new Set(mutedTypes))
  const [mutingType, setMutingType] = React.useState<string | null>(null)

  const hasNotifications = notifications.length > 0;
  const effectiveUnreadCount = allMarkedRead
    ? 0
    : notifications.filter((n) => n.isUnread && !readIds.has(n.id)).length;

  const mutedCount = localMutedTypes.size;

  function isEffectivelyUnread(n: AttendeeNotification) {
    return n.isUnread && !readIds.has(n.id) && !allMarkedRead;
  }

  function isTypeMuted(type: string) {
    return localMutedTypes.has(type);
  }

  async function handleMarkRead(notificationId: string) {
    if (loadingId || loadingAll) return;
    setReadIds((prev) => new Set([...prev, notificationId]));
    setLoadingId(notificationId);
    const formData = new FormData();
    formData.set("notificationId", notificationId);
    try {
      await markNotificationRead(formData);
    } catch {
      setReadIds((prev) => {
        const next = new Set(prev);
        next.delete(notificationId);
        return next;
      });
    } finally {
      setLoadingId(null);
    }
  }

  async function handleMarkAllRead() {
    if (loadingAll) return;
    setAllMarkedRead(true);
    setLoadingAll(true);
    try {
      await markAllNotificationsRead();
    } catch {
      setAllMarkedRead(false);
    } finally {
      setLoadingAll(false);
    }
  }

  async function handleToggleMute(type: string) {
    if (mutingType) return;
    setMutingType(type);
    // Optimistic update
    const wasMuted = localMutedTypes.has(type);
    setLocalMutedTypes((prev) => {
      const next = new Set(prev);
      if (wasMuted) next.delete(type);
      else next.add(type);
      return next;
    });
    const formData = new FormData();
    formData.set("type", type);
    try {
      await toggleNotificationMute(formData);
    } catch {
      // Revert on error
      setLocalMutedTypes((prev) => {
        const next = new Set(prev);
        if (wasMuted) next.add(type);
        else next.delete(type);
        return next;
      });
    } finally {
      setMutingType(null);
    }
  }

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
          <div className="flex items-center gap-2">
            {mutedCount > 0 && (
              <span className="rounded bg-surface-2 px-2 py-1 font-mono text-[10px] font-semibold uppercase text-ink-3">
                {mutedCount} muted
              </span>
            )}
            {hasNotifications && (
              <span className="rounded bg-accent-soft px-2 py-1 font-mono text-[10px] font-semibold uppercase text-accent">
                {effectiveUnreadCount > 0 ? `${effectiveUnreadCount} unread` : `${notifications.length} recent`}
              </span>
            )}
          </div>
        </div>
        <p className="mt-2 font-mono text-[12px] leading-relaxed text-ink-3">
          Ticket, transfer, waitlist, listing, refund and event updates appear here with direct actions.
        </p>
        {effectiveUnreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={loadingAll}
            className="mt-3 inline-flex h-8 items-center justify-center rounded-[var(--radius)] border border-line-2 px-3 text-[11px] font-semibold hover:bg-bg disabled:opacity-50"
          >
            {loadingAll ? "Marking…" : "Mark all as read"}
          </button>
        )}
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
            {notifications.map((n) => {
              const unread = isEffectivelyUnread(n);
              const muted = isTypeMuted(n.type);
              const isMuting = mutingType === n.type;
              return (
                <li key={n.id}>
                  <Card
                    className={`flex items-start gap-3 p-3.5 transition-colors ${
                      muted
                        ? "opacity-50"
                        : unread
                          ? "border-accent bg-accent-soft/30"
                          : "hover:bg-bg"
                    }`}
                    flat
                  >
                    <div className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                      <Icon name={ICON_BY_KIND[n.actionKind]} size={16} />
                      {unread && !muted && (
                        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-surface" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <Link href={n.actionHref} className="min-w-0 flex-1">
                          <span className="text-[13px] font-semibold">
                            {n.title}
                          </span>
                        </Link>
                        <span className="shrink-0 font-mono text-[10px] text-ink-3">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-[11px] leading-relaxed text-ink-3">
                        {n.message}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] uppercase text-ink-3">
                          {muted ? "muted" : unread ? "unread" : statusLabel(n.status)}
                        </span>
                        {n.channel && (
                          <span className="font-mono text-[10px] uppercase text-ink-3">
                            {n.channel}
                          </span>
                        )}
                        <Link href={n.actionHref} className="ml-auto text-[11px] font-semibold text-accent">
                          {n.actionLabel}
                        </Link>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        {unread && !muted && (
                          <button
                            type="button"
                            onClick={() => handleMarkRead(n.id)}
                            disabled={loadingId === n.id}
                            className="font-mono text-[10px] font-semibold uppercase text-ink-3 hover:text-ink disabled:opacity-50"
                          >
                            {loadingId === n.id ? "…" : "Mark read"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleToggleMute(n.type)}
                          disabled={isMuting}
                          className="font-mono text-[10px] font-semibold uppercase text-ink-3 hover:text-ink disabled:opacity-50"
                        >
                          {isMuting ? "…" : muted ? `Unmute ${n.type}` : `Mute ${n.type}`}
                        </button>
                      </div>
                    </div>
                    <Link href={n.actionHref} aria-label={n.actionLabel}>
                      <Icon name="chevR" size={14} className="mt-1 text-ink-3" />
                    </Link>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
