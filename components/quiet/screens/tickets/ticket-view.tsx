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
 * Print renders `TicketPrintCard` (a landscape ticket strip) instead,
 * and "Send ticket" shares a portrait ticket card PNG for WhatsApp / email.
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
  /** A single ticket (shared ticket links, previews). */
  ticket?: TicketData;
  /**
   * Every ticket in the order, in order. With more than one they stack
   * vertically, one full screen each: swipe up for the next ticket.
   */
  tickets?: TicketData[];
  /** Which ticket of `tickets` opens first. */
  initialTicketId?: string;
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
      className: "border-transparent bg-danger-soft text-danger",
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

function displayStatus(item: TicketData): TicketDisplayStatus {
  return item.status ?? (item.isValid ? "issued" : "checked_in");
}

type OfflineUiState = {
  phase: "checking" | "idle" | "saving" | "saved" | "removing" | "error";
  savedAt?: string;
  message?: string;
};

export function TicketView({ ticket: singleTicket, tickets, initialTicketId }: TicketViewProps) {
  const router = useRouter();
  const list = React.useMemo(
    () => (tickets?.length ? tickets : singleTicket ? [singleTicket] : []),
    [tickets, singleTicket],
  );
  const stacked = list.length > 1;
  const [activeIndex, setActiveIndex] = React.useState(() =>
    Math.max(0, list.findIndex((item) => item.id === initialTicketId)),
  );
  // Sheet, print, send, wallet and offline actions act on the ticket in view.
  const ticket: TicketData | undefined = list[activeIndex] ?? list[0];
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const sectionRefs = React.useRef<Array<HTMLElement | null>>([]);
  const [walletBusy, setWalletBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [celebration, setCelebration] = React.useState<TicketCheckIn | null>(null);
  const [online, setOnline] = React.useState(true);
  const [offlineState, setOfflineState] = React.useState<OfflineUiState>({ phase: "checking" });
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const printRef = React.useRef<HTMLDivElement>(null);
  const shareFile = React.useRef<Promise<File> | null>(null);
  const resolvedStatus: TicketDisplayStatus | null = ticket ? displayStatus(ticket) : null;
  // Watch every valid ticket in the stack: any of them can be scanned.
  const watchedTicketIds = React.useMemo(
    () => list.filter((item) => displayStatus(item) === "issued").map((item) => item.id),
    [list],
  );

  const handleCheckIn = React.useCallback((checkIn: TicketCheckIn) => {
    if (!watchedTicketIds.includes(checkIn.ticketId)) return;
    setCelebration(checkIn);
    router.refresh();
  }, [router, watchedTicketIds]);

  // Stack: open on the requested ticket, then follow the one in view.
  React.useLayoutEffect(() => {
    if (!stacked) return;
    sectionRefs.current[activeIndex]?.scrollIntoView({ block: "start" });
    // Only on mount: later changes come from scrolling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stacked]);

  React.useEffect(() => {
    const root = scrollerRef.current;
    if (!stacked || !root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = sectionRefs.current.indexOf(entry.target as HTMLElement);
          if (index < 0) continue;
          setActiveIndex(index);
          // Keep the URL on the ticket in view (share, reload, back) without a navigation.
          window.history.replaceState(window.history.state, "", `/tickets/${list[index].id}`);
        }
      },
      { root, threshold: 0.6 },
    );
    for (const section of sectionRefs.current) if (section) observer.observe(section);
    return () => observer.disconnect();
  }, [stacked, list]);

  function scrollToTicket(index: number) {
    sectionRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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
        siblingIds: list.map((item) => item.id),
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
      siblingIds: list.map((item) => item.id),
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

  function renderPanel(item: TicketData, index: number) {
    const isActive = index === activeIndex;
    const itemBadge = STATUS_BADGE[displayStatus(item)];
    const itemCanAct = displayStatus(item) === "issued";
    const itemWhen = [item.dateLabel.toUpperCase(), item.timeLabel].filter(Boolean).join(" · ");
    const itemMapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(`${item.venueName} ${item.venueAddress}`)}`;
    const next = stacked && index < list.length - 1 ? index + 1 : null;

    return (
        <div className={`mx-auto flex max-w-[440px] flex-col pb-[max(env(safe-area-inset-bottom),16px)] pt-[max(env(safe-area-inset-top),12px)] ${stacked ? "h-dvh" : "min-h-dvh"}`}>
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
                {item.positionLabel} · #{item.orderNumber}
              </span>
            </div>
            {item.isValid ? (
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
              src={item.eventPhoto}
              alt={`${item.eventTitle} cover`}
              className="h-[clamp(96px,calc(100dvh-470px),260px)] w-full rounded-[18px] object-cover shadow-[0_30px_50px_-12px_rgba(0,0,0,0.6)] ring-1 ring-white/15"
            />
          </div>

          {/* Title + when/where */}
          <div className="px-5 pb-3 pt-3.5 text-center">
            <h1 className="line-clamp-2 text-[28px] font-extrabold leading-[1.05] tracking-[-0.02em]">
              {item.eventTitle}
            </h1>
            <p className="mt-1.5 font-mono text-[12px] font-semibold opacity-90">
              {itemWhen}
              {" · "}
              <a
                href={itemMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-white/40 underline-offset-[3px] hover:decoration-white"
              >
                {item.venueName.toUpperCase()}
              </a>
            </p>
          </div>

          {/* White stub */}
          <div className="mx-4 rounded-[20px] bg-surface p-3.5 text-ink shadow-[0_20px_40px_-12px_rgba(0,0,0,0.5)]">
            {item.isValid ? (
              <div className="flex items-center gap-3.5">
                <TicketQrCode
                  value={item.qrCode}
                  label={`Ticket QR code for ${item.eventTitle}`}
                  size={136}
                  className="shrink-0 rounded-[10px] p-1.5"
                />
                <div className="flex min-w-0 flex-col gap-2">
                  <Chip variant={itemBadge.chip.variant} size="sm" className={`self-start ${itemBadge.chip.className ?? ""}`}>
                    {itemBadge.headline}
                  </Chip>
                  {item.holderName && <StubField label="Holder" value={item.holderName} />}
                  <StubField label="Ticket" value={item.typeLabel} />
                  <span className="font-mono text-[11px] tracking-[0.04em] text-ink-3">
                    #{item.orderNumber} · {shortTicketCode(item.qrCode)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-2 text-center" role="status">
                <Chip variant={itemBadge.chip.variant} size="sm" className={itemBadge.chip.className}>
                  {itemBadge.chip.label}
                </Chip>
                <p className="mx-auto mt-2 max-w-[280px] text-[15px] font-semibold">{itemBadge.headline}</p>
                <p className="mx-auto mt-1 max-w-[280px] text-[12px] text-ink-3">{itemBadge.copy}</p>
              </div>
            )}
          </div>

          {/* One status line: offline copy, wallet, send (the ticket in view) */}
          <div className="min-h-[18px] px-5 pt-2 text-center text-[11px] text-white/75" role="status">
            {!isActive ? null : notice
              ?? (offlineState.phase === "error" && offlineState.message
                ? <span className="text-danger-soft">{offlineState.message}</span>
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
          <div className={`grid gap-2 px-4 pt-2 ${itemCanAct ? "grid-cols-3" : "grid-cols-1"}`}>
            {itemCanAct && (
              <>
                <ActionButton href={`/tickets/${item.id}/transfer`} icon="arrowUR">
                  Transfer
                </ActionButton>
                <ActionButton href={`/tickets/${item.id}/resale`} icon="copy">
                  Resell
                </ActionButton>
              </>
            )}
            <ActionButton onClick={() => setMoreOpen(true)} icon="chevU" primary>
              More
            </ActionButton>
          </div>

          {/* Next ticket: swipe up, or tap */}
          {next !== null ? (
            <button
              type="button"
              onClick={() => scrollToTicket(next)}
              className="mx-auto mt-auto flex flex-col items-center gap-0.5 pt-3 text-[11px] font-medium text-white/70 hover:text-white"
            >
              <Icon name="chevU" size={16} className="animate-bounce" />
              Swipe up · ticket {next + 1} of {list.length}
            </button>
          ) : stacked ? (
            <button
              type="button"
              onClick={() => scrollToTicket(0)}
              className="mx-auto mt-auto pt-3 text-[11px] font-medium text-white/60 hover:text-white"
            >
              Last ticket · back to the first
            </button>
          ) : null}
        </div>
    );
  }

  return (
    <>
      {/* Print shows only the ticket strip. */}
      <style>{`@media print {
        @page { size: A4 portrait; margin: 10mm; }
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
            router.replace(`/tickets?tab=past&checkedIn=${encodeURIComponent(celebration.ticketId)}`);
          }}
        />
      )}

      <div className="relative isolate min-h-dvh overflow-hidden bg-ink text-white print:hidden">
        {/* Blurred cover fills the screen behind everything (one event per order). */}
        <img
          src={ticket.eventPhoto}
          alt=""
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-20 h-full w-full scale-125 object-cover blur-[36px] saturate-150"
        />
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(180deg,rgba(10,10,12,0.35),rgba(10,10,12,0.55)_55%,rgba(10,10,12,0.88))]"
        />

        {stacked ? (
          <>
            {/* One ticket per screen; swipe up for the next (scroll snaps). */}
            <div
              ref={scrollerRef}
              className="h-dvh snap-y snap-mandatory overflow-y-auto overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              aria-label={`${list.length} tickets in this order`}
            >
              {list.map((item, index) => (
                <section
                  key={item.id}
                  ref={(el) => {
                    sectionRefs.current[index] = el;
                  }}
                  className="h-dvh snap-start snap-always"
                  aria-label={`Ticket ${index + 1} of ${list.length}`}
                >
                  {renderPanel(item, index)}
                </section>
              ))}
            </div>

            {/* Position rail */}
            <nav
              aria-label="Tickets in this order"
              className="fixed right-1.5 top-[28%] z-10 flex -translate-y-1/2 flex-col items-center gap-1.5 rounded-full bg-black/25 px-1 py-2 backdrop-blur"
            >
              {list.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToTicket(index)}
                  aria-label={`Ticket ${index + 1} of ${list.length}`}
                  aria-current={index === activeIndex ? "true" : undefined}
                  className={
                    index === activeIndex
                      ? "h-6 w-1.5 rounded-full bg-white transition-all"
                      : "h-1.5 w-1.5 rounded-full bg-white/40 transition-all hover:bg-white/70"
                  }
                />
              ))}
            </nav>
          </>
        ) : (
          renderPanel(ticket, 0)
        )}
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
            <SheetRow icon="fileText" onClick={handlePrint} hint="Cut-out ticket strip with the QR">
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
