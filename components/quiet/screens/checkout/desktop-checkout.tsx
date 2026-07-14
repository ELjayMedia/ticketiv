"use client";

import * as React from "react";
import Link from "next/link";
import { Icon } from "@/components/quiet/ui/icon";
import { Card } from "@/components/quiet/ui/card";
import { Photo, Divider } from "@/components/quiet/ui/primitives";
import { Button } from "@/components/quiet/ui/button";
import { FormField, Stepper } from "@/components/quiet/ui/form";
import { useRouter } from "next/navigation";
import { formatPrice, formatHoldTimer } from "@/lib/format";
import { useEventLiveStats } from "@/lib/hooks/use-event-live-stats";
import { startCheckoutAction } from "@/app/(focused)/events/[id]/checkout/actions";
import { describePromoFailure } from "@/lib/checkout/promo-copy";
import { PromoCodeInput, type PromoResult } from "@/components/quiet/screens/checkout/promo-code-input";
import { trackBuyerFunnel } from "@/components/analytics/buyer-funnel";

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
  /** Event UUID for server-side order creation (eventId is the slug). */
  eventUuid: string;
  eventTitle: string;
  eventPhoto: string;
  eventWhenLabel: string;
  /** Seats already picked (reserved seating); empty for GA events */
  seats?: string[];
  ticketTypeId: string;
  ticketTypeName: string;
  quantity: number;
  subtotalMinor: number;
  bookingFeeMinor: number;
  vatRate: number;
  appliedPromo?: { code: string; description: string; savedMinor: number };
  holdSeconds?: number;
  /** Buyer's email; prefilled for signed-in users, empty for guests. */
  defaultBuyerEmail?: string;
}

const STEPS = [
  { label: "Cart" },
  { label: "Details" },
  { label: "Payment" },
  { label: "Done" },
];

export function DesktopCheckout({
  eventId,
  eventUuid,
  eventTitle,
  eventPhoto,
  eventWhenLabel,
  seats = [],
  ticketTypeId,
  ticketTypeName,
  quantity,
  subtotalMinor,
  bookingFeeMinor,
  vatRate,
  appliedPromo,
  holdSeconds = 522,
  defaultBuyerEmail = "",
}: DesktopCheckoutProps) {
  const router = useRouter();
  const [holdRemaining, setHoldRemaining] = React.useState(holdSeconds);
  const [guaranteeOpen, setGuaranteeOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [buyerEmail, setBuyerEmail] = React.useState(defaultBuyerEmail);
  const [buyerName, setBuyerName] = React.useState("");
  const [buyerPhone, setBuyerPhone] = React.useState("");
  const [attendeeDetails, setAttendeeDetails] = React.useState<Array<{ name: string; phone: string }>>(() =>
    Array.from({ length: quantity }, () => ({ name: "", phone: "" }))
  );
  const [promoInput, setPromoInput] = React.useState("");
  const [promoFeedback, setPromoFeedback] = React.useState<string | null>(null);
  const [policyAccepted, setPolicyAccepted] = React.useState(false);
  const [isApplyingPromo, setIsApplyingPromo] = React.useState(false);
  const [activePromo, setActivePromo] = React.useState(appliedPromo ?? null);
  const [validatedPromo, setValidatedPromo] = React.useState<PromoResult | null>(null);

  async function handleApplyPromo() {
    if (!promoInput.trim()) return;
    setIsApplyingPromo(true);
    setPromoFeedback(null);
    try {
      const result = await startCheckoutAction({
        eventId: eventUuid,
        buyerEmail: buyerEmail.trim() || "promo-check@placeholder.invalid",
        items: [{ ticketTypeId, quantity }],
        promoCode: promoInput.trim(),
      });
      if (!result.ok) {
        setPromoFeedback(result.error);
      } else if (result.promo && !result.promo.applied) {
        setPromoFeedback(describePromoFailure(result.promo.reason));
      }
    } finally {
      setIsApplyingPromo(false);
    }
  }

  async function handleContinueToPayment() {
    setSubmitError(null);
    if (!ticketTypeId) {
      setSubmitError("Select a ticket type before continuing.");
      trackBuyerFunnel("checkout_error", {
        event_id: eventUuid,
        event_slug: eventId,
        reason: "missing_ticket_type",
        surface: "desktop_checkout",
      });
      return;
    }
    setSubmitting(true);
    const result = await startCheckoutAction({
      eventId: eventUuid,
      buyerEmail: buyerEmail.trim(),
      items: [{ ticketTypeId, quantity }],
      promoCode: promoInput.trim() || null,
    });
    if (!result.ok) {
      setSubmitError(result.error);
      trackBuyerFunnel("checkout_error", {
        event_id: eventUuid,
        event_slug: eventId,
        reason: result.error,
        surface: "desktop_checkout",
      });
      setSubmitting(false);
      return;
    }
    if (result.promo && !result.promo.applied) {
      setPromoFeedback(describePromoFailure(result.promo.reason));
      trackBuyerFunnel("checkout_error", {
        event_id: eventUuid,
        event_slug: eventId,
        reason: `promo_${result.promo.reason}`,
        surface: "desktop_checkout",
      });
      setSubmitting(false);
      return;
    }
    trackBuyerFunnel("payment_redirect", {
      event_id: eventUuid,
      event_slug: eventId,
      ticket_type_id: ticketTypeId,
      quantity,
      total_minor: total,
      provider: result.checkoutUrl ? "paystack" : "internal",
      surface: "desktop_checkout",
    });
    if (result.checkoutUrl) {
      window.location.assign(result.checkoutUrl);
    } else {
      router.push(`/orders/${result.orderId}/confirmation`);
    }
  }

  const { stats: liveStats } = useEventLiveStats(eventId);
  const lastStatsAtRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!liveStats?.updated_at) return;
    if (lastStatsAtRef.current && lastStatsAtRef.current !== liveStats.updated_at) {
      router.refresh();
    }
    lastStatsAtRef.current = liveStats.updated_at ?? null;
  }, [liveStats?.updated_at, router]);

  useHoldExtension(holdRemaining, setHoldRemaining, holdSeconds);

  React.useEffect(() => {
    if (holdRemaining <= 0) return;
    const i = setInterval(() => setHoldRemaining((s) => s - 1), 1000);
    return () => clearInterval(i);
  }, [holdRemaining]);

  const vat = Math.round(subtotalMinor * vatRate);
  const discount = activePromo?.savedMinor ?? 0;
  const promoDiscount = validatedPromo
    ? validatedPromo.discountType === "percent"
      ? Math.round(subtotalMinor * validatedPromo.discountValue / 100)
      : validatedPromo.discountValue
    : 0;
  const total = subtotalMinor + bookingFeeMinor + vat - discount - promoDiscount;

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
          <DesktopHoldTimerLabel remaining={holdRemaining} />
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
              <FormField
                label="Full name"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Your full name"
                autoFocus
                disabled={submitting}
              />
              <FormField
                label="Email"
                type="email"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={submitting}
              />
              <FormField
                label="Phone (+268)"
                type="tel"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                placeholder="76 123 4567"
                disabled={submitting}
              />
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
                        <FormField
                          label="Name"
                          placeholder="Full name"
                          value={attendeeDetails[i]?.name ?? ""}
                          onChange={(e) =>
                            setAttendeeDetails((prev) =>
                              prev.map((a, j) => j === i ? { ...a, name: e.target.value } : a)
                            )
                          }
                          disabled={submitting}
                        />
                        <FormField
                          label="Phone"
                          type="tel"
                          placeholder="+268 …"
                          value={attendeeDetails[i]?.phone ?? ""}
                          onChange={(e) =>
                            setAttendeeDetails((prev) =>
                              prev.map((a, j) => j === i ? { ...a, phone: e.target.value } : a)
                            )
                          }
                          disabled={submitting}
                        />
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
                  value={promoInput}
                  onChange={(event) => {
                    setPromoInput(event.target.value);
                    if (promoFeedback) setPromoFeedback(null);
                  }}
                  className="!gap-0"
                  disabled={isApplyingPromo || submitting}
                />
              </div>
              <Button
                variant="default"
                type="button"
                onClick={handleApplyPromo}
                disabled={isApplyingPromo || submitting}
              >
                {isApplyingPromo ? "Applying…" : "Apply"}
              </Button>
            </div>
            {promoFeedback && (
              <p role="alert" className="mt-2 text-[12px] text-danger">
                {promoFeedback}
              </p>
            )}
            {activePromo && (
              <div className="mt-3 flex items-center gap-2.5 rounded-md border border-accent bg-accent-soft p-3">
                <div className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                  <Icon name="check" size={12} strokeWidth={3} />
                </div>
                <div className="flex flex-1 flex-col">
                  <span className="text-[13px] font-semibold">
                    {activePromo.code} applied
                  </span>
                  <span className="font-mono text-[11px] text-ink-3">
                    {activePromo.description} · saved{" "}
                    {formatPrice(activePromo.savedMinor)}
                  </span>
                </div>
                <button
                  type="button"
                  className="text-[12px] font-semibold text-accent"
                  onClick={() => {
                    setActivePromo(null);
                    setPromoInput("");
                  }}
                >
                  Remove
                </button>
              </div>
            )}
            <div className="mt-4">
              <PromoCodeInput
                eventId={eventUuid}
                onApply={(result) => {
                  setValidatedPromo(result);
                  if (result) setPromoInput(result.promoId);
                }}
              />
            </div>
          </Card>

          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-2 text-[12px] text-ink-3">
              <input
                id="desktop-policy-acceptance"
                type="checkbox"
                checked={policyAccepted}
                onChange={(e) => setPolicyAccepted(e.target.checked)}
                className="mt-0.5 accent-accent"
              />
              <span>
                <label htmlFor="desktop-policy-acceptance">I accept the </label>
                <Link href="/refund-policy" className="font-semibold text-accent hover:underline">
                  refund &amp; cancellation policy
                </Link>{" "}
                and{" "}
                <Link href="/terms" className="font-semibold text-accent hover:underline">
                  Terms
                </Link>
              </span>
            </div>
            {holdRemaining <= 0 && (
              <div role="alert" className="rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-[12px] text-danger">
                Your hold has expired — go back and select tickets again.
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                className="flex-1"
                onClick={() => router.push(`/events/${eventId}`)}
              >
                Back
              </Button>
              <button
                type="button"
                onClick={handleContinueToPayment}
                disabled={submitting || !buyerEmail.trim() || holdRemaining <= 0 || !policyAccepted}
                className="flex flex-[2] items-center justify-center gap-2 rounded-[var(--radius-md)] bg-accent px-4 py-2.5 text-[14px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Starting payment…" : "Continue to payment"}
                {!submitting && <Icon name="arrowR" size={14} />}
              </button>
            </div>
            {submitError && (
              <div role="alert" className="rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-[12px] text-danger">
                {submitError}
              </div>
            )}
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
            {activePromo && (
              <SummaryRow
                label={activePromo.code}
                value={`−${formatPrice(discount)}`}
                accent
              />
            )}
            {validatedPromo && promoDiscount > 0 && (
              <SummaryRow
                label="Promo"
                value={`−${formatPrice(promoDiscount)}`}
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
            <div
              className={
                "flex items-center gap-1.5 text-[11px] font-semibold " +
                (holdRemaining < 60 ? "text-danger animate-pulse" : "text-accent")
              }
            >
              <Icon name="zap" size={12} />
              <span>
                {holdRemaining <= 0
                  ? "Your hold has expired. Restart checkout to continue."
                  : `Your seats are held for ${formatHoldTimer(holdRemaining)}`}
              </span>
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
            <div className="mt-1.5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setGuaranteeOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent"
              >
                Buyer guarantee <Icon name="chevR" size={10} />
              </button>
              <Link
                href="/help"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent"
              >
                Need help? <Icon name="chevR" size={10} />
              </Link>
              <Link
                href="/refund-policy"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent"
              >
                Refunds <Icon name="chevR" size={10} />
              </Link>
            </div>
          </div>
        </Card>
      </div>
      {guaranteeOpen && (
        <DesktopBuyerGuaranteeModal onClose={() => setGuaranteeOpen(false)} />
      )}
    </div>
  );
}

function DesktopHoldTimerLabel({ remaining }: { remaining: number }) {
  const critical = remaining <= 0;
  const low = remaining > 0 && remaining < 60;
  return (
    <span
      className={
        "inline-flex items-center gap-1 font-mono text-[11px] font-semibold uppercase " +
        (critical
          ? "text-danger"
          : low
          ? "text-danger animate-pulse"
          : "text-accent")
      }
      aria-live="polite"
    >
      {low && !critical && (
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-danger" />
      )}
      {critical ? "Hold expired" : `Holds for ${formatHoldTimer(remaining)}`}
    </span>
  );
}

function useHoldExtension(
  remaining: number,
  setRemaining: React.Dispatch<React.SetStateAction<number>>,
  maxSeconds: number,
) {
  const bumpedRef = React.useRef(false);
  React.useEffect(() => {
    if (remaining >= 60) {
      bumpedRef.current = false;
      return;
    }
    if (remaining <= 0 || bumpedRef.current) return;
    const bump = () => {
      if (bumpedRef.current) return;
      bumpedRef.current = true;
      setRemaining((s) => Math.min(maxSeconds, Math.max(s, 120)));
    };
    const opts: AddEventListenerOptions = { passive: true, once: true };
    window.addEventListener("scroll", bump, opts);
    window.addEventListener("pointerdown", bump, opts);
    window.addEventListener("keydown", bump, opts);
    return () => {
      window.removeEventListener("scroll", bump, opts);
      window.removeEventListener("pointerdown", bump, opts);
      window.removeEventListener("keydown", bump, opts);
    };
  }, [remaining, setRemaining, maxSeconds]);
}

function DesktopBuyerGuaranteeModal({ onClose }: { onClose: () => void }) {
  React.useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ticketiv-guarantee-desktop-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[520px] rounded-[var(--radius-lg)] bg-surface p-6 shadow-[var(--shadow-elev)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start">
          <div className="flex-1">
            <h2
              id="ticketiv-guarantee-desktop-title"
              className="text-[20px] font-semibold tracking-[-0.02em]"
            >
              Ticketiv buyer guarantee
            </h2>
            <p className="mt-1 text-[12px] text-ink-3">
              Every booking is backed by a clear set of promises.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-line/60"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
        <ul className="mt-5 grid grid-cols-2 gap-3 text-[13px]">
          {[
            ["Authentic tickets", "Issued by the organizer — no resellers."],
            ["Cancelled? Refunded.", "Full refund, automatic, within 7 days."],
            ["Refund window honored", "We enforce the organizer's published policy."],
            ["Encrypted payment", "Cards & mobile money, certified providers."],
          ].map(([title, body]) => (
            <li
              key={title}
              className="flex items-start gap-2.5 rounded-[var(--radius)] border border-line bg-bg p-3"
            >
              <Icon name="check" size={14} className="mt-0.5 shrink-0 text-success" />
              <div>
                <div className="font-semibold">{title}</div>
                <div className="mt-0.5 text-[12px] text-ink-3">{body}</div>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex items-center gap-2">
          <Link
            href="/help"
            className="flex-1 rounded-[var(--radius)] border border-line-2 px-3 py-2 text-center text-[13px] font-semibold hover:bg-bg"
          >
            Read full policy
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-[var(--radius)] bg-ink px-3 py-2 text-[13px] font-semibold text-white hover:bg-ink-2"
          >
            Got it
          </button>
        </div>
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
