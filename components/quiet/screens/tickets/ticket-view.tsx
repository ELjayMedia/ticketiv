"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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

type TicketDisplayStatus =
  | "issued"
  | "checked_in"
  | "transferred"
  | "refunded"
  | "revoked";

interface TicketViewProps {
  ticket?: TicketData;
  /** All ticket IDs in the same order, including this one. When provided, dots become navigable links. */
  siblingIds?: string[];
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
  status?: TicketDisplayStatus;
}

const DEFAULT_SIBLING_IDS = ["tkt_demo_001", "tkt_demo_002"];

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
  status: "issued",
};

const STATUS_BADGE: Record<
  TicketDisplayStatus,
  { chip: { label: string; variant?: "accent"; className?: string }; headline: string; copy: string }
> = {
  issued: {
    chip: { label: "Valid", variant: "accent" },
    headline: "Valid for entry",
    copy: "Show this QR at the gate.",
  },
  checked_in: {
    chip: { label: "Checked in", className: "border-transparent bg-line/40 text-ink-3" },
    headline: "Already checked in",
    copy: "This ticket has been scanned and used.",
  },
  transferred: {
    chip: {
      label: "↗ Transferred",
      className: "border-transparent bg-[#fdf0ec] text-[#c1422b]",
    },
    headline: "Transferred to someone else",
    copy: "You no longer own this ticket. The QR is hidden.",
  },
  refunded: {
    chip: { label: "Refunded", className: "border-transparent bg-line/40 text-ink-3" },
    headline: "Refunded",
    copy: "This ticket has been refunded and is no longer valid.",
  },
  revoked: {
    chip: { label: "Revoked", className: "border-transparent bg-danger/10 text-danger" },
    headline: "Revoked",
    copy: "This ticket was revoked by the organizer and won't scan at the gate.",
  },
};

export function TicketView({ ticket = DEFAULT_TICKET, siblingIds = DEFAULT_SIBLING_IDS }: TicketViewProps) {
  const status: TicketDisplayStatus = ticket.status ?? (ticket.isValid ? "issued" : "checked_in");
  const badge = STATUS_BADGE[status];
  const canTransferOrResell = status === "issued";
  const router = useRouter();
  const touchStartX = React.useRef<number | null>(null);

  const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(
    `${ticket.venueName} ${ticket.venueAddress}`
  )}`;

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 50) return;
    const currentIndex = siblingIds.indexOf(ticket.id);
    if (currentIndex === -1) return;
    if (delta < 0 && currentIndex < siblingIds.length - 1) {
      router.push(`/tickets/${siblingIds[currentIndex + 1]}`);
    } else if (delta > 0 && currentIndex > 0) {
      router.push(`/tickets/${siblingIds[currentIndex - 1]}`);
    }
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: `Ticket: ${ticket.eventTitle}`,
        text: `My ticket for ${ticket.eventTitle} on ${ticket.dateLabel}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href).catch(() => {});
    }
  }

  const [walletBusy, setWalletBusy] = React.useState(false);
  const [walletMsg, setWalletMsg] = React.useState<string | null>(null);

  function handleSave() {
    window.print();
  }

  function detectPlatform(): "apple" | "google" | "unknown" {
    if (typeof navigator === "undefined") return "unknown";
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod|macintosh/.test(ua)) return "apple";
    if (/android/.test(ua)) return "google";
    return "unknown";
  }

  async function handleWallet() {
    setWalletBusy(true);
    setWalletMsg(null);
    try {
      const platform = detectPlatform();
      const res = await fetch(
        `/api/tickets/${encodeURIComponent(ticket.id)}/wallet?platform=${platform}`,
      );
      const ct = res.headers.get("content-type") ?? "";

      if (res.ok && ct.includes("vnd.apple.pkpass")) {
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = `${ticket.eventTitle.replace(/\s+/g, "-")}.pkpass`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
        return;
      }

      if (res.ok && ct.includes("application/json")) {
        const body = (await res.json()) as { saveUrl?: string };
        if (body.saveUrl) {
          window.open(body.saveUrl, "_blank", "noopener,noreferrer");
          return;
        }
      }

      // Not available — fall back to print so the user still gets a saved copy.
      const body = await res.json().catch(() => ({}));
      setWalletMsg(
        body?.message ??
          "Wallet export isn't available right now. Opening Save instead.",
      );
      setTimeout(() => {
        setWalletMsg(null);
        window.print();
      }, 1500);
    } catch {
      setWalletMsg("Couldn't reach wallet service. Use Save to keep a copy.");
      setTimeout(() => setWalletMsg(null), 2500);
    } finally {
      setWalletBusy(false);
    }
  }
  return (
    <div
      className="min-h-dvh bg-ink text-white"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
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
          onClick={handleShare}
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
              <Chip variant={badge.chip.variant} size="sm" className={badge.chip.className}>
                {badge.chip.label}
              </Chip>
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
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-surface px-2.5 py-1 text-xs font-semibold text-ink transition-colors hover:bg-bg"
              >
                Maps
              </a>
            </div>
          </div>

          {/* Perforation — negative-space circles cut against the ink bg */}
          <div className="relative h-[22px] bg-ink">
            <span className="absolute -left-[11px] top-0 h-[22px] w-[22px] rounded-full bg-ink" />
            <span className="absolute -right-[11px] top-0 h-[22px] w-[22px] rounded-full bg-ink" />
            <span className="absolute inset-x-6 top-[10px] border-t-2 border-dashed border-line-2" />
          </div>

          {/* QR half — only valid tickets render the scannable QR. */}
          {ticket.isValid ? (
            <div className="p-4 text-center">
              <div className="text-label mb-3.5">Scan at gate</div>
              <div className="inline-block rounded-xl border border-line bg-bg p-2.5 text-ink">
                <QRPattern size={150} seed={ticket.qrCode} />
              </div>
              <div className="mt-3 font-mono text-[11px] tracking-[0.04em] text-ink-3">
                {ticket.qrCode}
              </div>
              <div className="mt-3 flex items-center justify-center gap-3.5">
                <Button variant="default" size="xs" onClick={handleWallet} disabled={walletBusy}>
                  <Icon name="wallet" size={14} /> {walletBusy ? "Working…" : "Wallet"}
                </Button>
                <Button variant="default" size="xs" onClick={handleSave}>
                  <Icon name="download" size={14} /> Save
                </Button>
              </div>
              {walletMsg && (
                <div
                  role="status"
                  className="mt-2 text-[11px] text-ink-3"
                >
                  {walletMsg}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 text-center" role="status">
              <div className="text-label mb-2">No QR</div>
              <p className="mx-auto max-w-[280px] text-[14px] font-semibold text-ink">
                {badge.headline}
              </p>
              <p className="mx-auto mt-1.5 max-w-[280px] text-[12px] text-ink-3">
                {badge.copy}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions — only available while the ticket is valid. */}
      {canTransferOrResell && (
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
      )}

      {/* Pagination dots */}
      {ticket.totalInOrder > 1 && (
        <div className="flex items-center justify-center gap-1.5 pb-6">
          {siblingIds.length > 1 ? (
            siblingIds.map((id, i) => (
              <Link
                key={id}
                href={`/tickets/${id}`}
                aria-label={`Ticket ${i + 1} of ${siblingIds.length}`}
                className={
                  id === ticket.id
                    ? "h-1.5 w-6 rounded-full bg-white transition-all"
                    : "h-1.5 w-1.5 rounded-full bg-white/30 transition-all hover:bg-white/60"
                }
              />
            ))
          ) : (
            <>
              <span className="h-1.5 w-6 rounded-full bg-white" />
              {Array.from({ length: ticket.totalInOrder - 1 }).map((_, i) => (
                <span key={i} className="h-1.5 w-1.5 rounded-full bg-white/30" />
              ))}
            </>
          )}
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
