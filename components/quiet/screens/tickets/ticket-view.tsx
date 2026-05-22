import Link from "next/link";
import { Icon } from "@/components/quiet/ui/icon";
import { Chip } from "@/components/quiet/ui/chip";
import { Photo, Divider, QRPattern } from "@/components/quiet/ui/primitives";
import { Button } from "@/components/quiet/ui/button";
import { PHOTOS } from "@/lib/photos";

/* ──────────────────────────────────────────────────────────────
 * `/tickets/[id]` — QR ticket view
 *
 * Dark background (HFQ_INK = #0a0a0c) for high contrast with the
 * white ticket card. The "perforation" is faked with two negative-
 * space circles cut into the card by giving them the same color
 * as the background.
 *
 * The QRPattern below is a deterministic SVG placeholder.
 * Real ticket QRs are signed by Supabase Edge Function and
 * rotate every 60s (see TICK-12). Wiring will pass the encoded
 * payload through to a real QR encoder (likely `qrcode` package).
 *
 * Quick actions at bottom: Transfer (→ /tickets/[id]/transfer)
 * and Resell (→ /tickets/[id]/resale).
 * ────────────────────────────────────────────────────────────── */

interface TicketViewProps {
  ticket?: TicketData;
}

interface TicketData {
  id: string;
  orderNumber: string;
  positionLabel: string; // "1 of 2"
  totalInOrder: number;
  eventTitle: string;
  eventPhoto: string;
  dateLabel: string;
  timeLabel: string;
  doorsLabel: string;
  holderName: string;
  seatLabel: string;
  typeLabel: string;
  venueName: string;
  venueAddress: string;
  venueDistanceKm: number;
  qrCode: string;
  isValid: boolean;
}

const DEFAULT_TICKET: TicketData = {
  id: "tkt_demo_001",
  orderNumber: "RG7352",
  positionLabel: "1 of 2",
  totalInOrder: 2,
  eventTitle: "Tribal Tales",
  eventPhoto: PHOTOS.dj_set,
  dateLabel: "30 Aug",
  timeLabel: "15:50",
  doorsLabel: "15:00",
  holderName: "Prateek S.",
  seatLabel: "C-4",
  typeLabel: "Regular",
  venueName: "Cafe Natarani",
  venueAddress: "Shahibaug, Ahmedabad",
  venueDistanceKm: 12,
  qrCode: "TKT-9X2K-LM4P",
  isValid: true,
};

export function TicketView({ ticket = DEFAULT_TICKET }: TicketViewProps) {
  return (
    <div className="min-h-dvh bg-ink text-white">
      <div className="h-14" />

      {/* Top bar */}
      <header className="flex items-center gap-2.5 px-5 pb-3 pt-2">
        <Link
          href="/tickets"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          aria-label="Back"
        >
          <Icon name="chevL" size={18} />
        </Link>
        <div className="flex flex-1 flex-col text-center leading-tight">
          <span className="text-[14px] font-semibold">Your ticket</span>
          <span className="font-mono text-[11px] opacity-70">
            {ticket.positionLabel} · #{ticket.orderNumber}
          </span>
        </div>
        <button
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          aria-label="Share"
        >
          <Icon name="share" size={18} />
        </button>
      </header>

      {/* Ticket card */}
      <div className="px-5 py-4">
        <div className="overflow-hidden rounded-2xl bg-surface text-ink shadow-[0_24px_40px_-10px_rgba(0,0,0,0.4)]">
          {/* Top half */}
          <div className="p-4">
            <div className="mb-3.5 flex items-center gap-2.5">
              <div className="h-10 w-10 overflow-hidden rounded-[var(--radius)]">
                <Photo src={ticket.eventPhoto} height={40} />
              </div>
              <div className="flex flex-col">
                <span className="text-label">Event</span>
                <span className="text-[14px] font-semibold">
                  {ticket.eventTitle}
                </span>
              </div>
              <span className="flex-1" />
              {ticket.isValid && (
                <Chip variant="accent" size="sm">
                  Valid
                </Chip>
              )}
            </div>

            <Divider />

            <div className="grid grid-cols-3 gap-4 py-3.5">
              <FactCell label="Date" value={ticket.dateLabel} mono />
              <FactCell label="Time" value={ticket.timeLabel} mono />
              <FactCell label="Doors" value={ticket.doorsLabel} mono />
              <FactCell label="Name" value={ticket.holderName} />
              <FactCell label="Seat" value={ticket.seatLabel} mono />
              <FactCell label="Type" value={ticket.typeLabel} />
            </div>

            <Divider />

            <div className="flex items-center gap-2 pt-3.5">
              <Icon name="pin" size={14} className="text-ink-3 shrink-0" />
              <div className="flex flex-1 flex-col">
                <span className="text-[13px] font-semibold">
                  {ticket.venueName}
                </span>
                <span className="font-mono text-[11px] text-ink-3">
                  {ticket.venueAddress} · {ticket.venueDistanceKm} km
                </span>
              </div>
              <Button variant="default" size="xs">
                Maps
              </Button>
            </div>
          </div>

          {/* Perforation — negative-space circles cut against the ink bg */}
          <div className="relative h-[22px] bg-ink">
            <span className="absolute -left-[11px] top-0 h-[22px] w-[22px] rounded-full bg-ink" />
            <span className="absolute -right-[11px] top-0 h-[22px] w-[22px] rounded-full bg-ink" />
            <span className="absolute inset-x-6 top-[10px] border-t-2 border-dashed border-line-2" />
          </div>

          {/* QR half */}
          <div className="p-4 text-center">
            <div className="text-label mb-3.5">Scan at gate</div>
            <div className="inline-block rounded-xl border border-line bg-bg p-2.5 text-ink">
              <QRPattern size={150} seed={ticket.qrCode} />
            </div>
            <div className="mt-3 font-mono text-[11px] tracking-[0.04em] text-ink-3">
              {ticket.qrCode}
            </div>
            <div className="mt-3 flex items-center justify-center gap-3.5">
              <Button variant="default" size="xs">
                <Icon name="wallet" size={14} /> Wallet
              </Button>
              <Button variant="default" size="xs">
                <Icon name="download" size={14} /> Save
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2 px-5 pb-6 pt-3">
        <Link
          href={`/tickets/${ticket.id}/transfer`}
          className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-white/15 bg-white/[0.08] px-3 py-3 text-[13px] font-medium text-white hover:bg-white/15"
        >
          <Icon name="arrowUR" size={16} /> Transfer
        </Link>
        <Link
          href={`/tickets/${ticket.id}/resale`}
          className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-white/15 bg-white/[0.08] px-3 py-3 text-[13px] font-medium text-white hover:bg-white/15"
        >
          <Icon name="copy" size={16} /> Resell
        </Link>
      </div>

      {/* Pagination dots */}
      {ticket.totalInOrder > 1 && (
        <div className="flex items-center justify-center gap-1.5 pb-6">
          <span className="h-1.5 w-6 rounded-full bg-white" />
          {Array.from({ length: ticket.totalInOrder - 1 }).map((_, i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-white/30"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FactCell({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-label">{label}</span>
      <span
        className={
          "mt-0.5 text-[13px] font-semibold " + (mono ? "font-mono" : "")
        }
      >
        {value}
      </span>
    </div>
  );
}
