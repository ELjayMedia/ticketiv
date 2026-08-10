"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { acceptTransfer, cancelTransfer, declineTransfer } from "@/lib/data/attendee/transfers";
import { requestTransferByEmail } from "@/app/(consumer)/tickets/actions";
import { createClientSupabaseClient } from "@/lib/supabase-client";
import Link from "next/link";
import { Icon } from "@/components/quiet/ui/icon";
import { Chip } from "@/components/quiet/ui/chip";
import { Card } from "@/components/quiet/ui/card";
import { Modal, ModalContent, ModalClose, ModalFooter } from "@/components/quiet/ui/modal";
import {
  Photo,
  Divider,
  Avatar,
  Segmented,
  LiveDot,
} from "@/components/quiet/ui/primitives";
import { Button } from "@/components/quiet/ui/button";
import { CheckInCelebration } from "@/components/tickets/check-in-celebration";
import { useTicketCheckIns, type TicketCheckIn } from "@/lib/hooks/use-ticket-check-ins";
import { groupTicketsByOrder } from "@/lib/tickets/group-tickets-by-order";

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
  initialSegment?: Segment;
  highlightedTicketId?: string | null;
  inboundTransfer?: InboundTransfer | null;
  transferHistory?: TransferHistoryRow[];
  counts?: { upcoming: number; past: number; transfers: number };
}

type TransferStatus =
  | "requested"
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled"
  | "completed";

interface TransferHistoryRow {
  id: string;
  direction: "sent" | "received";
  status: TransferStatus;
  eventTitle: string;
  counterpartyName: string;
  counterpartyPhoto: string;
  dateLabel: string;
  canCancel: boolean;
}

interface FeaturedTicket {
  ticketId: string;
  orderId: string;
  orderStatus: string;
  orderNumber: string;
  eventTitle: string;
  eventPhoto: string;
  whenLabel: string;
  venueLabel: string;
  seatLabel: string;
  daysUntil: number;
  urgencyLabel: string;
  isEventDay: boolean;
  eventStartsAt: string | null;
  checkedInAt: string | null;
}

interface TicketListItem {
  ticketId: string;
  orderId: string;
  orderStatus: string;
  title: string;
  photo: string;
  whenLabel: string;
  venueLabel: string;
  eventStartsAt: string | null;
  checkedInAt: string | null;
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


export function MyTickets({
  featured,
  upcoming,
  past,
  initialSegment = "upcoming",
  highlightedTicketId = null,
  inboundTransfer,
  transferHistory,
  counts,
}: MyTicketsProps) {
  const router = useRouter();
  const [seg, setSeg] = React.useState<Segment>(initialSegment);
  const [transferLoading, setTransferLoading] = React.useState<"accept" | "decline" | null>(null);
  const [cancelling, setCancelling] = React.useState<string | null>(null);
  const [hiddenTransfers, setHiddenTransfers] = React.useState<Set<string>>(new Set());
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [ordersLiveConnected, setOrdersLiveConnected] = React.useState(false);
  const [stale, setStale] = React.useState(false);
  const [localTransferred, setLocalTransferred] = React.useState<Set<string>>(new Set());
  const [transferModal, setTransferModal] = React.useState<{ ticketId: string; title: string } | null>(null);
  const [recipientEmail, setRecipientEmail] = React.useState("");
  const [transferPending, setTransferPending] = React.useState(false);
  const [transferError, setTransferError] = React.useState<string | null>(null);
  const [celebration, setCelebration] = React.useState<(TicketCheckIn & { eventTitle: string }) | null>(null);
  const [recentlyCheckedInId, setRecentlyCheckedInId] = React.useState<string | null>(
    highlightedTicketId,
  );

  const _featured = featured;
  const _upcoming = upcoming ?? [];
  const _past = past ?? [];
  const _inbound = inboundTransfer ?? null;
  const _history = transferHistory ?? [];
  const _visibleHistory = _history.filter((t) => !hiddenTransfers.has(t.id));
  const _counts = counts ?? {
    upcoming: _upcoming.length,
    past: _past.length,
    transfers: _history.length,
  };
  const hasUpcoming = Boolean(_featured) || _upcoming.length > 0;
  const checkInTargets = React.useMemo(
    () => [
      ...(_featured && !_featured.checkedInAt
        ? [{ ticketId: _featured.ticketId, eventTitle: _featured.eventTitle }]
        : []),
      ..._upcoming
        .filter((ticket) => ticket.status === "issued" && !ticket.checkedInAt)
        .map((ticket) => ({ ticketId: ticket.ticketId, eventTitle: ticket.title })),
    ],
    [_featured, _upcoming],
  );

  const handleTicketCheckIn = React.useCallback((checkIn: TicketCheckIn) => {
    const target = checkInTargets.find((ticket) => ticket.ticketId === checkIn.ticketId);
    setRecentlyCheckedInId(checkIn.ticketId);
    setCelebration({
      ...checkIn,
      eventTitle: target?.eventTitle ?? "Your ticket",
    });
    router.refresh();
  }, [checkInTargets, router]);

  const { status: checkInStatus } = useTicketCheckIns({
    ticketIds: checkInTargets.map((ticket) => ticket.ticketId),
    onCheckIn: handleTicketCheckIn,
  });
  const liveConnected = ordersLiveConnected || checkInStatus === "subscribed";

  React.useEffect(() => {
    setSeg(initialSegment);
  }, [initialSegment]);

  React.useEffect(() => {
    if (!highlightedTicketId) return;
    setRecentlyCheckedInId(highlightedTicketId);
  }, [highlightedTicketId]);

  React.useEffect(() => {
    if (!recentlyCheckedInId || celebration) return;
    const timer = window.setTimeout(() => setRecentlyCheckedInId(null), 6_000);
    return () => window.clearTimeout(timer);
  }, [celebration, recentlyCheckedInId]);

  // TICK-239: keep non-check-in order changes live. Check-ins use the shared
  // watcher above so the list and QR detail page behave consistently.
  React.useEffect(() => {
    const supabase = createClientSupabaseClient();
    if (!supabase) return;

    let channels: ReturnType<typeof supabase.channel>[] = [];
    let staleTimer: ReturnType<typeof setTimeout>;

    async function subscribe() {
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) return;

      const handleChange = () => {
        router.refresh();
        setStale(false);
        clearTimeout(staleTimer);
        staleTimer = setTimeout(() => setStale(true), 30000);
      };

      const ch1 = supabase!
        .channel(`my-orders-rt-${user.id}`)
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `buyer_id=eq.${user.id}`,
        }, handleChange)
        .subscribe((status: string) => setOrdersLiveConnected(status === "SUBSCRIBED"));

      channels = [ch1];
      staleTimer = setTimeout(() => setStale(true), 30000);
    }

    function teardown() {
      const client = createClientSupabaseClient();
      channels.forEach((ch) => client?.removeChannel(ch));
      channels = [];
      setOrdersLiveConnected(false);
      clearTimeout(staleTimer);
    }

    const handleVisibility = () => {
      if (document.hidden) {
        teardown();
      } else {
        subscribe();
      }
    };

    subscribe();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      teardown();
    };
  }, [router]);

  const filteredUpcoming = (searchQuery.trim()
    ? _upcoming.filter((t) => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : _upcoming
  ).map((t) =>
    localTransferred.has(t.ticketId) ? { ...t, status: "transferred" as const } : t,
  );

  // The featured ticket represents its whole order. Remove its siblings from
  // the remaining list so one purchase produces one card, while every
  // order_item remains individually addressable and scannable.
  const featuredOrderTickets = _featured
    ? filteredUpcoming.filter((ticket) => ticket.orderId === _featured.orderId)
    : [];
  const featuredTicketCount = _featured ? 1 + featuredOrderTickets.length : 0;
  const groupedUpcoming = groupTicketsByOrder(
    filteredUpcoming.filter((ticket) => ticket.orderId !== _featured?.orderId),
  );
  const groupedPast = groupTicketsByOrder(_past);

  async function handleTransferSubmit() {
    if (!transferModal || !recipientEmail.trim() || transferPending) return;
    setTransferPending(true);
    setTransferError(null);
    const result = await requestTransferByEmail(transferModal.ticketId, recipientEmail);
    setTransferPending(false);
    if (!result.ok) {
      setTransferError(result.error ?? "Transfer failed. Please try again.");
      return;
    }
    setLocalTransferred((prev) => new Set([...prev, transferModal.ticketId]));
    setTransferModal(null);
    setRecipientEmail("");
  }

  function handleModalOpenChange(open: boolean) {
    if (!open) {
      setTransferModal(null);
      setRecipientEmail("");
      setTransferError(null);
    }
  }

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
    <>
      {celebration && (
        <CheckInCelebration
          eventTitle={celebration.eventTitle}
          checkedInAt={celebration.checkedInAt}
          onComplete={() => {
            const ticketId = celebration.ticketId;
            setCelebration(null);
            setSeg("past");
            router.replace(`/tickets?tab=past&checkedIn=${encodeURIComponent(ticketId)}`);
          }}
        />
      )}
      <div className="bg-bg pb-24">
      <div className="h-14" />

      {/* Header */}
      <header className="flex items-end gap-2.5 px-5 pb-3 pt-2">
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="text-label">My tickets</span>
            {liveConnected && <LiveDot />}
          </div>
          <span className="text-h1 mt-0.5">
            {seg === "upcoming" && `Upcoming · ${_counts.upcoming}`}
            {seg === "past" && `Past · ${_counts.past}`}
            {seg === "transfers" && `Transfers · ${_counts.transfers}`}
          </span>
          {stale && (
            <button
              onClick={() => router.refresh()}
              className="self-start text-[11px] font-mono uppercase tracking-wider text-accent underline underline-offset-2"
            >
              Refresh
            </button>
          )}
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
          onClick={() => window.print()}
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
                      {_featured.venueLabel} ·{" "}
                      {featuredTicketCount > 1
                        ? `${featuredTicketCount} tickets`
                        : _featured.seatLabel}
                    </span>
                    <div className="mt-1.5">
                      <CheckInBadge checkedInAt={_featured.checkedInAt} />
                    </div>
                  </div>
                </div>
                <Divider className="my-3" />
                <div className="flex gap-1.5">
                  <Link
                    href={`/tickets/${_featured.ticketId}`}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius)] bg-ink px-3 py-2 text-[12px] font-medium text-white hover:bg-ink-2"
                  >
                    <Icon name="qr" size={14} />
                    {featuredTicketCount > 1
                      ? `Open ${featuredTicketCount} tickets`
                      : "Show QR"}
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
                {_featured.isEventDay && (
                  <div className="mt-3 flex items-start gap-2 rounded-[var(--radius)] bg-accent-soft px-3 py-2.5 text-accent">
                    <Icon name="qr" size={15} className="mt-0.5 shrink-0" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[12px] font-semibold">Ready for the gate</span>
                      <span className="font-mono text-[10px] leading-relaxed">
                        Open your QR before joining the queue and keep your screen brightness up.
                      </span>
                    </div>
                  </div>
                )}
                {featuredTicketCount > 1 && (
                  <div className="mt-3 flex items-start gap-2 rounded-[var(--radius)] border border-line-2 px-3 py-2.5">
                    <Icon name="copy" size={15} className="mt-0.5 shrink-0 text-ink-3" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[12px] font-semibold">
                        {featuredTicketCount} separate tickets
                      </span>
                      <span className="font-mono text-[10px] leading-relaxed text-ink-3">
                        Open the first QR, then swipe between every ticket in this order.
                      </span>
                    </div>
                  </div>
                )}
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
                <RefundCta
                  orderId={_featured.orderId}
                  orderStatus={_featured.orderStatus}
                  eventStartsAt={_featured.eventStartsAt}
                  ticketStatus={/* featured is always issued */ "issued"}
                />
              </div>
            </Card>
          </section>
          )}

          {/* Other upcoming — one card per order, one QR per ticket. */}
          <ul className="flex flex-col gap-2 px-5">
            {groupedUpcoming.map((group) => (
              <TicketOrderGroupCard
                key={group.orderId}
                tickets={group.tickets}
                onTransfer={(ticket) =>
                  setTransferModal({ ticketId: ticket.ticketId, title: ticket.title })
                }
              />
            ))}
          </ul>

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
        groupedPast.length === 0 ? (
          <EmptyState
            icon="ticket"
            title="No past tickets"
            subtitle="Events you've attended will show up here once they're done."
          />
        ) : (
          <ul className="flex flex-col gap-2 px-5">
            {groupedPast.map((group) => (
              <TicketOrderGroupCard
                key={group.orderId}
                tickets={group.tickets}
                mode="past"
                recentlyCheckedInId={recentlyCheckedInId}
              />
            ))}
          </ul>
        )
      )}

      {seg === "transfers" && (
        _inbound || _visibleHistory.length > 0 ? (
          <div className="px-5 pt-1">
            {_inbound && (
              <section className="pb-4">
                <div className="text-label mb-2">Action needed</div>
                <Card className="border-[#fde2c1] bg-[#fdf6ed] p-3.5" flat>
                  <div className="flex items-center gap-3">
                    <Avatar src={_inbound.fromPhoto} size={36} />
                    <div className="flex flex-1 flex-col">
                      <span className="text-[13px] font-semibold">
                        {_inbound.fromName} sent you a ticket
                      </span>
                      <span className="font-mono text-[11px] text-ink-3">
                        {_inbound.eventTitle} · {_inbound.expiresInLabel}
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
                      {transferLoading === "accept" ? "Accepting…" : "Accept"}
                    </Button>
                  </div>
                </Card>
              </section>
            )}

            {_visibleHistory.length === 0 ? null : (
              <section className="pb-4">
                <div className="text-label mb-2">History</div>
                <ul className="flex flex-col gap-2">
                  {_visibleHistory.map((t) => (
                    <li key={t.id}>
                      <Card className="flex items-center gap-3 p-3" flat>
                        <Avatar src={t.counterpartyPhoto} size={36} />
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-[13px] font-semibold">
                            {t.direction === "sent" ? "↗ Sent to " : "↙ Received from "}
                            {t.counterpartyName}
                          </span>
                          <span className="truncate font-mono text-[11px] text-ink-3">
                            {t.eventTitle} · {t.dateLabel}
                          </span>
                          <div className="mt-1">
                            <TransferStatusChip status={t.status} />
                          </div>
                        </div>
                        {t.canCancel && (
                          <Button
                            variant="default"
                            size="xs"
                            disabled={cancelling === t.id}
                            onClick={async () => {
                              setCancelling(t.id);
                              const ok = await cancelTransfer(t.id).catch(() => null);
                              setCancelling(null);
                              if (ok) {
                                setHiddenTransfers((prev) => new Set([...prev, t.id]));
                              }
                            }}
                          >
                            {cancelling === t.id ? "…" : "Cancel"}
                          </Button>
                        )}
                      </Card>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        ) : (
          <EmptyState
            icon="arrowUR"
            title="No transfers yet"
            subtitle="Tickets you send or receive will appear here."
          />
        )
      )}

      {/* Inline transfer modal */}
      <Modal open={Boolean(transferModal)} onOpenChange={handleModalOpenChange}>
        <ModalContent title="Transfer ticket" description="Send this ticket to someone with a Ticketiv account" size="sm">
          <div className="flex flex-col gap-4">
            {transferModal && (
              <p className="font-mono text-[11px] uppercase text-ink-3">
                {transferModal.title}
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="transfer-email" className="text-label">
                Recipient email
              </label>
              <input
                id="transfer-email"
                type="email"
                autoComplete="email"
                autoFocus
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTransferSubmit()}
                placeholder="friend@example.com"
                className="w-full rounded-[var(--radius)] border border-line bg-bg px-3 py-2.5 text-[14px] outline-none placeholder:text-ink-3 focus:border-accent focus:ring-[3px] focus:ring-accent/10"
              />
            </div>
            {transferError && (
              <p className="rounded-[var(--radius)] bg-danger-soft px-3 py-2 text-[12px] text-danger">
                {transferError}
              </p>
            )}
            <p className="font-mono text-[11px] leading-relaxed text-ink-3">
              The recipient will get 24 hours to accept. Your QR is revoked when they accept.
            </p>
          </div>
          <ModalFooter>
            <ModalClose asChild>
              <Button variant="default" size="sm">Cancel</Button>
            </ModalClose>
            <Button
              variant="accent"
              size="sm"
              disabled={!recipientEmail.trim() || transferPending}
              onClick={handleTransferSubmit}
            >
              {transferPending ? "Sending…" : "Send transfer"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      </div>
    </>
  );
}

function TicketOrderGroupCard({
  tickets,
  mode = "upcoming",
  onTransfer,
  recentlyCheckedInId,
}: {
  tickets: TicketListItem[];
  mode?: "upcoming" | "past";
  onTransfer?: (ticket: TicketListItem) => void;
  recentlyCheckedInId?: string | null;
}) {
  const lead = tickets[0];
  if (!lead) return null;

  const multiple = tickets.length > 1;

  return (
    <li>
      <Card className="overflow-hidden p-0" flat>
        <div className="flex items-center gap-3 p-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[var(--radius)]">
            <Photo src={lead.photo} height={48} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[14px] font-semibold">{lead.title}</span>
            <span className="truncate font-mono text-[11px] text-ink-3">
              {lead.whenLabel} · {lead.venueLabel}
            </span>
          </div>
          <Chip variant={multiple ? "accent" : "default"} size="sm">
            {tickets.length} ticket{multiple ? "s" : ""}
          </Chip>
        </div>

        <Divider />

        <div className="divide-y divide-line">
          {tickets.map((ticket, index) => {
            const canAct = mode === "upcoming" && ticket.status === "issued";
            const highlighted = recentlyCheckedInId === ticket.ticketId;

            return (
              <div
                key={ticket.ticketId}
                className={
                  "flex items-center gap-2.5 px-3 py-2.5 transition-colors " +
                  (highlighted
                    ? "bg-accent-soft ring-2 ring-inset ring-accent/25"
                    : "hover:bg-bg")
                }
              >
                <Link
                  href={`/tickets/${ticket.ticketId}`}
                  className="flex min-w-0 flex-1 flex-col"
                >
                  <span className="text-[12px] font-semibold">
                    {multiple ? `Ticket ${index + 1} of ${tickets.length}` : "Your ticket"}
                  </span>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <StatusChip status={ticket.status} count={1} />
                    <CheckInBadge checkedInAt={ticket.checkedInAt} />
                  </div>
                  {mode === "upcoming" && (
                    <RefundCta
                      orderId={ticket.orderId}
                      orderStatus={ticket.orderStatus}
                      eventStartsAt={ticket.eventStartsAt}
                      ticketStatus={ticket.status}
                    />
                  )}
                </Link>

                {canAct ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <Link
                      href={`/tickets/${ticket.ticketId}`}
                      aria-label={`Show QR for ${lead.title}, ticket ${index + 1}`}
                      className="inline-flex h-8 items-center justify-center gap-1 rounded-[var(--radius)] bg-ink px-2.5 text-[11px] font-semibold text-white hover:bg-ink-2"
                    >
                      <Icon name="qr" size={13} />
                      QR
                    </Link>
                    <button
                      type="button"
                      aria-label={`Transfer ${lead.title}, ticket ${index + 1}`}
                      onClick={() => onTransfer?.(ticket)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius)] border border-line-2 hover:bg-bg"
                    >
                      <Icon name="arrowUR" size={14} />
                    </button>
                    <Link
                      href={`/resale?ticketId=${encodeURIComponent(ticket.ticketId)}`}
                      aria-label={`List ${lead.title}, ticket ${index + 1} for resale`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius)] border border-line-2 hover:bg-bg"
                    >
                      <Icon name="ticket" size={14} />
                    </Link>
                  </div>
                ) : (
                  <Icon name="chevR" size={16} className="shrink-0 text-ink-3" aria-hidden />
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </li>
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

const TRANSFER_STATUS: Record<
  TransferStatus,
  { label: string; className: string }
> = {
  requested: { label: "Pending", className: "border-transparent bg-[#fdf6ed] text-[#a36a18]" },
  pending: { label: "Pending", className: "border-transparent bg-[#fdf6ed] text-[#a36a18]" },
  accepted: { label: "Accepted", className: "border-transparent bg-accent-soft text-accent" },
  completed: { label: "Completed", className: "border-transparent bg-accent-soft text-accent" },
  declined: { label: "Declined", className: "border-transparent bg-line/40 text-ink-3" },
  cancelled: { label: "Cancelled", className: "border-transparent bg-line/40 text-ink-3" },
};

function TransferStatusChip({ status }: { status: TransferStatus }) {
  const cfg = TRANSFER_STATUS[status];
  return (
    <Chip size="sm" className={cfg.className}>
      {cfg.label}
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

/* ── Check-in badge ───────────────────────────────────────────── */
function CheckInBadge({ checkedInAt }: { checkedInAt: string | null }) {
  if (checkedInAt) {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-accent-soft px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-accent">
        <Icon name="check" size={10} />
        Checked in
      </span>
    );
  }
  return (
    <span className="font-mono text-[10px] uppercase text-ink-3">
      Not checked in
    </span>
  );
}

/* ── Refund CTA ───────────────────────────────────────────────── */
function RefundCta({
  orderId,
  orderStatus,
  eventStartsAt,
  ticketStatus,
}: {
  orderId: string;
  orderStatus: string;
  eventStartsAt: string | null;
  ticketStatus: TicketDisplayStatus;
}) {
  // Only show on paid orders with a future event and an issued (unused) ticket.
  if (orderStatus !== "paid") {
    if (orderStatus === "refunded") {
      return (
        <span className="mt-1 block text-[12px] text-ink-3">Refunded</span>
      );
    }
    return null;
  }
  if (ticketStatus !== "issued") return null;
  const isFuture = eventStartsAt ? new Date(eventStartsAt).getTime() > Date.now() : false;
  if (!isFuture) return null;

  const shortId = orderId.slice(0, 6).toUpperCase();
  return (
    <button
      type="button"
      className="mt-1.5 inline-flex items-center gap-1 rounded-[var(--radius)] border border-line-2 px-2 py-0.5 text-[11px] font-medium text-ink-2 transition-colors hover:bg-bg"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        window.open(
          `mailto:support@ticketiv.app?subject=${encodeURIComponent("Refund Request — Order " + shortId)}`,
        );
      }}
    >
      Request refund
    </button>
  );
}
