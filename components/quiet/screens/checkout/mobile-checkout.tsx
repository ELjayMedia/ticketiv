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
import { useRouter } from "next/navigation";
import { PHOTOS } from "@/lib/photos";
import { formatPrice, formatHoldTimer, formatScarcityLabel } from "@/lib/format";
import { useEventLiveStats } from "@/lib/hooks/use-event-live-stats";
import { startCheckoutAction } from "@/app/(focused)/events/[id]/checkout/actions";
import { describePromoFailure } from "@/lib/checkout/promo-copy";

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
  /** Event UUID for server-side order creation (eventId is the slug used in URLs). */
  eventUuid: string;
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
  /** Buyer's email; prefilled for signed-in users, empty for guests. */
  defaultBuyerEmail?: string;
}

const DEFAULT_PAYMENTS = [
  { id: "card", label: "•••• •••• •••• 4242", sub: "Exp 12/27 · Visa", type: "card" as const },
  { id: "momo", label: "MTN MoMo", sub: "Pay from your phone", type: "mobile_money" as const },
  { id: "eft", label: "DeltaPay EFT", sub: "Bank-to-bank", type: "ewallet" as const },
];

export function MobileCheckout({
  eventId,
  eventUuid,
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
  defaultBuyerEmail = "",
}: MobileCheckoutProps) {
  const router = useRouter();
  const { stats: liveStats } = useEventLiveStats(eventId);
  const lastStatsAtRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!liveStats?.updated_at) return;
    if (lastStatsAtRef.current && lastStatsAtRef.current !== liveStats.updated_at) {
      router.refresh();
    }
    lastStatsAtRef.current = liveStats.updated_at ?? null;
  }, [liveStats?.updated_at, router]);

  const firstAvailable = ticketTypes.find((t) => t.remaining !== 0);
  const [ticketTypeId, setTicketTypeId] = React.useState(
    firstAvailable?.id ?? ticketTypes[0]?.id
  );
  const [quantity, setQuantity] = React.useState(1);
  const [paymentId, setPaymentId] = React.useState(paymentMethods[0]?.id);
  const [holdRemaining, setHoldRemaining] = React.useState(holdSeconds);
  const [activePromo, setActivePromo] = React.useState(appliedPromo ?? null);
  const [accepted, setAccepted] = React.useState(false);
  const [guaranteeOpen, setGuaranteeOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [buyerEmail, setBuyerEmail] = React.useState(defaultBuyerEmail);
  const [promoInput, setPromoInput] = React.useState("");
  const [promoFeedback, setPromoFeedback] = React.useState<
    { ok: true; label: string; savedMinor: number } | { ok: false; message: string } | null
  >(null);
  const [isApplyingPromo, setIsApplyingPromo] = React.useState(false);
  const [attendeeName, setAttendeeName] = React.useState("");
  const [attendeePhone, setAttendeePhone] = React.useState("");

  async function handleApplyPromo() {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setIsApplyingPromo(true);
    setPromoFeedback(null);
    try {
      const result = await startCheckoutAction({
        eventId: eventUuid,
        buyerEmail: buyerEmail.trim() || "promo-check@placeholder.invalid",
        items: [{ ticketTypeId: ticketTypeId ?? "", quantity }],
        promoCode: code,
      });
      if (!result.ok) {
        setPromoFeedback({ ok: false, message: result.error });
      } else if (result.promo && !result.promo.applied) {
        setPromoFeedback({ ok: false, message: describePromoFailure(result.promo.reason) });
      } else {
        setPromoFeedback({ ok: true, label: code, savedMinor: result.promo?.adjustmentCents ?? 0 });
      }
    } finally {
      setIsApplyingPromo(false);
    }
  }

  async function handlePay() {
    setSubmitError(null);
    if (!ticketTypeId) {
      setSubmitError("Select a ticket type before paying.");
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
      setSubmitting(false);
      return;
    }
    // Surface promo-apply failure but proceed — the order itself was created.
    // Buyer can choose not to follow the Paystack redirect and retry.
    if (result.promo && !result.promo.applied) {
      setPromoFeedback({ ok: false, message: describePromoFailure(result.promo.reason) });
      setSubmitting(false);
      return;
    }
    if (result.checkoutUrl) {
      window.location.href = result.checkoutUrl;
    } else {
      router.push(`/orders/${result.orderId}/confirmation`);
    }
  }

  // Activity-based hold extension: real users who scroll/tap/type during
  // checkout shouldn't get punished by an unresponsive timer. When the
  // timer drops below 60s, any interaction tops it back up to 120s — but
  // never higher than the initial hold so we don't lie to the server.
  useHoldExtension(holdRemaining, setHoldRemaining, holdSeconds);

  React.useEffect(() => {
    if (holdRemaining <= 0) return;
    const i = setInterval(() => setHoldRemaining((s) => s - 1), 1000);
    return () => clearInterval(i);
  }, [holdRemaining]);

  const selectedTicket = ticketTypes.find((t) => t.id === ticketTypeId);
  const subtotal = (selectedTicket?.priceMinor ?? 0) * quantity;
  const fee = bookingFeeMinor;
  const vat = Math.round(subtotal * vatRate);
  const discount = activePromo?.savedMinor ?? 0;
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
            <HoldTimerLabel remaining={holdRemaining} />
          </div>
          <Link
            href="/help"
            className="font-mono text-[10px] font-semibold uppercase text-ink-3 hover:text-ink"
          >
            Help
          </Link>
        </header>

        {/* Progress indicator: Tickets → Details → Payment → Done */}
        <MobileCheckoutProgress currentIndex={1} />

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
              const scarcity = soldOut ? null : formatScarcityLabel(t.remaining);
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
                      : scarcity ?? t.sublabel
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

        {/* Attendee details */}
        <section className="px-5 pb-4">
          <div className="text-label mb-2">Attendee details</div>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              autoComplete="name"
              value={attendeeName}
              onChange={(e) => setAttendeeName(e.target.value)}
              placeholder="Full name"
              className="h-10 w-full rounded-[var(--radius-md)] border border-line bg-surface px-3 text-[14px] placeholder:text-ink-3 focus:border-accent focus:outline-none"
              disabled={submitting}
            />
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={attendeePhone}
              onChange={(e) => setAttendeePhone(e.target.value)}
              placeholder="Phone number (optional)"
              className="h-10 w-full rounded-[var(--radius-md)] border border-line bg-surface px-3 text-[14px] placeholder:text-ink-3 focus:border-accent focus:outline-none"
              disabled={submitting}
            />
          </div>
        </section>

        {/* Promo */}
        {activePromo && (
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
            </Card>
          </section>
        )}

        {/* Promo code entry */}
        <section className="px-5 pb-4">
          <label htmlFor="promo-code" className="text-label mb-1.5 block">
            Promo code
          </label>
          <div className="flex items-center gap-2">
            <input
              id="promo-code"
              type="text"
              autoCapitalize="characters"
              inputMode="text"
              value={promoInput}
              onChange={(event) => {
                setPromoInput(event.target.value);
                if (promoFeedback) setPromoFeedback(null);
              }}
              placeholder="Add a code"
              className="h-9 flex-1 rounded-[var(--radius-md)] border border-line bg-surface px-3 font-mono text-[13px] uppercase tracking-wide placeholder:normal-case placeholder:text-ink-3 focus:border-accent focus:outline-none"
              disabled={submitting || isApplyingPromo || promoFeedback?.ok === true}
            />
            <button
              type="button"
              onClick={handleApplyPromo}
              disabled={!promoInput.trim() || submitting || isApplyingPromo || promoFeedback?.ok === true}
              className="h-9 shrink-0 rounded-[var(--radius-md)] border border-line-2 bg-surface px-3 font-mono text-[12px] font-semibold text-ink disabled:opacity-40"
            >
              {isApplyingPromo ? "Applying…" : "Apply"}
            </button>
          </div>
          {promoFeedback?.ok === true && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <p className="flex-1 text-[12px] text-accent">
                {promoFeedback.label} — verified at checkout
              </p>
              <button
                type="button"
                onClick={() => { setPromoFeedback(null); setPromoInput(""); }}
                className="text-[11px] text-ink-3 hover:text-ink"
              >
                Remove
              </button>
            </div>
          )}
          {promoFeedback?.ok === false && (
            <p role="alert" className="mt-1.5 text-[12px] text-danger">
              {promoFeedback.message}
            </p>
          )}
        </section>

        {/* Buyer email — required so the ticket can be delivered. Prefilled
            for signed-in buyers, collected from guests. */}
        <section className="px-5 pb-4">
          <label htmlFor="buyer-email" className="text-label mb-2 block">Send ticket to</label>
          <input
            id="buyer-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-10 w-full rounded-[var(--radius-md)] border border-line bg-surface px-3 text-[14px] placeholder:text-ink-3 focus:border-accent focus:outline-none"
            disabled={submitting}
          />
        </section>

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
            <button
              onClick={() => router.push("/profile")}
              className="flex items-center gap-3 rounded-[var(--radius-md)] border border-line p-3 text-[13px] text-ink-3 hover:border-line-2"
            >
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
            {activePromo && (
              <SummaryRow
                label={activePromo.code}
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

        {/* Reassurance block */}
        <section className="px-5 pb-4">
          <Card className="bg-bg p-3.5" flat>
            <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold">
              <Icon name="check" size={14} className="text-success" />
              Secure checkout
            </div>
            <ul className="flex flex-col gap-1 font-mono text-[11px] text-ink-3">
              <li>Encrypted payment · cards & mobile money</li>
              <li>Refund window per organizer policy</li>
              <li>Free transfer to friends, anytime before doors</li>
            </ul>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <button
                type="button"
                onClick={() => setGuaranteeOpen(true)}
                className="text-[12px] font-semibold text-accent"
              >
                Buyer guarantee
              </button>
              <span className="text-ink-3">·</span>
              <Link href="/help" className="text-[12px] font-semibold text-accent">
                Contact support
              </Link>
            </div>
          </Card>
        </section>

        {guaranteeOpen && (
          <BuyerGuaranteeModal onClose={() => setGuaranteeOpen(false)} />
        )}

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
          type="button"
          onClick={handlePay}
          disabled={!accepted || holdRemaining <= 0 || submitting || !buyerEmail.trim()}
          className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-accent px-4 py-3.5 text-[14px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Starting payment…" : `Pay ${formatPrice(total)}`}
          {!submitting && <Icon name="arrowR" size={16} />}
        </button>
      </div>
      {submitError && (
        <div
          role="alert"
          className="border-t border-danger/40 bg-danger/5 px-5 py-2 text-[12px] text-danger"
        >
          {submitError}
        </div>
      )}
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

function HoldTimerLabel({ remaining }: { remaining: number }) {
  const critical = remaining <= 0;
  const low = remaining > 0 && remaining < 60;
  return (
    <span
      className={
        "inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase " +
        (critical
          ? "text-danger"
          : low
          ? "text-danger animate-pulse"
          : "text-accent")
      }
      aria-live="polite"
    >
      {low && !critical && (
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full bg-danger"
        />
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
  // We deliberately keep this conservative: a single bump back to 120s (or
  // the original hold, whichever is smaller) per low-time window. Buyers
  // who walk away still time out — we only protect honest scrolls/taps.
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

function BuyerGuaranteeModal({ onClose }: { onClose: () => void }) {
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
      aria-labelledby="ticketiv-guarantee-title"
      className="fixed inset-0 z-50 flex items-end bg-ink/40 px-5 pb-5 sm:items-center sm:justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] rounded-[var(--radius-lg)] bg-surface p-5 shadow-[var(--shadow-elev)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start">
          <div className="flex-1">
            <h2
              id="ticketiv-guarantee-title"
              className="text-[18px] font-semibold tracking-[-0.02em]"
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
        <ul className="mt-4 flex flex-col gap-3 text-[13px]">
          <li className="flex items-start gap-2.5">
            <Icon name="check" size={14} className="mt-0.5 shrink-0 text-success" />
            <div>
              <span className="font-semibold">Authentic tickets, every time.</span>{" "}
              <span className="text-ink-3">
                Issued directly by the organizer. No resellers in the loop.
              </span>
            </div>
          </li>
          <li className="flex items-start gap-2.5">
            <Icon name="check" size={14} className="mt-0.5 shrink-0 text-success" />
            <div>
              <span className="font-semibold">Refunded if the event is cancelled.</span>{" "}
              <span className="text-ink-3">
                Full refund, automatically, within 7 days.
              </span>
            </div>
          </li>
          <li className="flex items-start gap-2.5">
            <Icon name="check" size={14} className="mt-0.5 shrink-0 text-success" />
            <div>
              <span className="font-semibold">Refund window honored.</span>{" "}
              <span className="text-ink-3">
                We enforce the organizer's published policy on your behalf.
              </span>
            </div>
          </li>
          <li className="flex items-start gap-2.5">
            <Icon name="check" size={14} className="mt-0.5 shrink-0 text-success" />
            <div>
              <span className="font-semibold">Encrypted payment.</span>{" "}
              <span className="text-ink-3">
                Cards & mobile money, processed by certified providers.
              </span>
            </div>
          </li>
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

const CHECKOUT_STEPS = ["Tickets", "Details", "Payment", "Confirmation"] as const;

function MobileCheckoutProgress({ currentIndex }: { currentIndex: number }) {
  return (
    <div className="px-5 pb-3">
      <div className="flex items-center gap-1.5" aria-label="Checkout progress">
        {CHECKOUT_STEPS.map((label, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <React.Fragment key={label}>
              <div className="flex items-center gap-1.5">
                <span
                  className={
                    "inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold " +
                    (active
                      ? "bg-accent text-white"
                      : done
                      ? "bg-ink text-white"
                      : "bg-line text-ink-3")
                  }
                >
                  {done ? "✓" : i + 1}
                </span>
                <span
                  className={
                    "font-mono text-[10px] font-semibold uppercase " +
                    (active ? "text-ink" : "text-ink-3")
                  }
                >
                  {label}
                </span>
              </div>
              {i < CHECKOUT_STEPS.length - 1 && (
                <span
                  className={
                    "h-px flex-1 " + (done ? "bg-ink" : "bg-line")
                  }
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
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
