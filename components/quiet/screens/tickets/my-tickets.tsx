"use client";

import * as React from "react";
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
 * Mobile /tickets · port of QuietMyTickets
 *
 * Three segments: Upcoming (default), Past, Transfers.
 * One featured ticket card (the next event happening) + a list
 * of other upcoming tickets + an inbound transfer "action needed"
 * block. The featured card has shortcut buttons: Show QR, Share,
 * Copy link, Add to Calendar.
 *
 * "use client" because the segmented control needs state. The
 * lists themselves are passed in from the server route.
 * ────────────────────────────────────────────────────────────── */

type Segment = "upcoming" | "past" | "transfers";

interface MyTicketsProps {
  featured?: FeaturedTicket;
  upcoming?: TicketListItem[];
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
}

interface TicketListItem {
  ticketId: string;
  title: string;
  photo: string;
  whenLabel: string;
  venueLabel: string;
  count: number;
  status: "issued" | "transferred";
}

interface InboundTransfer {
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
  featured = DEFAULT_FEATURED,
  upcoming = DEFAULT_UPCOMING,
  inboundTransfer = DEFAULT_INBOUND,
  counts = { upcoming: 4, past: 12, transfers: 1 },
}: MyTicketsProps) {
  const [seg, setSeg] = React.useState<Segment>("upcoming");

  return (
    <div className="bg-bg pb-24">
      <div className="h-14" />

      {/* Header */}
      <header className="flex items-end gap-2.5 px-5 pb-3 pt-2">
        <div className="flex flex-1 flex-col">
          <span className="text-label">My tickets</span>
          <span className="text-h1 mt-0.5">
            Upcoming · {counts.upcoming}
          </span>
        </div>
        <button
          aria-label="Search tickets"
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

      {/* Segmented */}
      <div className="px-5 pb-4">
        <Segmented
          value={seg}
          onChange={setSeg}
          options={[
            { value: "upcoming", label: "Upcoming" },
            { value: "past", label: `Past · ${counts.past}` },
            {
              value: "transfers",
              label: `Transfers · ${counts.transfers}`,
            },
          ]}
        />
      </div>

      {seg === "upcoming" && (
        <>
          {/* Featured ticket card */}
          <section className="px-5 pb-4">
            <Card className="overflow-hidden border-accent">
              <div className="flex items-center gap-1.5 bg-accent-soft px-3.5 py-2">
                <LiveDot />
                <span className="font-mono text-[11px] font-semibold uppercase text-accent">
                  In {featured.daysUntil} days
                </span>
                <span className="flex-1" />
                <span className="font-mono text-[10px] text-ink-3">
                  #{featured.orderNumber}
                </span>
              </div>
              <div className="p-3.5">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[var(--radius-md)]">
                    <Photo src={featured.eventPhoto} height={56} />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <span className="text-[16px] font-semibold tracking-[-0.01em]">
                      {featured.eventTitle}
                    </span>
                    <span className="font-mono text-[11px] uppercase text-ink-3">
                      {featured.whenLabel}
                    </span>
                    <span className="font-mono text-[11px] text-ink-3">
                      {featured.venueLabel} · {featured.seatLabel}
                    </span>
                  </div>
                </div>
                <Divider className="my-3" />
                <div className="flex gap-1.5">
                  <Link
                    href={`/tickets/${featured.ticketId}`}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius)] bg-ink px-3 py-2 text-[12px] font-medium text-white hover:bg-ink-2"
                  >
                    <Icon name="qr" size={14} /> Show QR
                  </Link>
                  <button
                    aria-label="Share"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] border border-line-2 hover:bg-bg"
                  >
                    <Icon name="arrowUR" size={14} />
                  </button>
                  <button
                    aria-label="Copy link"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] border border-line-2 hover:bg-bg"
                  >
                    <Icon name="copy" size={14} />
                  </button>
                  <button
                    aria-label="Add to calendar"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] border border-line-2 hover:bg-bg"
                  >
                    <Icon name="cal" size={14} />
                  </button>
                </div>
              </div>
            </Card>
          </section>

          {/* Other upcoming */}
          <ul className="flex flex-col gap-2 px-5">
            {upcoming.map((t) => (
              <li key={t.ticketId}>
                <Link href={`/tickets/${t.ticketId}`}>
                  <Card
                    className="flex items-center gap-3 p-3 transition-colors hover:bg-bg"
                    flat
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[var(--radius)]">
                      <Photo src={t.photo} height={48} />
                    </div>
                    <div className="flex flex-1 flex-col">
                      <span className="text-[14px] font-semibold">
                        {t.title}
                      </span>
                      <span className="font-mono text-[11px] text-ink-3">
                        {t.whenLabel} · {t.venueLabel}
                      </span>
                      <div className="mt-1 flex gap-1">
                        {t.status === "transferred" ? (
                          <Chip
                            size="sm"
                            className="border-transparent bg-[#fdf0ec] text-[#c1422b]"
                          >
                            ↗ Transferred
                          </Chip>
                        ) : (
                          <Chip variant="accent" size="sm">
                            {t.count} ticket{t.count > 1 ? "s" : ""}
                          </Chip>
                        )}
                      </div>
                    </div>
                    <Icon name="chevR" size={16} className="text-ink-3" />
                  </Card>
                </Link>
              </li>
            ))}
          </ul>

          {/* Inbound transfer */}
          {inboundTransfer && (
            <section className="px-5 pt-4">
              <div className="text-label mb-2">Action needed</div>
              <Card
                className="border-[#fde2c1] bg-[#fdf6ed] p-3.5"
                flat
              >
                <div className="flex items-center gap-3">
                  <Avatar src={inboundTransfer.fromPhoto} size={36} />
                  <div className="flex flex-1 flex-col">
                    <span className="text-[13px] font-semibold">
                      {inboundTransfer.fromName} sent you a ticket
                    </span>
                    <span className="font-mono text-[11px] text-ink-3">
                      {inboundTransfer.eventTitle} ·{" "}
                      {inboundTransfer.expiresInLabel}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex gap-1.5">
                  <Button variant="default" size="xs" className="flex-1">
                    Decline
                  </Button>
                  <Button variant="accent" size="xs" className="flex-1">
                    Accept transfer
                  </Button>
                </div>
              </Card>
            </section>
          )}
        </>
      )}

      {seg === "past" && (
        <EmptyState
          icon="ticket"
          title="Past tickets"
          subtitle={`${counts.past} events you've been to. The list will land here in Phase 3 wiring.`}
        />
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
