"use client";

import * as React from "react";
import Link from "next/link";
import { requestBuyerRefundAction } from "@/app/(focused)/orders/[orderId]/refund/actions";
import { Icon } from "@/components/quiet/ui/icon";
import { Card } from "@/components/quiet/ui/card";
import { Photo, Divider } from "@/components/quiet/ui/primitives";
import { formatPrice } from "@/lib/format";

interface RefundProps {
  order?: RefundOrder;
  hoursUntil?: number;
  refundBps?: number;
  policy?: {
    label: string;
    bands: ReadonlyArray<{ hoursBefore: number; refundBps: number }>;
  };
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

const REASONS = [
  "Can't attend",
  "Plans changed",
  "Bought duplicate",
  "Event moved",
  "Other",
] as const;

function formatWindow(hours: number) {
  if (hours >= 24 && hours % 24 === 0) {
    const days = hours / 24;
    return `${days} day${days === 1 ? "" : "s"} before`;
  }
  return `${hours} hour${hours === 1 ? "" : "s"} before`;
}

function formatPercent(bps: number) {
  const percent = bps / 100;
  return Number.isInteger(percent) ? `${percent}%` : `${percent.toFixed(2)}%`;
}

export function Refund({
  order,
  hoursUntil = 0,
  refundBps = 0,
  policy = { label: "Refund policy", bands: [] },
}: RefundProps) {
  const firstTicketId = order?.tickets[0]?.ticketId;
  const [selected, setSelected] = React.useState<Set<string>>(
    new Set(firstTicketId ? [firstTicketId] : [])
  );
  const [reason, setReason] = React.useState<(typeof REASONS)[number]>(
    "Can't attend"
  );
  const [notes, setNotes] = React.useState("");
  const [error, setError] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  if (!order) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg p-6">
        <div className="text-center">
          <p className="text-[14px] text-ink-3">Order not found.</p>
          <Link href="/tickets" className="mt-3 inline-flex items-center gap-1 text-[13px] text-ink-3 underline-offset-4 hover:underline">
            <Icon name="chevL" size={14} /> My tickets
          </Link>
        </div>
      </div>
    );
  }

  const activeBand = policy.bands.find((band) => hoursUntil >= band.hoursBefore) ?? null;
  const refundMultiplier = refundBps / 10000;
  const selectedTickets = order.tickets.filter((t) => selected.has(t.ticketId));
  const ticketRefundMinor = selectedTickets.reduce(
    (sum, ticket) => sum + Math.max(0, Math.round(ticket.priceMinor * refundMultiplier)),
    0,
  );
  const refundable = refundBps > 0 && ticketRefundMinor > 0;

  const toggle = (id: string) => {
    if (submitted || isPending) return;
    setSelected((cur) => {
      const next = new Set(cur);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const submitRefund = () => {
    setError("");
    startTransition(async () => {
      try {
        await requestBuyerRefundAction({
          orderId: order.id,
          ticketIds: [...selected],
          reason,
          notes,
        });
        setSubmitted(true);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to request refund");
      }
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

        <div className="px-5 pb-4">
          <Card className="p-3">
            <div className="flex items-center gap-2.5">
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-[var(--radius)]">
                <Photo src={order.eventPhoto} height={44} />
              </div>
              <div className="flex flex-1 flex-col">
                <span className="text-[13px] font-semibold">{order.eventTitle}</span>
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
                    (on ? "border-accent bg-accent-soft" : "border-line bg-surface")
                  }
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(t.ticketId)}
                    disabled={submitted || isPending}
                    className="sr-only"
                  />
                  <span
                    className={
                      "inline-flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border-2 shrink-0 " +
                      (on ? "border-accent bg-accent text-white" : "border-line-2 bg-surface")
                    }
                  >
                    {on && <Icon name="check" size={11} strokeWidth={3} />}
                  </span>
                  <div className="flex flex-1 flex-col">
                    <span className="text-[14px] font-semibold">
                      Seat {t.seatLabel} · {t.typeLabel}
                    </span>
                    <span className="font-mono text-[11px] text-ink-3">Issued · scannable</span>
                  </div>
                  <span className="font-mono text-[13px] font-semibold">
                    {formatPrice(t.priceMinor)}
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        <section className="px-5 pb-4">
          <div className="text-label mb-2">Reason</div>
          <select
            value={reason}
            disabled={submitted || isPending}
            onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])}
            className="w-full rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2.5 text-[14px] font-medium outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft disabled:opacity-60"
          >
            {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </section>

        <section className="px-5 pb-4">
          <div className="text-label mb-2">Notes (optional)</div>
          <textarea
            rows={3}
            value={notes}
            disabled={submitted || isPending}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Tell the organizer what happened…"
            className="w-full resize-none rounded-[var(--radius-md)] border border-line bg-surface p-3 text-[14px] outline-none placeholder:text-ink-3 focus:border-accent focus:ring-[3px] focus:ring-accent-soft disabled:opacity-60"
          />
        </section>

        <section className="px-5 pb-4">
          <Card className="bg-bg p-3.5" flat>
            <Row label="Ticket refund request" value={formatPrice(ticketRefundMinor)} />
            {order.bookingFeeMinor > 0 && (
              <Row
                label="Booking fee (not included)"
                value={formatPrice(order.bookingFeeMinor)}
                muted
              />
            )}
            <Divider className="my-2" />
            <div className="flex items-center">
              <span className="flex-1 text-[14px] font-semibold">You'll request</span>
              <span className="font-mono text-[18px] font-semibold">
                {formatPrice(ticketRefundMinor)}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-ink-3">
              <Icon name="check" size={12} />
              <span className="font-mono text-[10px]">
                Organizer approval required before payment-provider processing
              </span>
            </div>
          </Card>
        </section>

        <section className="px-5 pb-4">
          <Card className="border-[color:var(--color-accent-soft)] bg-[#fbf7ff] p-3.5" flat>
            <div className="text-label mb-2 text-accent">{policy.label}</div>
            {policy.bands.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {policy.bands.map((band) => {
                  const active = activeBand === band;
                  return (
                    <li key={`${band.hoursBefore}-${band.refundBps}`} className="flex items-center gap-1.5 text-[12px]">
                      <Icon name="check" size={14} className={active ? "text-accent" : "text-ink-3"} />
                      <span className={active ? "font-semibold text-ink" : "text-ink-3"}>
                        {formatWindow(band.hoursBefore)} · {formatPercent(band.refundBps)} refund
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-[12px] text-ink-3">This event is non-refundable.</p>
            )}
            <div className="mt-2 border-t border-line pt-2 font-mono text-[10px] uppercase text-ink-3">
              {Math.ceil(hoursUntil)} hours before event · {refundable ? `${formatPercent(refundBps)} eligible` : "Not refundable"}
            </div>
          </Card>
        </section>

        {submitted && (
          <section className="px-5 pb-4">
            <Card className="p-3.5" flat>
              <div className="flex gap-2">
                <Icon name="check" size={16} className="mt-0.5 text-success" />
                <div>
                  <p className="text-[13px] font-semibold">Refund request sent</p>
                  <p className="mt-0.5 text-[12px] text-ink-3">
                    The organizer will review it before it is submitted to the payment provider.
                  </p>
                </div>
              </div>
            </Card>
          </section>
        )}

        {error && (
          <section className="px-5 pb-4">
            <p className="rounded-[var(--radius-md)] border border-danger/30 bg-danger/5 p-3 text-[12px] text-danger">
              {error}
            </p>
          </section>
        )}

        <div className="h-24" />
      </div>

      <div className="sticky bottom-0 flex items-center gap-2 border-t border-line bg-surface px-5 py-3.5 pb-7">
        <Link
          href={`/orders/${order.id}/confirmation`}
          className="flex flex-1 items-center justify-center rounded-[var(--radius-md)] border border-line-2 bg-surface px-4 py-3.5 text-[14px] font-semibold hover:bg-bg"
        >
          {submitted ? "Done" : "Cancel"}
        </Link>
        <button
          type="button"
          onClick={submitRefund}
          disabled={selected.size === 0 || !refundable || submitted || isPending}
          className="flex flex-[2] items-center justify-center gap-2 rounded-[var(--radius-md)] bg-accent px-4 py-3.5 text-[14px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitted
            ? "Request sent"
            : isPending
              ? "Requesting…"
              : !refundable
                ? "Not refundable"
                : "Request refund"}
          {!submitted && !isPending && refundable && <Icon name="arrowR" size={16} />}
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
      <span className={"font-mono text-[12px] " + (muted ? "text-ink-3" : "text-ink")}>
        {value}
      </span>
    </div>
  );
}
