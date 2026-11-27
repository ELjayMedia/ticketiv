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
import { cartSubtotalMinor, checkoutTotalMinor, type CheckoutCartLine } from "@/lib/checkout/pricing";
import { checkoutPayBlocker } from "@/lib/checkout/pay-blocker";
import { useEventLiveStats } from "@/lib/hooks/use-event-live-stats";
import { startCheckoutAction } from "@/app/(focused)/events/[id]/checkout/actions";
import { describePromoFailure } from "@/lib/checkout/promo-copy";
import { PromoCodeInput, promoDiscountMinor, type AppliedPromo } from "@/components/quiet/screens/checkout/promo-code-input";
import { trackBuyerFunnel } from "@/components/analytics/buyer-funnel";
import { BrandLockup } from "@/components/brand/brand-mark";
import {
  DesktopPaymentMethodPicker,
  useCheckoutPaymentMethods,
} from "@/components/quiet/screens/checkout/checkout-provider-bridge";

/* ──────────────────────────────────────────────────────────────
 * Desktop checkout · `/events/[id]/checkout` on md+
 *
 * Cart → Details → Payment → Done. This screen is Details; payment
 * happens with the provider after "Continue to payment".
 *
 * Right column is a sticky 360-px order summary. Left column asks
 * only for what the order uses: where to send the tickets and how to
 * pay. A promo code sits behind a link.
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
  /** Cart from the ticket picker, already clamped to live availability. */
  lines: ReadonlyArray<CheckoutCartLine>;
  /** Back to the event page's ticket picker with this cart preloaded. */
  editTicketsHref: string;
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
  lines,
  editTicketsHref,
  holdSeconds = 522,
  defaultBuyerEmail = "",
}: DesktopCheckoutProps) {
  const router = useRouter();
  const items = lines.map((l) => ({ ticketTypeId: l.ticketTypeId, quantity: l.quantity }));
  const quantity = items.reduce((sum, l) => sum + l.quantity, 0);
  const currency = lines[0]?.currency ?? "SZL";
  const subtotalMinor = cartSubtotalMinor(lines);
  const [holdRemaining, setHoldRemaining] = React.useState(holdSeconds);
  const [guaranteeOpen, setGuaranteeOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [buyerEmail, setBuyerEmail] = React.useState(defaultBuyerEmail);
  const [promoFeedback, setPromoFeedback] = React.useState<string | null>(null);
  // The one promo control: previewed without creating an order, sent by code at payment.
  const [promo, setPromo] = React.useState<AppliedPromo | null>(null);

  async function handleContinueToPayment() {
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
        surface: "desktop_checkout",
      });
      setSubmitting(false);
      return;
    }
    // The preview passed but the order-time check refused the code. Stop before
    // payment so the buyer is never charged a total that differs from the screen.
    if (result.promo && !result.promo.applied) {
      setPromo(null);
      setPromoFeedback(`${describePromoFailure(result.promo.reason)} Your total has been updated; continue again to pay without it.`);
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
      ticket_type_id: lines.length === 1 ? lines[0].ticketTypeId : null,
      quantity,
      line_count: lines.length,
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

  const promoDiscount = promoDiscountMinor(promo, subtotalMinor);
  const total = checkoutTotalMinor(subtotalMinor, promoDiscount);
  const payBlocker = checkoutPayBlocker({ buyerEmail, holdRemaining, lineCount: lines.length });

  return (
    <div className="min-h-dvh bg-bg">
      {/* Top nav with stepper */}
      <div className="border-b border-line bg-surface">
        <div className="page-frame flex items-center gap-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <BrandLockup />
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
      <div className="page-frame grid grid-cols-[1fr_360px] items-start gap-8 py-8">
        {/* ── Form column ─────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Where the tickets go — the only detail the order uses. */}
          <Card className="p-5">
            <h2 className="mb-1 text-[18px] font-semibold tracking-[-0.02em]">
              Send tickets to
            </h2>
            <p className="mb-3.5 font-mono text-[11px] text-ink-3">
              Your {quantity === 1 ? "ticket" : `${quantity} tickets`} and receipt go to this email.
            </p>
            <FormField
              label="Email"
              type="email"
              value={buyerEmail}
              onChange={(e) => setBuyerEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus={!defaultBuyerEmail}
              disabled={submitting}
            />
            <div className="mt-3">
              <PromoCodeInput
                eventId={eventUuid}
                value={promo}
                onChange={(next) => {
                  setPromo(next);
                  setPromoFeedback(null);
                }}
                savingMinor={promoDiscount}
                formatSaving={(minor) => formatPrice(minor, currency)}
                disabled={submitting}
                externalError={promoFeedback}
                collapsible
              />
            </div>
          </Card>

          <DesktopPaymentMethodCard />

          <div className="flex flex-col gap-2">
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
                disabled={submitting || payBlocker !== null}
                className="flex flex-[2] items-center justify-center gap-2 rounded-[var(--radius-md)] bg-accent px-4 py-2.5 text-[14px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Starting payment…" : payBlocker ?? "Continue to payment"}
                {!submitting && !payBlocker && <Icon name="arrowR" size={14} />}
              </button>
            </div>
            <p className="text-center text-[12px] text-ink-3">
              By continuing you agree to the{" "}
              <Link href="/terms" className="font-semibold text-accent hover:underline">Terms</Link>
              {" "}and{" "}
              <Link href="/refund-policy" className="font-semibold text-accent hover:underline">refund &amp; cancellation policy</Link>.
            </p>
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
            <div className="mb-1 flex items-center">
              <span className="text-label flex-1">Your tickets</span>
              <Link href={editTicketsHref} className="text-[12px] font-semibold text-accent hover:underline">
                Edit
              </Link>
            </div>
            {lines.map((l) => (
              <SummaryRow
                key={l.ticketTypeId}
                label={`${l.quantity} × ${l.name}`}
                value={formatPrice(l.priceMinor * l.quantity, l.currency)}
              />
            ))}
            {promo && promoDiscount > 0 && (
              <SummaryRow
                label={`Promo ${promo.code}`}
                value={`−${formatPrice(promoDiscount, currency)}`}
                accent
              />
            )}
          </div>

          <Divider />

          <div className="mt-3 flex items-center">
            <span className="flex-1 text-[14px] font-semibold">Total</span>
            <span className="font-mono text-[20px] font-semibold">
              {formatPrice(total, currency)}
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
                href="/support"
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

function DesktopPaymentMethodCard() {
  if (useCheckoutPaymentMethods().length === 0) return null;
  return (
    <Card className="p-5">
      <div className="mb-3.5">
        <h2 className="text-[18px] font-semibold tracking-[-0.02em]">Payment method</h2>
        <p className="mt-0.5 font-mono text-[11px] text-ink-3">
          Choose how you want to pay. Only methods accepted by this organizer are shown.
        </p>
      </div>
      <DesktopPaymentMethodPicker />
    </Card>
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
