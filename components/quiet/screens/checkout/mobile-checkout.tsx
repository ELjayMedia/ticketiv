"use client";

import * as React from "react";
import Link from "next/link";
import { Icon } from "@/components/quiet/ui/icon";
import { Card } from "@/components/quiet/ui/card";
import { Photo } from "@/components/quiet/ui/primitives";
import { RadioCard } from "@/components/quiet/ui/form";
import { Modal, ModalContent, ModalFooter } from "@/components/quiet/ui/modal";
import { useRouter } from "next/navigation";
import { formatPrice, formatHoldTimer } from "@/lib/format";
import type { Currency } from "@/lib/format";
import { useEventLiveStats } from "@/lib/hooks/use-event-live-stats";
import { startCheckoutAction } from "@/app/(focused)/events/[id]/checkout/actions";
import { describePromoFailure } from "@/lib/checkout/promo-copy";
import { PromoCodeInput, promoDiscountMinor, type AppliedPromo } from "@/components/quiet/screens/checkout/promo-code-input";
import { trackBuyerFunnel } from "@/components/analytics/buyer-funnel";
import { cartSubtotalMinor, checkoutTotalMinor, type CheckoutCartLine } from "@/lib/checkout/pricing";
import { checkoutPayBlocker } from "@/lib/checkout/pay-blocker";

/* ──────────────────────────────────────────────────────────────
 * Mobile checkout · `/events/[id]/checkout` on phones.
 *
 * Single page, single column: where to send the tickets, how to
 * pay, Pay. Only the buyer's email is collected because it is the
 * only detail the order uses. Top hold-timer decrements client-side;
 * on expiry the buyer is sent back to the event page.
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
  /** Cart from the ticket picker, already clamped to live availability. */
  lines: ReadonlyArray<CheckoutCartLine>;
  /** Back to the event page's ticket picker with this cart preloaded. */
  editTicketsHref: string;
  paymentMethods?: ReadonlyArray<{
    id: string;
    label: string;
    sub: string;
    type: "card" | "mobile_money" | "ewallet";
  }>;
  /** Buyer's email; prefilled for signed-in users, empty for guests. */
  defaultBuyerEmail?: string;
}


export function MobileCheckout({
  eventId,
  eventUuid,
  eventTitle,
  eventPhoto,
  eventWhenLabel,
  eventVenue,
  holdSeconds = 522,
  lines,
  editTicketsHref,
  paymentMethods = [],
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

  const [paymentId, setPaymentId] = React.useState(paymentMethods[0]?.id);
  const [holdRemaining, setHoldRemaining] = React.useState(holdSeconds);
  const [guaranteeOpen, setGuaranteeOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [buyerEmail, setBuyerEmail] = React.useState(defaultBuyerEmail);
  // The one promo control: previewed without creating an order, sent by code at payment.
  const [promo, setPromo] = React.useState<AppliedPromo | null>(null);
  const [promoRejection, setPromoRejection] = React.useState<string | null>(null);
  const items = lines.map((l) => ({ ticketTypeId: l.ticketTypeId, quantity: l.quantity }));
  const totalQuantity = items.reduce((sum, l) => sum + l.quantity, 0);
  const singleTicketTypeId = lines.length === 1 ? lines[0].ticketTypeId : null;

  async function handlePay() {
    setSubmitError(null);
    setSubmitting(true);
    const result = await startCheckoutAction({
      eventId: eventUuid,
      buyerEmail: buyerEmail.trim(),
      items,
      promoCode: promo?.code ?? null,
    });
    if (!result.ok) {
      setSubmitError(result.error);
      trackBuyerFunnel("checkout_error", {
        event_id: eventUuid,
        event_slug: eventId,
        reason: result.error,
        surface: "mobile_checkout",
      });
      setSubmitting(false);
      return;
    }
    // The preview passed but the order-time check refused the code (e.g. it ran
    // out meanwhile). Stop before payment so the buyer is never charged a total
    // that differs from the one on screen.
    if (result.promo && !result.promo.applied) {
      setPromo(null);
      setPromoRejection(`${describePromoFailure(result.promo.reason)} Your total has been updated; tap Pay again to continue without it.`);
      trackBuyerFunnel("checkout_error", {
        event_id: eventUuid,
        event_slug: eventId,
        reason: `promo_${result.promo.reason}`,
        surface: "mobile_checkout",
      });
      setSubmitting(false);
      return;
    }
    trackBuyerFunnel("payment_redirect", {
      event_id: eventUuid,
      event_slug: eventId,
      ticket_type_id: singleTicketTypeId,
      quantity: totalQuantity,
      line_count: lines.length,
      total_minor: total,
      provider: result.checkoutUrl ? "paystack" : "internal",
      surface: "mobile_checkout",
    });
    if (result.checkoutUrl) {
      window.location.assign(result.checkoutUrl);
    } else {
      router.push(`/orders/${result.orderId}/confirmation`);
    }
  }

  // TICK-200: when the hold expires (holdRemaining hits 0), redirect to
  // the event page with a banner so the buyer can request a new hold.
  React.useEffect(() => {
    if (holdSeconds <= 0) return; // no hold was created — no redirect
    if (holdRemaining <= 0) {
      router.replace(`/events/${eventId}?hold_expired=1`);
    }
  }, [holdRemaining, holdSeconds, eventId, router]);

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

  const currency = lines[0]?.currency ?? "SZL";
  const subtotal = cartSubtotalMinor(lines);
  const promoDiscount = promoDiscountMinor(promo, subtotal);
  const total = checkoutTotalMinor(subtotal, promoDiscount);
  const payBlocker = checkoutPayBlocker({ buyerEmail, holdRemaining, lineCount: lines.length });

  return (
    <div className="flex h-full flex-col bg-bg">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="h-[max(env(safe-area-inset-top),0.25rem)]" />

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
        </div>

        {/* Buyer email — the one required field, so it comes first. Prefilled
            for signed-in buyers, collected from guests. */}
        <section className="px-5 pb-4">
          <label htmlFor="buyer-email" className="text-label mb-2 block">Send tickets to</label>
          <input
            id="buyer-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-11 w-full rounded-[var(--radius-md)] border border-line bg-surface px-3 text-[14px] placeholder:text-ink-3 focus:border-accent focus:outline-none"
            disabled={submitting}
          />
        </section>

        {/* Your tickets — chosen in the picker; edit goes back there. The
            sticky bar carries the total, so this card only adds one when a
            promo changes it. */}
        <section className="px-5 pb-4">
          <div className="mb-2 flex items-center">
            <span className="text-label flex-1">Your tickets</span>
            <Link href={editTicketsHref} className="text-[12px] font-semibold text-accent">
              Edit
            </Link>
          </div>
          <Card className="flex flex-col divide-y divide-line px-3" flat>
            {lines.map((l) => (
              <div key={l.ticketTypeId} className="flex items-center gap-3 py-2.5">
                <span className="font-mono text-[13px] font-semibold tabular-nums">{l.quantity}×</span>
                <span className="flex-1 text-[13px] font-medium">{l.name}</span>
                <span className="font-mono text-[13px] tabular-nums">{formatPrice(l.priceMinor * l.quantity, l.currency)}</span>
              </div>
            ))}
            {promo && promoDiscount > 0 && (
              <div className="flex items-center gap-3 py-2.5">
                <span className="flex-1 font-mono text-[12px] text-accent">Promo {promo.code}</span>
                <span className="font-mono text-[13px] tabular-nums text-accent">−{formatPrice(promoDiscount, currency)}</span>
              </div>
            )}
          </Card>
          <div className="mt-2">
            <PromoCodeInput
              eventId={eventUuid}
              value={promo}
              onChange={(next) => {
                setPromo(next);
                setPromoRejection(null);
              }}
              savingMinor={promoDiscount}
              formatSaving={(minor) => formatPrice(minor, currency)}
              disabled={submitting}
              externalError={promoRejection}
              collapsible
            />
          </div>
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
          </div>
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
              <Link href="/support" className="text-[12px] font-semibold text-accent">
                Contact support
              </Link>
            </div>
          </Card>
        </section>

        {guaranteeOpen && (
          <BuyerGuaranteeModal onClose={() => setGuaranteeOpen(false)} />
        )}

        <div className="h-28" />
      </div>

      {/* Sticky pay */}
      <div className="sticky bottom-0 border-t border-line bg-surface px-5 pb-7 pt-3.5">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-label">Total</span>
            <span className="font-mono text-[18px] font-semibold leading-none">
              {formatPrice(total, currency)}
            </span>
          </div>
          <button
            type="button"
            onClick={handlePay}
            disabled={payBlocker !== null || submitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-accent px-4 py-3.5 text-[14px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Starting payment…" : payBlocker ?? `Pay ${formatPrice(total, currency)}`}
            {!submitting && !payBlocker && <Icon name="arrowR" size={16} />}
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-ink-3">
          By paying you agree to the{" "}
          <Link href="/terms" className="font-semibold text-accent hover:underline">Terms</Link>
          {" "}and{" "}
          <Link href="/refund-policy" className="font-semibold text-accent hover:underline">refund policy</Link>.
        </p>
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
  return (
    <Modal open onOpenChange={(open) => { if (!open) onClose(); }}>
      <ModalContent title="Ticketiv buyer guarantee" size="sm">
        <p className="mb-4 text-[13px] text-ink-3">
          Every booking is backed by a clear set of promises.
        </p>
        <ul className="flex flex-col gap-3 text-[13px]">
          {[
            ["Authentic tickets, every time.", "Issued directly by the organizer. No resellers in the loop."],
            ["Refunded if the event is cancelled.", "Full refund, automatically, within 7 days."],
            ["Refund window honored.", "We enforce the organizer's published policy on your behalf."],
            ["Encrypted payment.", "Cards & mobile money, processed by certified providers."],
          ].map(([title, detail]) => (
            <li key={title} className="flex items-start gap-2.5">
              <Icon name="check" size={14} className="mt-0.5 shrink-0 text-success" />
              <div>
                <span className="font-semibold">{title}</span>{" "}
                <span className="text-ink-3">{detail}</span>
              </div>
            </li>
          ))}
        </ul>
        <ModalFooter className="-mx-5 -mb-5 mt-5">
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
        </ModalFooter>
      </ModalContent>
    </Modal>
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
