"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon, type IconName } from "@/components/quiet/ui/icon";
import { Chip } from "@/components/quiet/ui/chip";
import { Modal, ModalContent } from "@/components/quiet/ui/modal";
import { TicketQrCode } from "@/components/tickets/ticket-qr-code";
import {
  TICKET_PRINT_ID,
  TicketPrintCard,
  shortTicketCode,
} from "@/components/tickets/ticket-print-card";
import { renderTicketImage } from "@/lib/tickets/ticket-image";
import type { TicketViewProp } from "@/lib/mappers/tickets";
import { CheckInCelebration } from "@/components/tickets/check-in-celebration";
import { useTicketCheckIns, type TicketCheckIn } from "@/lib/hooks/use-ticket-check-ins";
import {
  getOfflineTicketState,
  removeOfflineTicket,
  saveTicketForOffline,
} from "@/lib/tickets/offline-ticket";

/* ──────────────────────────────────────────────────────────────
 * `/tickets/[id]` — QR ticket view ("Immersive")
 *
 * The event cover is the hero: blurred across the whole screen, with a
 * sharp framed copy in the middle and a white QR stub below. Everything
 * the gate needs (image, title, date, venue, holder, type, QR) fits one
 * phone screen; secondary actions live in the "More" sheet.
 *
 * Print renders `TicketPrintCard` (A5, white) instead of this screen,
 * and "Send" shares that same layout as a PNG for WhatsApp / email.
 *
 * The QR is generated first-party from the issued ticket_code. The
 * scanner submits that exact UUID through the existing gate validation
 * path. Signed/rotating payloads remain future hardening (TICK-12).
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

type TicketData = TicketViewProp;

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

type OfflineUiState = {
  phase: "checking" | "idle" | "saving" | "saved" | "removing" | "error";
  savedAt?: string;
  message?: string;
};

export function TicketView({ ticket, siblingIds = [] }: TicketViewProps) {
  const router = useRouter();
  const touchStartX = React.useRef<number | null>(null);
  const [walletBusy, setWalletBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [celebration, setCelebration] = React.useState<TicketCheckIn | null>(null);
  const [online, setOnline] = React.useState(true);
  const [offlineState, setOfflineState] = React.useState<OfflineUiState>({ phase: "checking" });
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const printRef = React.useRef<HTMLDivElement>(null);
  const shareFile = React.useRef<Promise<File> | null>(null);
  const resolvedStatus: TicketDisplayStatus | null = ticket
    ? ticket.status ?? (ticket.isValid ? "issued" : "checked_in")
    : null;
  const watchedTicketId = ticket?.id ?? null;
  const watchedEventTitle = ticket?.eventTitle ?? "";
  const watchedTicketIds = React.useMemo(
    () => (watchedTicketId && resolvedStatus === "issued" ? [watchedTicketId] : []),
    [resolvedStatus, watchedTicketId],
  );

  const handleCheckIn = React.useCallback((checkIn: TicketCheckIn) => {
    if (!watchedTicketId || !watchedEventTitle || checkIn.ticketId !== watchedTicketId) return;
    setCelebration(checkIn);
    router.refresh();
  }, [router, watchedEventTitle, watchedTicketId]);

  useTicketCheckIns({ ticketIds: watchedTicketIds, onCheckIn: handleCheckIn });

  React.useEffect(() => {
    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  React.useEffect(() => {
    if (!ticket?.isValid) {
      setOfflineState({ phase: "idle" });
      return;
    }

    let cancelled = false;
    getOfflineTicketState({
      ticketId: ticket.id,
      ownerId: ticket.offlineOwnerId,
    }).then((result) => {
      if (cancelled) return;
      if (result.ok && result.available) {
        setOfflineState({ phase: "saved", savedAt: result.savedAt });
      } else if (result.ok) {
        setOfflineState({ phase: "idle" });
      } else {
        setOfflineState({ phase: "error", message: result.error });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [ticket?.id, ticket?.isValid, ticket?.offlineOwnerId]);

  const buildShareFile = React.useCallback(async (): Promise<File> => {
    const svg = printRef.current?.querySelector("svg");
    if (!ticket || !svg) throw new Error("Ticket QR is not ready");
    const blob = await renderTicketImage({
      eventTitle: ticket.eventTitle,
      dateLabel: ticket.dateLabel,
      timeLabel: ticket.timeLabel,
      venueName: ticket.venueName,
      venueAddress: ticket.venueAddress,
      holderName: ticket.holderName,
      typeLabel: ticket.typeLabel,
      orderNumber: ticket.orderNumber,
      shortCode: shortTicketCode(ticket.qrCode),
      coverUrl: ticket.eventPhoto || null,
      qrSvg: new XMLSerializer().serializeToString(svg),
    });
    const slug = ticket.eventTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "event";
    return new File([blob], `${slug}-ticket-${ticket.orderNumber}.png`, { type: "image/png" });
  }, [ticket]);

  // Render the share image ahead of time: navigator.share needs the tap's
  // user activation, which a slow render on click could outlive (Safari).
  React.useEffect(() => {
    shareFile.current = null;
    if (!ticket?.isValid) return;
    const timer = window.setTimeout(() => {
      const pending = buildShareFile();
      pending.catch(() => {
        if (shareFile.current === pending) shareFile.current = null;
      });
      shareFile.current = pending;
    }, 400);
    return () => window.clearTimeout(timer);
  }, [buildShareFile, ticket?.isValid]);

  if (!ticket) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg p-6">
        <div className="text-center">
          <p className="text-[14px] text-ink-3">Ticket not found.</p>
          <Link href="/tickets" className="mt-3 inline-flex items-center gap-1 text-[13px] text-ink-3 underline-offset-4 hover:underline">
            <Icon name="chevL" size={14} /> My tickets
          </Link>
        </div>
      </div>
    );
  }

  // Control-flow narrowing from the guard above doesn't reach the nested
  // event-handler closures, so bind a non-optional alias for them to close over.
  const t: TicketData = ticket;
  const status: TicketDisplayStatus = resolvedStatus ?? "checked_in";
  const badge = STATUS_BADGE[status];
  const canTransferOrResell = status === "issued";

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
    const currentIndex = siblingIds.indexOf(t.id);
    if (currentIndex === -1) return;
    if (delta < 0 && currentIndex < siblingIds.length - 1) {
      window.location.assign(`/tickets/${siblingIds[currentIndex + 1]}`);
    } else if (delta > 0 && currentIndex > 0) {
      window.location.assign(`/tickets/${siblingIds[currentIndex - 1]}`);
    }
  }

  async function handleSend() {
    if (sending) return;
    setSending(true);
    setNotice(null);
    try {
      let file: File;
      try {
        file = await (shareFile.current ??= buildShareFile());
      } catch {
        shareFile.current = null;
        setNotice("Couldn't create the ticket image. Use Print in More instead.");
        return;
      }
      const shareData: ShareData = {
        files: [file],
        title: `Ticket · ${t.eventTitle}`,
        text: `My ticket for ${t.eventTitle} · ${t.dateLabel}`,
      };
      if (navigator.canShare?.(shareData)) {
        try {
          await navigator.share(shareData);
          return;
        } catch (error) {
          if ((error as DOMException)?.name === "AbortError") return;
          // Fall through to a download when the share sheet refuses.
        }
      }
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setNotice("Ticket image saved — attach it to WhatsApp or email.");
    } finally {
      setSending(false);
    }
  }

  function handlePrint() {
    setMoreOpen(false);
    // Let the sheet close before the print dialog snapshots the page.
    window.setTimeout(() => window.print(), 150);
  }

  async function handleOfflineSave() {
    if (offlineState.phase === "saving" || offlineState.phase === "removing") return;

    if (offlineState.phase === "saved") {
      setOfflineState((current) => ({ ...current, phase: "removing" }));
      const result = await removeOfflineTicket({
        ticketId: t.id,
        ownerId: t.offlineOwnerId,
        siblingIds,
      });
      setOfflineState(
        result.ok
          ? { phase: "idle" }
          : { phase: "error", message: result.error },
      );
      return;
    }

    setOfflineState({ phase: "saving" });
    const result = await saveTicketForOffline({
      ticketId: t.id,
      ownerId: t.offlineOwnerId,
      expiresAt: t.offlineExpiresAt,
      siblingIds,
    });
    setOfflineState(
      result.ok && result.available
        ? { phase: "saved", savedAt: result.savedAt }
        : { phase: "error", message: result.error },
    );
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
    setNotice(null);
    try {
      const platform = detectPlatform();
      const res = await fetch(
        `/api/tickets/${encodeURIComponent(t.id)}/wallet?platform=${platform}`,
      );
      const ct = res.headers.get("content-type") ?? "";

      if (res.ok && ct.includes("vnd.apple.pkpass")) {
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = `${t.eventTitle.replace(/\s+/g, "-")}.pkpass`;
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
      setNotice(
        body?.message ??
          "Wallet export isn't available right now. Opening Print instead.",
      );
      setTimeout(() => {
        setNotice(null);
        window.print();
      }, 1500);
    } catch {
      setNotice("Couldn't reach wallet service. Use Send or Print to keep a copy.");
      setTimeout(() => setNotice(null), 2500);
    } finally {
      setWalletBusy(false);
    }
  }
  const isSaved = offlineState.phase === "saved";
  const offlineBusy =
    offlineState.phase === "checking"
    || offlineState.phase === "saving"
    || offlineState.phase === "removing";
  const offlineLabel =
    offlineState.phase === "checking" ? "Checking offline copy…"
    : offlineState.phase === "saving" ? "Saving offline…"
    : offlineState.phase === "removing" ? "Removing…"
    : isSaved
      ? `Remove ${t.totalInOrder > 1 ? "these tickets" : "this ticket"} from this device`
      : t.totalInOrder > 1 ? `Save ${t.totalInOrder} tickets offline` : "Save offline";
  const when = [ticket.dateLabel.toUpperCase(), ticket.timeLabel].filter(Boolean).join(" · ");
  const refund = canTransferOrResell ? ticket.refundCta : null;

  return (
    <>
      {/* Print shows only the A5 ticket card. */}
      <style>{`@media print {
        @page { size: A5 portrait; margin: 0; }
        html, body { background: #fff !important; }
        body * { visibility: hidden !important; }
        #${TICKET_PRINT_ID}, #${TICKET_PRINT_ID} * { visibility: visible !important; }
        #${TICKET_PRINT_ID} { position: absolute; left: 0; top: 0; }
      }`}</style>
      <TicketPrintCard ref={printRef} ticket={ticket} />

      {celebration && (
        <CheckInCelebration
          eventTitle={t.eventTitle}
          checkedInAt={celebration.checkedInAt}
          onComplete={() => {
            setCelebration(null);
            router.replace(`/tickets?tab=past&checkedIn=${encodeURIComponent(t.id)}`);
          }}
        />
      )}

      <div
        className="relative isolate min-h-dvh overflow-hidden bg-ink text-white print:hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Blurred cover fills the screen behind everything. */}
        <img
          src={ticket.eventPhoto}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-20 h-full w-full scale-125 object-cover blur-[36px] saturate-150"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(10,10,12,0.35),rgba(10,10,12,0.55)_55%,rgba(10,10,12,0.88))]"
        />

        <div className="mx-auto flex min-h-dvh max-w-[440px] flex-col pb-[max(env(safe-area-inset-bottom),16px)] pt-[max(env(safe-area-inset-top),12px)]">
          {/* Top bar */}
          <header className="flex items-center gap-2.5 px-4 pb-2.5 pt-1">
            <Link
              href="/tickets"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"
              aria-label="Back to my tickets"
            >
              <Icon name="chevL" size={18} />
            </Link>
            <div className="flex flex-1 flex-col text-center leading-tight">
              <span className="text-[14px] font-semibold">Your ticket</span>
              <span className="font-mono text-[11px] opacity-75">
                {ticket.positionLabel} · #{ticket.orderNumber}
              </span>
            </div>
            {ticket.isValid ? (
              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25 disabled:opacity-60"
                aria-label="Send ticket"
              >
                <Icon name="share" size={18} />
              </button>
            ) : (
              <span className="h-9 w-9" aria-hidden />
            )}
          </header>

          {/* Sharp framed cover */}
          <div className="px-7 pt-1">
            <img
              src={ticket.eventPhoto}
              alt={`${ticket.eventTitle} cover`}
              className="h-[clamp(96px,calc(100dvh-470px),260px)] w-full rounded-[18px] object-cover shadow-[0_30px_50px_-12px_rgba(0,0,0,0.6)] ring-1 ring-white/15"
            />
          </div>

          {/* Title + when/where */}
          <div className="px-5 pb-3 pt-3.5 text-center">
            <h1 className="line-clamp-2 text-[28px] font-extrabold leading-[1.05] tracking-[-0.02em]">
              {ticket.eventTitle}
            </h1>
            <p className="mt-1.5 font-mono text-[12px] font-semibold opacity-90">
              {when}
              {" · "}
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-white/40 underline-offset-[3px] hover:decoration-white"
              >
                {ticket.venueName.toUpperCase()}
              </a>
            </p>
          </div>

          {/* White stub */}
          <div className="mx-4 rounded-[20px] bg-surface p-3.5 text-ink shadow-[0_20px_40px_-12px_rgba(0,0,0,0.5)]">
            {ticket.isValid ? (
              <div className="flex items-center gap-3.5">
                <TicketQrCode
                  value={ticket.qrCode}
                  label={`Ticket QR code for ${ticket.eventTitle}`}
                  size={136}
                  className="shrink-0 rounded-[10px] p-1.5"
                />
                <div className="flex min-w-0 flex-col gap-2">
                  <Chip variant={badge.chip.variant} size="sm" className={`self-start ${badge.chip.className ?? ""}`}>
                    {badge.headline}
                  </Chip>
                  {ticket.holderName && <StubField label="Holder" value={ticket.holderName} />}
                  <StubField label="Ticket" value={ticket.typeLabel} />
                  <span className="font-mono text-[11px] tracking-[0.04em] text-ink-3">
                    #{ticket.orderNumber} · {shortTicketCode(ticket.qrCode)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-2 text-center" role="status">
                <Chip variant={badge.chip.variant} size="sm" className={badge.chip.className}>
                  {badge.chip.label}
                </Chip>
                <p className="mx-auto mt-2 max-w-[280px] text-[15px] font-semibold">{badge.headline}</p>
                <p className="mx-auto mt-1 max-w-[280px] text-[12px] text-ink-3">{badge.copy}</p>
              </div>
            )}
          </div>

          {/* One status line: offline copy, wallet, send */}
          <div className="min-h-[18px] px-5 pt-2 text-center text-[11px] text-white/75" role="status">
            {notice
              ?? (offlineState.phase === "error" && offlineState.message
                ? <span className="text-[#ffb4a8]">{offlineState.message}</span>
                : isSaved
                  ? (
                    <span className="inline-flex items-center gap-1">
                      <Icon name="check" size={12} />
                      {online ? "Available offline" : "Showing saved offline copy"}
                      {offlineState.savedAt
                        ? ` · refreshed ${new Date(offlineState.savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                        : ""}
                    </span>
                  )
                  : null)}
          </div>

          {/* Actions — transfer and resell stay one tap away; the rest is in More. */}
          <div className={`grid gap-2 px-4 pt-2 ${canTransferOrResell ? "grid-cols-3" : "grid-cols-1"}`}>
            {canTransferOrResell && (
              <>
                <ActionButton href={`/tickets/${ticket.id}/transfer`} icon="arrowUR">
                  Transfer
                </ActionButton>
                <ActionButton href={`/tickets/${ticket.id}/resale`} icon="copy">
                  Resell
                </ActionButton>
              </>
            )}
            <ActionButton onClick={() => setMoreOpen(true)} icon="chevU" primary>
              More
            </ActionButton>
          </div>

          {/* Pagination dots */}
          {ticket.totalInOrder > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-4">
              {siblingIds.length > 1 ? (
                siblingIds.map((id, i) => (
                  <a
                    key={id}
                    href={`/tickets/${id}`}
                    aria-label={`Ticket ${i + 1} of ${siblingIds.length}`}
                    className={
                      id === ticket.id
                        ? "h-1.5 w-6 rounded-full bg-white transition-all"
                        : "h-1.5 w-1.5 rounded-full bg-white/35 transition-all hover:bg-white/60"
                    }
                  />
                ))
              ) : (
                <>
                  <span className="h-1.5 w-6 rounded-full bg-white" />
                  {Array.from({ length: ticket.totalInOrder - 1 }).map((_, i) => (
                    <span key={i} className="h-1.5 w-1.5 rounded-full bg-white/35" />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* More sheet */}
      <Modal open={moreOpen} onOpenChange={setMoreOpen}>
        <ModalContent title="Ticket options" size="sm">
          <div className="flex flex-col py-1">
            {ticket.isValid && (
              <>
                <SheetRow
                  icon="share"
                  onClick={() => {
                    setMoreOpen(false);
                    void handleSend();
                  }}
                  disabled={sending}
                  hint="As an image for WhatsApp or email"
                >
                  {sending ? "Preparing…" : "Send ticket"}
                </SheetRow>
                <SheetRow
                  icon="wallet"
                  onClick={() => {
                    setMoreOpen(false);
                    void handleWallet();
                  }}
                  disabled={walletBusy}
                  hint="Apple Wallet or Google Wallet"
                >
                  {walletBusy ? "Working…" : "Add to Wallet"}
                </SheetRow>
                <SheetRow
                  icon={isSaved ? "check" : "download"}
                  onClick={handleOfflineSave}
                  disabled={offlineBusy}
                  hint={isSaved ? "QR works with no signal at the gate" : "Keeps the QR working with no signal"}
                >
                  {offlineLabel}
                </SheetRow>
              </>
            )}
            <SheetRow icon="map" href={mapsUrl} external hint={[ticket.venueName, ticket.venueAddress].filter(Boolean).join(", ")}>
              Directions
            </SheetRow>
            <SheetRow icon="fileText" onClick={handlePrint} hint="A5 page with the QR">
              Print ticket
            </SheetRow>
          </div>

          {refund && (
            <div className="mx-5 mb-5 mt-1 rounded-[var(--radius-md)] bg-surface-2 px-4 py-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3">Refund policy</div>
              <p className="mt-1 text-[13px] text-ink">{refund.policyLabel}</p>
              {refund.available ? (
                <>
                  {refund.deadlineLabel && (
                    <p className="mt-0.5 text-[12px] text-ink-3">{refund.deadlineLabel}</p>
                  )}
                  <Link
                    href={`/orders/${refund.orderId}/refund`}
                    className="mt-2.5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent"
                  >
                    Request refund <Icon name="arrowR" size={13} />
                  </Link>
                </>
              ) : (
                <p className="mt-0.5 text-[12px] text-ink-3">
                  {refund.deadlineDate
                    ? `The refund window closed on ${refund.deadlineDate}.`
                    : "Refunds aren't available for this ticket."}
                </p>
              )}
            </div>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}

function StubField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="text-label">{label}</span>
      <span className="mt-0.5 block truncate text-[14px] font-semibold">{value}</span>
    </div>
  );
}

function ActionButton({
  icon,
  primary,
  href,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; primary?: boolean; href?: string }) {
  const className =
    "inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-lg)] text-[13px] font-semibold transition-colors disabled:opacity-60 "
    + (primary
      ? "bg-white text-ink hover:bg-white/90"
      : "border border-white/15 bg-white/10 text-white backdrop-blur hover:bg-white/20");
  const body = (
    <>
      <Icon name={icon} size={16} />
      {children}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" {...props} className={className}>
      {body}
    </button>
  );
}

function SheetRow({
  icon,
  hint,
  href,
  external,
  onClick,
  disabled,
  children,
}: {
  icon: IconName;
  hint?: string;
  href?: string;
  external?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const body = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-2">
        <Icon name={icon} size={16} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col text-left">
        <span className="text-[14px] font-semibold text-ink">{children}</span>
        {hint && <span className="truncate text-[12px] text-ink-3">{hint}</span>}
      </span>
      <Icon name="chevR" size={16} className="text-ink-4" />
    </>
  );
  const className =
    "flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-surface-2 disabled:opacity-60";
  if (href && external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {body}
      </a>
    );
  }
  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {body}
    </button>
  );
}
