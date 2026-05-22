"use client";

import * as React from "react";
import Link from "next/link";
import { Icon } from "@/components/quiet/ui/icon";
import { Card } from "@/components/quiet/ui/card";
import { Photo, Divider } from "@/components/quiet/ui/primitives";
import { PHOTOS } from "@/lib/photos";
import { formatPrice } from "@/lib/format";

/* ──────────────────────────────────────────────────────────────
 * `/orders/[orderId]/refund` — port of QuietRefund
 *
 * Per-ticket multi-select. The organizer policy is shown in
 * context so the refund amount is never a surprise: the design
 * shows the policy bands (48h+, 24-48h, <24h) and which one
 * applies based on `daysUntil`.
 *
 * Booking fee is non-refundable in this design — that's an
 * organizer-level setting in Supabase (`events.refund_fee_policy`).
 * ────────────────────────────────────────────────────────────── */

interface RefundProps {
  order?: RefundOrder;
  /** Days until event start. Drives which policy band is active. */
  daysUntil?: number;
}

interface RefundOrder {
  id: string;
  orderNumber: string;
  eventTitle: string;
  eventPhoto: string;
  whenLabel: string;
  totalMinor: number;
  bookingFeeMinor: number;
  paymentDescription: string;
  tickets: ReadonlyArray<RefundTicketRow>;
}

interface RefundTicketRow {
  ticketId: string;
  seatLabel: string;
  typeLabel: string;
  priceMinor: number;
}

const DEFAULT_ORDER: RefundOrder = {
  id: "ord_demo_001",
  orderNumber: "RG7352",
  eventTitle: "Tribal Tales",
  eventPhoto: PHOTOS.dj_set,
  whenLabel: "WED 30 AUG",
  totalMinor: 101800,
  bookingFeeMinor: 5000,
  paymentDescription: "Visa •••• 4242",
  tickets: [
    {
      ticketId: "tkt_demo_001",
      seatLabel: "C-4",
      typeLabel: "Regular",
      priceMinor: 50000,
    },
    {
      ticketId: "tkt_demo_002",
      seatLabel: "C-5",
      typeLabel: "Regular",
      priceMinor: 50000,
    },
  ],
};

const REASONS = [
  "Can't attend",
  "Plans changed",
  "Bought duplicate",
  "Event moved",
  "Other",
] as const;

export function Refund({
  order = DEFAULT_ORDER,
  daysUntil = 5,
}: RefundProps) {
  const [selected, setSelected] = React.useState<Set<string>>(
    new Set([order.tickets[0]?.ticketId].filter(Boolean) as string[])
  );
  const [reason, setReason] = React.useState<(typeof REASONS)[number]>(
    "Can't attend"
  );

  // Policy band
  const band: "full" | "half" | "none" =
    daysUntil >= 2 ? "full" : daysUntil >= 1 ? "half" : "none";
  const refundMultiplier = band === "full" ? 1 : band === "half" ? 0.5 : 0;

  // Sums
  const selectedTickets = order.tickets.filter((t) =>
    selected.has(t.ticketId)
  );
  const ticketRefundMinor = Math.round(
    selectedTickets.reduce((s, t) => s + t.priceMinor, 0) * refundMultiplier
  );
  const feeMinor = order.bookingFeeMinor;
  const payoutMinor = Math.max(0, ticketRefundMinor - feeMinor);

  const toggle = (id: string) => {
    setSelected((cur) => {
      const next = new Set(cur);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col bg-bg">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="h-14" />

        <header className="flex items-center gap-2.5 px-5 pb-3 pt-2">
          <Link
            href={`/orders/${order.id}/confirmation`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60"
            aria-label="Back"
          >
            <Icon name="chevL" size={22} />
          </Link>
          <div className="flex flex-1 flex-col leading-tight">
            <span className="text-label">Refund</span>
            <span className="text-[15px] font-semibold">Request a refund</span>
          </div>
        </header>

        {/* Order */}
        <div className="px-5 pb-4">
          <Card className="p-3">
            <div className="flex items-center gap-2.5">
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-[var(--radius)]">
                <Photo src={order.eventPhoto} height={44} />
              </div>
              <div className="flex flex-1 flex-col">
                <span className="text-[13px] font-semibold">
                  {order.eventTitle}
                </span>
                <span className="font-mono text-[11px] uppercase text-ink-3">
                  {order.whenLabel} · ORDER #{order.orderNumber}
                </span>
              </div>
              <span className="font-mono text-[12px] font-semibold">
                {formatPrice(order.totalMinor)}
              </span>
            </div>
          </Card>
        </div>

        {/* Which tickets */}
        <section className="px-5 pb-4">
          <div className="text-label mb-2">Which tickets?</div>
          <div className="flex flex-col gap-1.5">
            {order.tickets.map((t) => {
              const on = selected.has(t.ticketId);
              return (
                <label
                  key={t.ticketId}
                  className={
                    "flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-md)] border p-3 " +
                    (on
                      ? "border-accent bg-accent-soft"
                      : "border-line bg-surface")
                  }
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(t.ticketId)}
                    className="sr-only"
                  />
                  <span
                    className={
                      "inline-flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border-2 shrink-0 " +
                      (on
                        ? "border-accent bg-accent text-white"
                        : "border-line-2 bg-surface")
                    }
                  >
                    {on && <Icon name="check" size={11} strokeWidth={3} />}
                  </span>
                  <div className="flex flex-1 flex-col">
                    <span className="text-[14px] font-semibold">
                      Seat {t.seatLabel} · {t.typeLabel}
                    </span>
                    <span className="font-mono text-[11px] text-ink-3">
                      Issued · scannable
                    </span>
                  </div>
                  <span className="font-mono text-[13px] font-semibold">
                    {formatPrice(t.priceMinor)}
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        {/* Reason */}
        <section className="px-5 pb-4">
          <div className="text-label mb-2">Reason</div>
          <select
            value={reason}
            onChange={(e) =>
              setReason(e.target.value as (typeof REASONS)[number])
            }
            className="w-full rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2.5 text-[14px] font-medium outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
          >
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </section>

        {/* Notes */}
        <section className="px-5 pb-4">
          <div className="text-label mb-2">Notes (optional)</div>
          <textarea
            rows={3}
            placeholder="Tell the organizer what happened…"
            className="w-full resize-none rounded-[var(--radius-md)] border border-line bg-surface p-3 text-[14px] outline-none placeholder:text-ink-3 focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
          />
        </section>

        {/* Refund summary */}
        <section className="px-5 pb-4">
          <Card className="bg-bg p-3.5" flat>
            <Row
              label="Ticket refund"
              value={formatPrice(ticketRefundMinor)}
            />
            <Row
              label="Booking fee (non-refundable)"
              value={`−${formatPrice(feeMinor)}`}
              muted
            />
            <Divider className="my-2" />
            <div className="flex items-center">
              <span className="flex-1 text-[14px] font-semibold">
                You'll receive
              </span>
              <span className="font-mono text-[18px] font-semibold">
                {formatPrice(payoutMinor)}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-ink-3">
              <Icon name="check" size={12} />
              <span className="font-mono text-[10px]">
                back to {order.paymentDescription} · 3–5 business days
              </span>
            </div>
          </Card>
        </section>

        {/* Policy */}
        <section className="px-5 pb-4">
          <Card
            className="border-[color:var(--color-accent-soft)] bg-[#fbf7ff] p-3.5"
            flat
          >
            <div className="text-label mb-2 text-accent">Organizer's policy</div>
            <ul className="flex flex-col gap-1.5">
              {[
                { icon: "check", label: "48h+ before · full refund", active: band === "full" },
                { icon: "check", label: "24–48h before · 50% refund", active: band === "half" },
                { icon: "close", label: "< 24h · no refund", active: band === "none" },
              ].map((b) => (
                <li
                  key={b.label}
                  className="flex items-center gap-1.5 text-[12px]"
                >
                  <Icon
                    name={b.icon}
                    size={14}
                    className={b.active ? "text-accent" : "text-ink-3"}
                  />
                  <span
                    className={
                      b.active
                        ? "font-semibold text-ink"
                        : "text-ink-3"
                    }
                  >
                    {b.label}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 border-t border-line pt-2 font-mono text-[10px] uppercase text-ink-3">
              You're {daysUntil} days out ·{" "}
              {band === "full"
                ? "Full refund eligible"
                : band === "half"
                ? "Partial refund only"
                : "Not refundable"}
            </div>
          </Card>
        </section>

        <div className="h-24" />
      </div>

      <div className="sticky bottom-0 flex items-center gap-2 border-t border-line bg-surface px-5 py-3.5 pb-7">
        <Link
          href={`/orders/${order.id}/confirmation`}
          className="flex flex-1 items-center justify-center rounded-[var(--radius-md)] border border-line-2 bg-surface px-4 py-3.5 text-[14px] font-semibold hover:bg-bg"
        >
          Cancel
        </Link>
        <button
          disabled={selected.size === 0 || band === "none"}
          className="flex flex-[2] items-center justify-center gap-2 rounded-[var(--radius-md)] bg-accent px-4 py-3.5 text-[14px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {band === "none" ? "Not refundable" : "Request refund"}{" "}
          {band !== "none" && <Icon name="arrowR" size={16} />}
        </button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center py-0.5">
      <span className="flex-1 font-mono text-[12px] text-ink-3">{label}</span>
      <span
        className={
          "font-mono text-[12px] " + (muted ? "text-ink-3" : "text-ink")
        }
      >
        {value}
      </span>
    </div>
  );
}
