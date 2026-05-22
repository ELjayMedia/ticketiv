"use client";

import * as React from "react";
import Link from "next/link";
import { Icon } from "@/components/quiet/ui/icon";
import { Card } from "@/components/quiet/ui/card";
import { Photo, Divider } from "@/components/quiet/ui/primitives";
import {
  RadioCard,
  QuantityStepper,
} from "@/components/quiet/ui/form";
import { PHOTOS } from "@/lib/photos";
import { formatPrice, formatHoldTimer } from "@/lib/format";

/* ──────────────────────────────────────────────────────────────
 * Mobile checkout · `/events/[id]/checkout` on phones.
 *
 * Single page (no multi-step), single-column. Top hold-timer
 * decrements client-side; on expiry the Phase 2 wiring will
 * release the cart via /api/checkout/release.
 *
 * "use client" because of the timer + state — the data fetch
 * is done by the parent server component and passed in.
 * ────────────────────────────────────────────────────────────── */

export interface MobileCheckoutProps {
  eventId: string;
  eventTitle: string;
  eventPhoto: string;
  eventWhenLabel: string;
  eventVenue: string;
  /** Initial seconds of hold (Supabase reservation TTL). */
  holdSeconds?: number;
  ticketTypes: ReadonlyArray<{
    id: string;
    name: string;
    priceMinor: number;
    remaining: number | null;
    sublabel?: string;
  }>;
  paymentMethods?: ReadonlyArray<{
    id: string;
    label: string;
    sub: string;
    type: "card" | "mobile_money" | "ewallet";
  }>;
  /** Promo banner pre-applied (e.g. WELCOME10). */
  appliedPromo?: { code: string; description: string; savedMinor: number };
  /** Fixed booking fee in minor units */
  bookingFeeMinor?: number;
  vatRate?: number;
}

const DEFAULT_PAYMENTS = [
  { id: "card", label: "•••• •••• •••• 4242", sub: "Exp 12/27 · Visa", type: "card" as const },
  { id: "momo", label: "MTN MoMo", sub: "Pay from your phone", type: "mobile_money" as const },
  { id: "eft", label: "DeltaPay EFT", sub: "Bank-to-bank", type: "ewallet" as const },
];

export function MobileCheckout({
  eventId,
  eventTitle,
  eventPhoto,
  eventWhenLabel,
  eventVenue,
  holdSeconds = 522,
  ticketTypes,
  paymentMethods = DEFAULT_PAYMENTS,
  appliedPromo,
  bookingFeeMinor = 10000,
  vatRate = 0.15,
}: MobileCheckoutProps) {
  const firstAvailable = ticketTypes.find((t) => t.remaining !== 0);
  const [ticketTypeId, setTicketTypeId] = React.useState(
    firstAvailable?.id ?? ticketTypes[0]?.id
  );
  const [quantity, setQuantity] = React.useState(1);
  const [paymentId, setPaymentId] = React.useState(paymentMethods[0]?.id);
  const [holdRemaining, setHoldRemaining] = React.useState(holdSeconds);
  const [accepted, setAccepted] = React.useState(false);

  React.useEffect(() => {
    if (holdRemaining <= 0) return;
    const i = setInterval(() => setHoldRemaining((s) => s - 1), 1000);
    return () => clearInterval(i);
  }, [holdRemaining]);

  const selectedTicket = ticketTypes.find((t) => t.id === ticketTypeId);
  const subtotal = (selectedTicket?.priceMinor ?? 0) * quantity;
  const fee = bookingFeeMinor;
  const vat = Math.round(subtotal * vatRate);
  const discount = appliedPromo?.savedMinor ?? 0;
  const total = subtotal + fee + vat - discount;

  return (
    <div className="flex h-full flex-col bg-bg">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="h-14" />

        {/* Top bar */}
        <header className="flex items-center gap-2.5 px-5 pb-3 pt-2">
          <Link
            href={`/events/${eventId}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60"
            aria-label="Close"
          >
            <Icon name="close" size={22} />
          </Link>
          <div className="flex flex-1 flex-col leading-tight">
            <span className="text-[15px] font-semibold">Checkout</span>
            <span
              className={
                "font-mono text-[10px] font-semibold uppercase " +
                (holdRemaining < 60 ? "text-danger" : "text-accent")
              }
              aria-live="polite"
            >
              HOLDS FOR {formatHoldTimer(holdRemaining)}
            </span>
          </div>
          <span className="font-mono text-[10px] text-ink-3">1/1</span>
        </header>

        {/* Event ribbon */}
        <div className="mx-5 mb-4 flex items-center gap-2.5 rounded-xl bg-ink p-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md">
            <Photo src={eventPhoto} height={40} />
          </div>
          <div className="flex flex-1 flex-col">
            <span className="text-[13px] font-semibold text-white">{eventTitle}</span>
            <span className="font-mono text-[10px] uppercase text-white/60">
              {eventWhenLabel} · {eventVenue}
            </span>
          </div>
          <Icon name="chevR" size={16} className="text-white/50" />
        </div>

        {/* Ticket type */}
        <section className="px-5 pb-4">
          <div className="text-label mb-2">Ticket type</div>
          <div className="flex flex-col gap-1.5">
            {ticketTypes.map((t) => {
              const soldOut = t.remaining === 0;
              return (
                <RadioCard
                  key={t.id}
                  name="ticket-type"
                  value={t.id}
                  selected={ticketTypeId === t.id}
                  disabled={soldOut}
                  onChange={setTicketTypeId}
                  title={t.name}
                  subtitle={
                    soldOut
                      ? "Sold out"
                      : t.remaining !== null
                      ? t.sublabel ?? `${t.remaining} left at this price`
                      : t.sublabel
                  }
                  trailing={
                    <span
                      className={
                        "font-mono text-[14px] font-semibold " +
                        (soldOut ? "line-through" : "")
                      }
                    >
                      {formatPrice(t.priceMinor)}
                    </span>
                  }
                />
              );
            })}
          </div>
        </section>

        {/* Quantity */}
        <section className="px-5 pb-4">
          <Card className="flex items-center gap-3 px-3 py-2.5" flat>
            <span className="flex-1 text-[13px] font-medium">Quantity</span>
            <span className="font-mono text-[10px] text-ink-3">max 4</span>
            <QuantityStepper
              value={quantity}
              onChange={setQuantity}
              min={1}
              max={Math.min(4, selectedTicket?.remaining ?? 4)}
            />
          </Card>
        </section>

        {/* Promo */}
        {appliedPromo && (
          <section className="px-5 pb-4">
            <Card
              className="flex items-center gap-2.5 border-[color:var(--color-accent-soft)] bg-[#fbf7ff] px-3 py-2.5"
              flat
            >
              <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent text-[14px] font-bold text-white">
                %
              </div>
              <div className="flex flex-1 flex-col">
                <span className="text-[13px] font-semibold">
                  {appliedPromo.code} applied
                </span>
                <span className="font-mono text-[11px] text-ink-3">
                  {appliedPromo.description} · saved{" "}
                  {formatPrice(appliedPromo.savedMinor)}
                </span>
              </div>
              <button className="text-[12px] font-semibold text-accent">
                Remove
              </button>
            </Card>
          </section>
        )}

        {/* Payment */}
        <section className="px-5 pb-4">
          <div className="text-label mb-2">Pay with</div>
          <div className="flex flex-col gap-1.5">
            {paymentMethods.map((p) => (
              <RadioCard
                key={p.id}
                name="payment"
                value={p.id}
                selected={paymentId === p.id}
                onChange={setPaymentId}
                leading={<PaymentBadge type={p.type} />}
                title={p.label}
                subtitle={p.sub}
              />
            ))}
            <button className="flex items-center gap-3 rounded-[var(--radius-md)] border border-line p-3 text-[13px] text-ink-3 hover:border-line-2">
              <span className="inline-block h-[18px] w-[18px] rounded-full border-2 border-line-2" />
              <Icon name="plus" size={20} />
              <span>Add new payment method</span>
            </button>
          </div>
        </section>

        {/* Summary */}
        <section className="px-5 pb-4">
          <Card className="bg-bg p-3.5" flat>
            <SummaryRow label={`${quantity} × ${selectedTicket?.name ?? "—"}`} value={formatPrice(subtotal)} />
            <SummaryRow label="Booking fee" value={formatPrice(fee)} />
            <SummaryRow label={`VAT ${Math.round(vatRate * 100)}%`} value={formatPrice(vat)} />
            {appliedPromo && (
              <SummaryRow
                label={appliedPromo.code}
                value={`−${formatPrice(discount)}`}
                accent
              />
            )}
            <Divider className="my-2" />
            <div className="flex items-center">
              <span className="flex-1 text-[14px] font-semibold">Total</span>
              <span className="font-mono text-[16px] font-semibold">
                {formatPrice(total)}
              </span>
            </div>
          </Card>
        </section>

        {/* Terms */}
        <label className="flex items-center gap-2 px-5 pb-4 text-[11px] text-ink-3">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="accent-accent"
          />
          <Icon name="check" size={14} />
          <span>I accept the refund &amp; cancellation policy</span>
        </label>

        <div className="h-20" />
      </div>

      {/* Sticky pay */}
      <div className="sticky bottom-0 flex items-center gap-3 border-t border-line bg-surface px-5 py-3.5 pb-7">
        <div className="flex flex-col">
          <span className="text-label">Total</span>
          <span className="font-mono text-[18px] font-semibold leading-none">
            {formatPrice(total)}
          </span>
        </div>
        <button
          disabled={!accepted || holdRemaining <= 0}
          className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-accent px-4 py-3.5 text-[14px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Pay {formatPrice(total)} <Icon name="arrowR" size={16} />
        </button>
      </div>
    </div>
  );
}

/* ── Local helpers ──────────────────────────────────────── */

function SummaryRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center py-0.5">
      <span className="flex-1 font-mono text-[12px] text-ink-3">{label}</span>
      <span
        className={
          "font-mono text-[12px] " + (accent ? "text-accent" : "text-ink")
        }
      >
        {value}
      </span>
    </div>
  );
}

function PaymentBadge({
  type,
}: {
  type: "card" | "mobile_money" | "ewallet";
}) {
  if (type === "card") {
    return (
      <div className="inline-flex h-[26px] w-[40px] items-center justify-center rounded bg-[#1a1f71] font-mono text-[10px] font-bold tracking-wider text-white">
        VISA
      </div>
    );
  }
  if (type === "mobile_money") {
    return (
      <div className="inline-flex h-[26px] w-[40px] items-center justify-center rounded bg-[#ffcc00] font-mono text-[10px] font-bold text-ink">
        MTN
      </div>
    );
  }
  return (
    <div className="h-[26px] w-[40px] rounded bg-gradient-to-br from-[#ff5f00] to-[#f79e1b]" />
  );
}
