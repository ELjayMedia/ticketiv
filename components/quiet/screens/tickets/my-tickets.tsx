"use client";

import * as React from "react";
import { acceptTransfer, declineTransfer } from "@/lib/data/attendee/transfers";
import Link from "next/link";
import { Icon } from "@/components/quiet/ui/icon";
import { Chip } from "@/components/quiet/ui/chip";
import { Card } from "@/components/quiet/ui/card";
import {
  Photo,
  Divider,
  Avatar,
  Segmented,
  LiveDot,
} from "@/components/quiet/ui/primitives";
import { Button } from "@/components/quiet/ui/button";
import { PHOTOS } from "@/lib/photos";

/* ──────────────────────────────────────────────────────────────
 * Mobile /tickets · ticket ownership hub
 *
 * Three segments: Upcoming (default), Past, Transfers.
 * One featured ticket card (the next event happening) + a list
 * of other upcoming tickets + an inbound transfer "action needed"
 * block. Featured and list items now expose a resale/listing entry point
 * so sold-out recovery and owner-side resale have a clear place to start.
 * ────────────────────────────────────────────────────────────── */

type Segment = "upcoming" | "past" | "transfers";

type TicketDisplayStatus =
  | "issued"
  | "checked_in"
  | "transferred"
  | "refunded"
  | "revoked";

interface MyTicketsProps {
  featured?: FeaturedTicket;
  upcoming?: TicketListItem[];
  past?: TicketListItem[];
  inboundTransfer?: InboundTransfer | null;
  counts?: { upcoming: number; past: number; transfers: number };
}

interface FeaturedTicket {
  ticketId: string;
  orderNumber: string;
  eventTitle: string;
  eventPhoto: string;
  whenLabel: string;
  venueLabel: string;
  seatLabel: string;
  daysUntil: number;
  urgencyLabel: string;
  isEventDay: boolean;
}

interface TicketListItem {
  ticketId: string;
  title: string;
  photo: string;
  whenLabel: string;
  venueLabel: string;
  count: number;
  status: TicketDisplayStatus;
}

const STATUS_CHIP: Record<
  TicketDisplayStatus,
  { label: string; className?: string; variant?: "accent" }
> = {
  issued: { label: "Issued", variant: "accent" },
  checked_in: {
    label: "Checked in",
    className: "border-transparent bg-line/40 text-ink-3",
  },
  transferred: {
    label: "↗ Transferred",
    className: "border-transparent bg-[#fdf0ec] text-[#c1422b]",
  },
  refunded: {
    label: "Refunded",
    className: "border-transparent bg-line/40 text-ink-3 line-through",
  },
  revoked: {
    label: "Revoked",
    className: "border-transparent bg-danger/10 text-danger",
  },
};

interface InboundTransfer {
  transferId?: string;
  fromName: string;
  fromPhoto: string;
  eventTitle: string;
  expiresInLabel: string;
}

const DEFAULT_FEATURED: FeaturedTicket = {
  ticketId: "tkt_demo_001",
  orderNumber: "RG7352",
  eventTitle: "Tribal Tales",
  eventPhoto: PHOTOS.dj_set,
  whenLabel: "WED 30 AUG · 15:50",
  venueLabel: "Cafe Natarani",
  seatLabel: "seats C-4, C-5",
  daysUntil: 4,
  urgencyLabel: "IN 4 DAYS",
  isEventDay: false,
};

const DEFAULT_UPCOMING: TicketListItem[] = [
  {
    ticketId: "tkt_demo_002",
    title: "Stand-up · A. Khan",
    photo: PHOTOS.singer_red,
    whenLabel: "Fri 25 Jul · 21:30",
    venueLabel: "Comedy Club",
    count: 1,
    status: "issued",
  },
  {
    ticketId: "tkt_demo_003",
    title: "Indie Showcase",
    photo: PHOTOS.crowd_lights,
    whenLabel: "Sat 26 Jul · 22:00",
    venueLabel: "The Loft",
    count: 1,
    status: "issued",
  },
  {
    ticketId: "tkt_demo_004",
    title: "Sunset Set",
    photo: PHOTOS.fest_river,
    whenLabel: "Sat 23 Aug · 18:00",
    venueLabel: "Riverside",
    count: 2,
    status: "transferred",
  },
];

const DEFAULT_INBOUND: InboundTransfer = {
  fromName: "Salman",
  fromPhoto: PHOTOS.face_3,
  eventTitle: "Indie Showcase",
  expiresInLabel: "expires in 22h",
};

export function MyTickets({
  featured,
  upcoming,
  past,
  inboundTransfer,
  counts,
}: MyTicketsProps) {
  const [seg, setSeg] = React.useState<Segment>("upcoming");
  const [transferLoading, setTransferLoading] = React.useState<"accept" | "decline" | null>(null);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // When the page is given no data at all (e.g. /dev/preview), fall back to
  // the demo arrays so the screen still renders. For real authenticated users
  // we receive `upcoming: []` — that path renders an honest empty state.
  const isDemo =
    featured === undefined && upcoming === undefined && counts === undefined;
  const _featured = featured ?? (isDemo ? DEFAULT_FEATURED : undefined);
  const _upcoming = upcoming ?? (isDemo ? DEFAULT_UPCOMING : []);
  const _past = past ?? [];
  const _inbound =
    inboundTransfer === undefined && isDemo ? DEFAULT_INBOUND : inboundTransfer;
  const _counts = counts ?? { upcoming: _upcoming.length, past: _past.length, transfers: 0 };
  const hasUpcoming = Boolean(_featured) || _upcoming.length > 0;

  const filteredUpcoming = searchQuery.trim()
    ? _upcoming.filter((t) => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : _upcoming;

  function handleShareFeatured() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      navigator.share({ title: `My ticket for ${_featured?.eventTitle}`, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).catch(() => {});
    }
  }

  function handleAddToCalendar() {
    if (!_featured) return;
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Ticketiv//EN",
      "BEGIN:VEVENT",
      `SUMMARY:${_featured.eventTitle}`,
      `DESCRIPTION:Ticket #${_featured.orderNumber} · ${_featured.seatLabel}`,
      `LOCATION:${_featured.venueLabel}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${_featured.eventTitle.replace(/\s+/g, "-")}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-bg pb-24">
      <div className="h-14" />

      {/* Header */}
      <header className="flex items-end gap-2.5 px-5 pb-3 pt-2">
        <div className="flex flex-1 flex-col">
          <span className="text-label">My tickets</span>
          <span className="text-h1 mt-0.5">
            Upcoming · {_counts.upcoming}
          </span>
        </div>
        <button
          aria-label="Search tickets"
          onClick={() => { setSearchOpen((v) => !v); setSearchQuery(""); }}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60"
        >
          <Icon name="search" size={20} />
        </button>
        <button
          aria-label="Download all tickets"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60"
        >
          <Icon name="download" size={20} />
        </button>
      </header>

      {searchOpen && (
        <div className="px-5 pb-2">
          <div className="flex items-center gap-2 rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-2">
            <Icon name="search" size={14} className="text-ink-3 shrink-0" />
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tickets…"
              className="flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-3"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-ink-3 hover:text-ink">
                <Icon name="close" size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Segmented */}
      <div className="px-5 pb-4">
        <Segmented
          value={seg}
          onChange={setSeg}
          options={[
            { value: "upcoming", label: "Upcoming" },
            { value: "past", label: `Past · ${_counts.past}` },
            {
              value: "transfers",
              label: `Transfers · ${_counts.transfers}`,
            },
          ]}
        />
      </div>

      {seg === "upcoming" && !hasUpcoming && (
        <EmptyState
          icon="ticket"
          title="No upcoming tickets yet"
          subtitle="When you buy or receive a ticket it'll show up here."
        />
      )}

      {seg === "upcoming" && hasUpcoming && (
        <>
          {/* Featured ticket card */}
          {_featured && (
          <section className="px-5 pb-4">
            <Card className="overflow-hidden border-accent">
              <div
                className={
                  "flex items-center gap-1.5 px-3.5 py-2 " +
                  (_featured.isEventDay ? "bg-accent text-white" : "bg-accent-soft")
                }
              >
                <LiveDot />
                <span
                  className={
                    "font-mono text-[11px] font-semibold uppercase " +
                    (_featured.isEventDay ? "text-white" : "text-accent")
                  }
                >
                  {_featured.urgencyLabel}
                </span>
                <span className="flex-1" />
                <span
                  className={
                    "font-mono text-[10px] " +
                    (_featured.isEventDay ? "text-white/85" : "text-ink-3")
                  }
                >
                  #{_featured.orderNumber}
                </span>
              </div>
              <div className="p-3.5">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[var(--radius-md)]">
                    <Photo src={_featured.eventPhoto} height={56} />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <span className="text-[16px] font-semibold tracking-[-0.01em]">
                      {_featured.eventTitle}
                    </span>
                    <span className="font-mono text-[11px] uppercase text-ink-3">
                      {_featured.whenLabel}
                    </span>
                    <span className="font-mono text-[11px] text-ink-3">
                      {_featured.venueLabel} · {_featured.seatLabel}
                    </span>
                  </div>
                </div>
                <Divider className="my-3" />
                <div className="flex gap-1.5">
                  <Link
                    href={`/tickets/${_featured.ticketId}`}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius)] bg-ink px-3 py-2 text-[12px] font-medium text-white hover:bg-ink-2"
                  >
                    <Icon name="qr" size={14} /> Show QR
                  </Link>
                  <Link
                    href={`/resale?ticketId=${encodeURIComponent(_featured.ticketId)}`}
                    aria-label="List ticket"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] border border-line-2 hover:bg-bg"
                  >
                    <Icon name="ticket" size={14} />
                  </Link>
                  <button
                    aria-label="Share"
                    onClick={handleShareFeatured}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] border border-line-2 hover:bg-bg"
                  >
                    <Icon name="arrowUR" size={14} />
                  </button>
                  <button
                    aria-label="Add to calendar"
                    onClick={handleAddToCalendar}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] border border-line-2 hover:bg-bg"
                  >
                    <Icon name="cal" size={14} />
                  </button>
                </div>
                <Link
                  href={`/resale?ticketId=${encodeURIComponent(_featured.ticketId)}`}
                  className="mt-3 flex items-center justify-between rounded-[var(--radius)] border border-dashed border-line-2 px-3 py-2 text-left hover:bg-bg"
                >
                  <span className="flex flex-col">
                    <span className="text-[12px] font-semibold">Can’t attend?</span>
                    <span className="font-mono text-[10px] text-ink-3">
                      Start a resale listing from this ticket.
                    </span>
                  </span>
                  <Icon name="chevR" size={14} className="text-ink-3" />
                </Link>
              </div>
            </Card>
          </section>
          )}

          {/* Other upcoming */}
          <ul className="flex flex-col gap-2 px-5">
            {filteredUpcoming.map((t) => (
              <li key={t.ticketId}>
                <Card
                  className="flex items-center gap-3 p-3 transition-colors hover:bg-bg"
                  flat
                >
                  <Link href={`/tickets/${t.ticketId}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[var(--radius)]">
                      <Photo src={t.photo} height={48} />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[14px] font-semibold">
                        {t.title}
                      </span>
                      <span className="truncate font-mono text-[11px] text-ink-3">
                        {t.whenLabel} · {t.venueLabel}
                      </span>
                      <div className="mt-1 flex gap-1">
                        <StatusChip status={t.status} count={t.count} />
                      </div>
                    </div>
                  </Link>
                  {t.status === "issued" ? (
                    <Link
                      href={`/resale?ticketId=${encodeURIComponent(t.ticketId)}`}
                      aria-label={`List ${t.title}`}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius)] border border-line-2 hover:bg-bg"
                    >
                      <Icon name="ticket" size={14} />
                    </Link>
                  ) : (
                    <Icon
                      name="chevR"
                      size={16}
                      className="text-ink-3"
                      aria-hidden
                    />
                  )}
                </Card>
              </li>
            ))}
          </ul>

          {/* Resale education */}
          <section className="px-5 pt-4">
            <Card className="border-line-2 p-3.5" flat>
              <div className="flex items-start gap-3">
                <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Icon name="ticket" size={16} />
                </div>
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-[13px] font-semibold">Resale is coming into this flow</span>
                  <span className="font-mono text-[11px] leading-relaxed text-ink-3">
                    Eligible unused tickets will be listable before doors, with listing status tracked under Resale.
                  </span>
                </div>
                <Link href="/resale" className="text-[12px] font-semibold text-accent">
                  View
                </Link>
              </div>
            </Card>
          </section>

          {/* Inbound transfer */}
          {_inbound && (
            <section className="px-5 pt-4">
              <div className="text-label mb-2">Action needed</div>
              <Card
                className="border-[#fde2c1] bg-[#fdf6ed] p-3.5"
                flat
              >
                <div className="flex items-center gap-3">
                  <Avatar src={_inbound.fromPhoto} size={36} />
                  <div className="flex flex-1 flex-col">
                    <span className="text-[13px] font-semibold">
                      {_inbound.fromName} sent you a ticket
                    </span>
                    <span className="font-mono text-[11px] text-ink-3">
                      {_inbound.eventTitle} ·{" "}
                      {_inbound.expiresInLabel}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex gap-1.5">
                  <Button
                    variant="default"
                    size="xs"
                    className="flex-1"
                    disabled={transferLoading !== null}
                    onClick={async () => {
                      if (!_inbound?.transferId) return;
                      setTransferLoading("decline");
                      await declineTransfer(_inbound.transferId).catch(() => null);
                      setTransferLoading(null);
                    }}
                  >
                    Decline
                  </Button>
                  <Button
                    variant="accent"
                    size="xs"
                    className="flex-1"
                    disabled={transferLoading !== null}
                    onClick={async () => {
                      if (!_inbound?.transferId) return;
                      setTransferLoading("accept");
                      await acceptTransfer(_inbound.transferId).catch(() => null);
                      setTransferLoading(null);
                    }}
                  >
                    {transferLoading === "accept" ? "Accepting…" : "Accept transfer"}
                  </Button>
                </div>
              </Card>
            </section>
          )}
        </>
      )}

      {seg === "past" && (
        _past.length === 0 ? (
          <EmptyState
            icon="ticket"
            title="No past tickets"
            subtitle="Events you've attended will show up here once they're done."
          />
        ) : (
          <ul className="flex flex-col gap-2 px-5">
            {_past.map((t) => (
              <li key={t.ticketId}>
                <Link
                  href={`/tickets/${t.ticketId}`}
                  className="flex items-center gap-3 rounded-[var(--radius-md)] border border-line bg-surface p-3 transition-colors hover:bg-bg"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[var(--radius)] opacity-80">
                    <Photo src={t.photo} height={48} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[14px] font-semibold">
                      {t.title}
                    </span>
                    <span className="truncate font-mono text-[11px] text-ink-3">
                      {t.whenLabel} · {t.venueLabel}
                    </span>
                    <div className="mt-1 flex gap-1">
                      <StatusChip status={t.status} count={t.count} />
                    </div>
                  </div>
                  <Icon name="chevR" size={16} className="text-ink-3" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )
      )}

      {seg === "transfers" && (
        <EmptyState
          icon="arrowUR"
          title="Transfers"
          subtitle="Outgoing and incoming transfers will appear here."
        />
      )}
    </div>
  );
}

function StatusChip({ status, count }: { status: TicketDisplayStatus; count: number }) {
  const config = STATUS_CHIP[status];
  if (status === "issued") {
    return (
      <Chip variant="accent" size="sm">
        {count} ticket{count > 1 ? "s" : ""}
      </Chip>
    );
  }
  return (
    <Chip size="sm" className={config.className}>
      {config.label}
    </Chip>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mx-5 mt-4 flex flex-col items-center gap-2.5 rounded-[var(--radius-lg)] border border-dashed border-line-2 px-6 py-10 text-center">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Icon name={icon} size={18} />
      </div>
      <span className="text-[14px] font-semibold">{title}</span>
      <span className="font-mono text-[11px] leading-relaxed text-ink-3">
        {subtitle}
      </span>
    </div>
  );
}
