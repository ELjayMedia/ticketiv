import Link from "next/link";
import { Icon } from "@/components/quiet/ui/icon";
import { Card } from "@/components/quiet/ui/card";
import type { AttendeeWaitlistEntry } from "@/lib/data/attendee/waitlist";

interface WaitlistCentreProps {
  entries: AttendeeWaitlistEntry[];
}

function statusTone(status: string): { label: string; className: string } {
  const normalized = status.toLowerCase();
  if (["offered", "offer_available", "notified"].includes(normalized)) {
    return { label: "Offer available", className: "bg-accent-soft text-accent" };
  }
  if (["fulfilled", "converted", "completed"].includes(normalized)) {
    return { label: "Fulfilled", className: "bg-accent-soft text-accent" };
  }
  if (["expired", "cancelled", "canceled"].includes(normalized)) {
    return { label: normalized.replaceAll("_", " "), className: "bg-[#fdf0ec] text-[#c1422b]" };
  }
  return { label: normalized.replaceAll("_", " ") || "Active", className: "bg-[#fdf6ed] text-[#c1841c]" };
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

function formatExpiry(iso: string | null): string | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(diff)) return null;
  if (diff <= 0) return "Offer expired";
  const hours = Math.ceil(diff / 3_600_000);
  if (hours < 24) return `Offer expires in ${hours}h`;
  const days = Math.ceil(hours / 24);
  return `Offer expires in ${days}d`;
}

export function WaitlistCentre({ entries }: WaitlistCentreProps) {
  const hasEntries = entries.length > 0;
  const activeCount = entries.filter((entry) => ["active", "pending", "offered", "offer_available", "notified"].includes(entry.status.toLowerCase())).length;

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
        <div className="text-label">Sold-out events</div>
        <div className="mt-1 flex items-end justify-between gap-3">
          <h1 className="text-h1">Waitlist</h1>
          {hasEntries && (
            <span className="rounded bg-accent-soft px-2 py-1 font-mono text-[10px] font-semibold uppercase text-accent">
              {activeCount} active
            </span>
          )}
        </div>
        <p className="mt-2 font-mono text-[12px] leading-relaxed text-ink-3">
          Track sold-out ticket requests, offer windows and fulfilled waitlist entries from one place.
        </p>
      </header>

      {!hasEntries ? (
        <section className="px-5">
          <Card className="p-6 text-center">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Icon name="clock" size={22} />
            </div>
            <div className="mt-4 text-[15px] font-semibold">No waitlist entries yet</div>
            <p className="mx-auto mt-1.5 max-w-[320px] font-mono text-[11px] leading-relaxed text-ink-3">
              When primary tickets are unavailable, join the waitlist from the event page. Any offers and expiry times will appear here.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-[var(--radius)] bg-ink px-3 py-2 text-[12px] font-semibold text-white hover:bg-ink-2"
              >
                Find events
              </Link>
              <Link
                href="/notifications"
                className="inline-flex items-center justify-center rounded-[var(--radius)] border border-line-2 px-3 py-2 text-[12px] font-semibold hover:bg-bg"
              >
                Notifications
              </Link>
            </div>
          </Card>
        </section>
      ) : (
        <section className="px-5">
          <ul className="flex flex-col gap-2">
            {entries.map((entry) => {
              const tone = statusTone(entry.status);
              const expiry = formatExpiry(entry.offerExpiresAt);
              const eventHref = entry.eventSlug ? `/events/${entry.eventSlug}` : "/";
              const canCheckout = expiry && !expiry.includes("expired");

              return (
                <li key={entry.id}>
                  <Card className="p-3.5" flat>
                    <div className="flex items-start gap-3">
                      <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                        <Icon name="clock" size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <span className="min-w-0 flex-1 text-[13px] font-semibold">
                            {entry.eventTitle ?? "Event"}
                          </span>
                          <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${tone.className}`}>
                            {tone.label}
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-[11px] leading-relaxed text-ink-3">
                          {entry.ticketTypeName ?? "Any ticket"} · {entry.quantityRequested} requested · joined {formatDate(entry.joinedAt)}
                        </p>
                        {expiry && (
                          <p className="mt-1 font-mono text-[11px] font-semibold text-accent">
                            {expiry}
                          </p>
                        )}
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <Link
                            href={eventHref}
                            className="inline-flex items-center justify-center rounded-[var(--radius)] border border-line-2 px-3 py-2 text-[12px] font-semibold hover:bg-bg"
                          >
                            View event
                          </Link>
                          {canCheckout ? (
                            <Link
                              href={`/checkout/waitlist/${entry.id}`}
                              className="inline-flex items-center justify-center rounded-[var(--radius)] bg-accent px-3 py-2 text-[12px] font-semibold text-white hover:opacity-90"
                            >
                              Checkout offer
                            </Link>
                          ) : (
                            <Link
                              href="/notifications"
                              className="inline-flex items-center justify-center rounded-[var(--radius)] bg-ink px-3 py-2 text-[12px] font-semibold text-white hover:bg-ink-2"
                            >
                              Get updates
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
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
