"use client";

import * as React from "react";
import Link from "next/link";

import { Card } from "@/components/quiet/ui/card";
import { Icon, type IconName } from "@/components/quiet/ui/icon";
import { getOfflineTicketState } from "@/lib/tickets/offline-ticket";

/**
 * "Ready for the door": the three things that decide whether entry is quick.
 * Is the ticket on this phone without signal? Does everyone in the group have
 * their own ticket? Where and when do I go in? Everything here is read-only;
 * each row links to the screen that fixes it.
 */

export interface DoorReadinessTicket {
  id: string;
  checkedInAt: string | null;
}

export interface DoorReadinessTransfer {
  ticketId: string;
  toName: string;
  /** e.g. "until 18:00" in the event's time zone. */
  expiresLabel: string | null;
}

type Tone = "ok" | "todo" | "info";

type OfflinePhase =
  | { phase: "checking" }
  | { phase: "saved"; count: number; total: number }
  | { phase: "missing"; firstMissingId: string; count: number; total: number }
  | { phase: "unsupported" };

function Check({ tone, icon, title, detail, href, cta }: { tone: Tone; icon: IconName; title: string; detail: string; href?: string; cta?: string }) {
  const badge =
    tone === "ok" ? "bg-success-soft text-success" : tone === "todo" ? "bg-warning-soft text-warning" : "bg-surface-2 text-ink";
  return (
    <li className="flex items-start gap-3 px-3.5 py-3">
      <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${badge}`} aria-hidden>
        <Icon name={tone === "ok" ? "check" : icon} size={15} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[14px] font-semibold">{title}</span>
        <span className="text-[12px] leading-relaxed text-ink-3">{detail}</span>
        {href && cta ? (
          <Link href={href} className="mt-1 inline-flex min-h-[44px] items-center self-start text-[13px] font-semibold text-accent hover:underline">
            {cta}
          </Link>
        ) : null}
      </span>
    </li>
  );
}

export function DoorReadiness({
  ownerId,
  tickets,
  pendingTransfers,
  entrance,
  doorsLabel,
}: {
  ownerId: string;
  tickets: ReadonlyArray<DoorReadinessTicket>;
  pendingTransfers: ReadonlyArray<DoorReadinessTransfer>;
  entrance: string | null;
  doorsLabel: string | null;
}) {
  const sentIds = React.useMemo(() => new Set(pendingTransfers.map((t) => t.ticketId)), [pendingTransfers]);
  // Tickets this person will show: not offered to someone else, not used yet.
  const held = React.useMemo(() => tickets.filter((t) => !sentIds.has(t.id) && !t.checkedInAt), [tickets, sentIds]);
  const heldKey = held.map((t) => t.id).join(",");
  // Browsers without service workers can't keep an offline copy; decide that
  // up front instead of inside the effect.
  const [offline, setOffline] = React.useState<OfflinePhase>(() =>
    typeof navigator !== "undefined" && !("serviceWorker" in navigator) ? { phase: "unsupported" } : { phase: "checking" },
  );

  React.useEffect(() => {
    let cancelled = false;
    const ids = heldKey ? heldKey.split(",") : [];
    if (ids.length === 0 || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    Promise.all(ids.map((ticketId) => getOfflineTicketState({ ticketId, ownerId }).catch(() => null)))
      .then((replies) => {
        if (cancelled) return;
        if (replies.every((r) => !r || (r.ok === false && r.error && /not supported/i.test(r.error)))) {
          setOffline({ phase: "unsupported" });
          return;
        }
        const missingIndex = replies.findIndex((r) => !r?.available);
        const savedCount = replies.filter((r) => r?.available).length;
        setOffline(
          missingIndex === -1
            ? { phase: "saved", count: savedCount, total: ids.length }
            : { phase: "missing", firstMissingId: ids[missingIndex], count: savedCount, total: ids.length },
        );
      })
      .catch(() => {
        if (!cancelled) setOffline({ phase: "unsupported" });
      });
    return () => {
      cancelled = true;
    };
  }, [heldKey, ownerId]);

  if (held.length === 0 && pendingTransfers.length === 0) return null;

  const spare = held.length > 1 ? held.slice(1) : [];
  const ticketWord = (n: number) => (n === 1 ? "ticket" : "tickets");

  return (
    <section className="flex flex-col gap-2.5" aria-labelledby="door-readiness">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="door-readiness" className="text-[18px] font-semibold tracking-[-0.01em]">
          Ready for the door
        </h2>
        <span className="font-mono text-[10px] uppercase text-ink-3">Quick check</span>
      </div>
      <Card className="overflow-hidden">
        <ul className="flex flex-col divide-y divide-line">
          {held.length > 0 ? (
            offline.phase === "saved" ? (
              <Check
                tone="ok"
                icon="download"
                title="Saved on this phone"
                detail={`Your ${ticketWord(offline.total)} will open even with no signal at the gate.`}
              />
            ) : offline.phase === "missing" ? (
              <Check
                tone="todo"
                icon="download"
                title={offline.count > 0 ? `${offline.count} of ${offline.total} saved on this phone` : "Not saved on this phone yet"}
                detail="Signal at venues can drop. Save it now so your QR opens offline."
                href={`/tickets/${offline.firstMissingId}`}
                cta="Save for offline"
              />
            ) : offline.phase === "unsupported" ? (
              <Check
                tone="info"
                icon="download"
                title="Keep a backup"
                detail="This browser can't save tickets offline. Take a screenshot of your QR before you leave."
              />
            ) : (
              <Check tone="info" icon="loader" title="Checking this phone…" detail="Seeing whether your ticket is saved for offline use." />
            )
          ) : null}

          {pendingTransfers.map((t) => (
            <Check
              key={t.ticketId}
              tone="todo"
              icon="arrowUR"
              title={`Waiting for ${t.toName} to accept`}
              detail={`Until they accept, the ticket stays yours${t.expiresLabel ? `. The offer lasts ${t.expiresLabel}` : ""}. Remind them to open the link.`}
              href="/transfers"
              cta="See transfer"
            />
          ))}

          {spare.length > 0 ? (
            <Check
              tone="todo"
              icon="users"
              title={`${spare.length} more ${ticketWord(spare.length)} on your phone`}
              detail="If someone is coming with you, send them their ticket so they get their own QR and can go in on their own."
              href={`/tickets/${spare[0].id}/transfer`}
              cta="Send a ticket"
            />
          ) : null}

          {entrance || doorsLabel ? (
            <Check
              tone="info"
              icon="flag"
              title={entrance ? `Go to ${entrance}` : "Doors"}
              detail={doorsLabel ? `Doors open at ${doorsLabel}. Arrive early to beat the queue.` : "Have your QR open before you reach the front."}
            />
          ) : null}
        </ul>
      </Card>
    </section>
  );
}
