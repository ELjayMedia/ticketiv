"use client";

import * as React from "react";
import Link from "next/link";
import { Icon } from "@/components/quiet/ui/icon";
import { Card } from "@/components/quiet/ui/card";
import { Photo, Divider } from "@/components/quiet/ui/primitives";
import { Button } from "@/components/quiet/ui/button";
import { FormField, Stepper } from "@/components/quiet/ui/form";
import { PHOTOS } from "@/lib/photos";
import { formatPrice, formatHoldTimer } from "@/lib/format";

/* ──────────────────────────────────────────────────────────────
 * Desktop checkout · `/events/[id]/checkout` on md+
 *
 * Multi-step: Cart → Details → Payment → Done. We render Details
 * here as the worked step; the others reuse the same layout.
 *
 * Right column is a sticky 360-px order summary. Left column is
 * a stacked form: buyer details, per-attendee details, promo.
 *
 * State is local; Phase 2 wires a server action to commit to
 * Supabase `orders` and `order_items`.
 * ────────────────────────────────────────────────────────────── */

interface DesktopCheckoutProps {
  eventId: string;
  eventTitle: string;
  eventPhoto: string;
  eventWhenLabel: string;
  /** Seats already picked, e.g. ["C-4", "C-5"]; empty for GA */
  seats?: string[];
  ticketTypeName: string;
  quantity: number;
  subtotalMinor: number;
  bookingFeeMinor: number;
  vatRate: number;
  appliedPromo?: { code: string; description: string; savedMinor: number };
  holdSeconds?: number;
}

const STEPS = [
  { label: "Cart" },
  { label: "Details" },
  { label: "Payment" },
  { label: "Done" },
];

export function DesktopCheckout({
  eventId,
  eventTitle,
  eventPhoto,
  eventWhenLabel,
  seats = ["C-4", "C-5"],
  ticketTypeName,
  quantity,
  subtotalMinor,
  bookingFeeMinor,
  vatRate,
  appliedPromo,
  holdSeconds = 522,
}: DesktopCheckoutProps) {
  const [holdRemaining, setHoldRemaining] = React.useState(holdSeconds);

  React.useEffect(() => {
    if (holdRemaining <= 0) return;
    const i = setInterval(() => setHoldRemaining((s) => s - 1), 1000);
    return () => clearInterval(i);
  }, [holdRemaining]);

  const vat = Math.round(subtotalMinor * vatRate);
  const discount = appliedPromo?.savedMinor ?? 0;
  const total = subtotalMinor + bookingFeeMinor + vat - discount;

  return (
    <div className="min-h-dvh bg-bg">
      {/* Top nav with stepper */}
      <div className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-10 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-md bg-accent text-[12px] font-bold text-white">
              T
            </span>
            <span className="text-[15px] font-semibold tracking-tight">ticketiv</span>
          </Link>
          <span className="h-4 w-px bg-line" />
          <Link
            href={`/events/${eventId}`}
            className="font-mono text-[11px] text-ink-3 hover:text-ink"
          >
            ‹ back to event
          </Link>
          <span className="flex-1" />
          <Stepper steps={STEPS} currentIndex={1} />
          <span className="h-4 w-px bg-line" />
          <span
            className={
              "font-mono text-[11px] font-semibold " +
              (holdRemaining < 60 ? "text-danger" : "text-accent")
            }
            aria-live="polite"
          >
            HOLDS FOR {formatHoldTimer(holdRemaining)}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto grid max-w-[1100px] grid-cols-[1fr_360px] items-start gap-8 px-10 py-8">
        {/* ── Form column ─────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Buyer */}
          <Card className="p-5">
            <div className="mb-3.5 flex items-center justify-between">
              <h2 className="text-[18px] font-semibold tracking-[-0.02em]">
                Buyer details
              </h2>
              <span className="font-mono text-[11px] text-ink-3">1 of 3</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Full name" defaultValue="" placeholder="Your full name" autoFocus />
              <FormField label="Email" type="email" defaultValue="" placeholder="you@example.com" />
              <FormField label="Phone (+268)" type="tel" defaultValue="" placeholder="76 123 4567" />
              <FormField label="Country" defaultValue="Eswatini" readOnly />
            </div>
          </Card>

          {/* Attendees */}
          <Card className="p-5">
            <div className="mb-3.5 flex items-center justify-between">
              <h2 className="text-[18px] font-semibold tracking-[-0.02em]">
                Attendee details{" "}
                <span className="font-mono text-[12px] font-medium text-ink-3">
                  · {quantity} attendee{quantity === 1 ? "" : "s"}
                </span>
              </h2>
              <span className="font-mono text-[11px] text-ink-3">2 of 3</span>
            </div>

            <div className="flex flex-col gap-2.5">
              {Array.from({ length: quantity }).map((_, i) => {
                const isFirst = i === 0;
                const seat = seats[i];
                return (
                  <div
                    key={i}
                    className={
                      "rounded-[var(--radius-md)] border p-3.5 " +
                      (isFirst
                        ? "border-accent bg-accent-soft"
                        : "border-line")
                    }
                  >
                    <div className="mb-3 flex items-center">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={
                            "inline-flex h-5 w-5 items-center justify-center rounded-md font-mono text-[11px] font-bold text-white " +
                            (isFirst ? "bg-accent" : "bg-ink")
                          }
                        >
                          {i + 1}
                        </span>
                        <span className="text-[14px] font-semibold">
                          Ticket {i + 1}
                          {seat ? ` · Seat ${seat}` : ""} · {ticketTypeName}
                        </span>
                      </div>
                      <span className="flex-1" />
                      {isFirst && (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-accent">
                          <Icon name="check" size={11} strokeWidth={3} />
                          SAME AS BUYER
                        </span>
                      )}
                    </div>
                    {!isFirst && (
                      <div className="grid grid-cols-2 gap-2.5">
                        <FormField label="Name" placeholder="Full name" />
                        <FormField label="Phone" type="tel" placeholder="+268 …" />
                      </div>
                    )}
                    {isFirst && (
                      <span className="font-mono text-[11px] text-ink-3">
                        Your buyer details will be used for this ticket.
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Promo */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[18px] font-semibold tracking-[-0.02em]">
                Promo code
              </h2>
              <span className="font-mono text-[11px] text-ink-3">3 of 3</span>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <FormField
                  label=""
                  placeholder="Enter code"
                  defaultValue={appliedPromo?.code ?? ""}
                  className="!gap-0"
                />
              </div>
              <Button variant="default">Apply</Button>
            </div>
            {appliedPromo && (
              <div className="mt-3 flex items-center gap-2.5 rounded-md border border-accent bg-accent-soft p-3">
                <div className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                  <Icon name="check" size={12} strokeWidth={3} />
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
              </div>
            )}
          </Card>

          <div className="flex items-center gap-2">
            <Button variant="default" className="flex-1">
              Back
            </Button>
            <button className="flex flex-[2] items-center justify-center gap-2 rounded-[var(--radius-md)] bg-accent px-4 py-2.5 text-[14px] font-semibold text-white hover:opacity-90">
              Continue to payment <Icon name="arrowR" size={14} />
            </button>
          </div>
        </div>

        {/* ── Sticky summary ──────────────────────────────── */}
        <Card className="sticky top-6 self-start p-4">
          <div className="mb-3 flex items-start gap-2.5">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[var(--radius-md)]">
              <Photo src={eventPhoto} height={56} />
            </div>
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-[14px] font-semibold">{eventTitle}</span>
              <span className="font-mono text-[11px] text-ink-3">
                {eventWhenLabel}
              </span>
              {seats.length > 0 && (
                <span className="font-mono text-[11px] text-ink-3">
                  Seats {seats.join(", ")}
                </span>
              )}
            </div>
          </div>

          <Divider />

          <div className="flex flex-col gap-1 py-3">
            <SummaryRow
              label={`${quantity} × ${ticketTypeName}`}
              value={formatPrice(subtotalMinor)}
            />
            <SummaryRow label="Booking fee" value={formatPrice(bookingFeeMinor)} />
            <SummaryRow
              label={`VAT ${Math.round(vatRate * 100)}%`}
              value={formatPrice(vat)}
            />
            {appliedPromo && (
              <SummaryRow
                label={appliedPromo.code}
                value={`−${formatPrice(discount)}`}
                accent
              />
            )}
          </div>

          <Divider />

          <div className="mt-3 flex items-center">
            <span className="flex-1 text-[14px] font-semibold">Total</span>
            <span className="font-mono text-[20px] font-semibold">
              {formatPrice(total)}
            </span>
          </div>

          <div className="mt-3 rounded-md bg-bg p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-accent">
              <Icon name="zap" size={12} />
              <span>Your seats are held for {formatHoldTimer(holdRemaining)}</span>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5 font-mono text-[10px] text-ink-3">
            <Icon name="check" size={12} className="text-success" />
            <span>Free transfer · partial refund · QR + wallet</span>
          </div>
          <div className="mt-3 rounded-md border border-line bg-bg p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold">
              <Icon name="check" size={12} className="text-success" />
              Secure checkout
            </div>
            <p className="font-mono text-[10px] leading-relaxed text-ink-3">
              Encrypted payment · refund policy per organizer · contact us anytime.
            </p>
            <Link
              href="/help"
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-accent"
            >
              Need help? <Icon name="chevR" size={10} />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

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
