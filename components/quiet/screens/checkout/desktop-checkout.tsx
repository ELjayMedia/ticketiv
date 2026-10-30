"use client";

import * as React from "react";
import Link from "next/link";
import { Icon } from "@/components/quiet/ui/icon";
import { Card } from "@/components/quiet/ui/card";
import { Photo, Divider } from "@/components/quiet/ui/primitives";
import { Button } from "@/components/quiet/ui/button";
import { RadioCard, Stepper } from "@/components/quiet/ui/form";
import { useRouter } from "next/navigation";
import { formatPrice, formatHoldTimer } from "@/lib/format";
import { useEventLiveStats } from "@/lib/hooks/use-event-live-stats";
import { PromoCodeInput } from "@/components/quiet/screens/checkout/promo-code-input";
import { ContactSection } from "@/components/quiet/screens/checkout/contact-section";
import { useCheckout } from "@/components/quiet/screens/checkout/use-checkout";
import type { CheckoutCartLine } from "@/lib/checkout/pricing";

/* ──────────────────────────────────────────────────────────────
 * Desktop checkout · `/events/[id]/checkout` on md+
 *
 * Eventbrite-style single page: contact information (guest-friendly,
 * optional log in), promo and payment in the left column; a sticky
 * order summary with the hold timer on the right. Free carts skip
 * payment and register directly.
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
  paymentMethods?: ReadonlyArray<{ id: string; label: string; sub: string; type: "card" | "mobile_money" | "ewallet" }>;
  holdSeconds?: number;
  /** No session, or an anonymous guest session from an earlier visit. */
  isGuest?: boolean;
  /** Log in and come straight back to this checkout. */
  loginHref?: string;
  defaultBuyerEmail?: string;
  defaultBuyerFirstName?: string;
  defaultBuyerLastName?: string;
}

export function DesktopCheckout({
  eventId,
  eventUuid,
  eventTitle,
  eventPhoto,
  eventWhenLabel,
  seats = [],
  lines,
  editTicketsHref,
  paymentMethods = [],
  holdSeconds = 522,
  isGuest = true,
  loginHref = "/login",
  defaultBuyerEmail = "",
  defaultBuyerFirstName = "",
  defaultBuyerLastName = "",
}: DesktopCheckoutProps) {
  const router = useRouter();
  const checkout = useCheckout({
    eventId,
    eventUuid,
    lines,
    isGuest,
    defaultContact: {
      firstName: defaultBuyerFirstName,
      lastName: defaultBuyerLastName,
      email: defaultBuyerEmail,
    },
    surface: "desktop_checkout",
  });
  const { currency, discount, total, isFree, submitting } = checkout;
  const [paymentId, setPaymentId] = React.useState(paymentMethods[0]?.id);
  const [holdRemaining, setHoldRemaining] = React.useState(holdSeconds);
  const [guaranteeOpen, setGuaranteeOpen] = React.useState(false);
  const steps = isFree
    ? [{ label: "Tickets" }, { label: "Details" }, { label: "Done" }]
    : [{ label: "Tickets" }, { label: "Details" }, { label: "Payment" }, { label: "Done" }];

  const { stats: liveStats } = useEventLiveStats(eventId);
  const lastStatsAtRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!liveStats?.updated_at) return;
    if (lastStatsAtRef.current && lastStatsAtRef.current !== liveStats.updated_at) {
      router.refresh();
    }
    lastStatsAtRef.current = liveStats.updated_at ?? null;
  }, [liveStats?.updated_at, router]);

  // Hold expiry returns the buyer to the event page (TICK-200 parity with mobile).
  React.useEffect(() => {
    if (holdSeconds <= 0) return;
    if (holdRemaining <= 0) router.replace(`/events/${eventId}?hold_expired=1`);
  }, [holdRemaining, holdSeconds, eventId, router]);

  useHoldExtension(holdRemaining, setHoldRemaining, holdSeconds);

  React.useEffect(() => {
    if (holdRemaining <= 0) return;
    const i = setInterval(() => setHoldRemaining((s) => s - 1), 1000);
    return () => clearInterval(i);
  }, [holdRemaining]);

  const ctaLabel = submitting
    ? isFree ? "Registering…" : "Starting payment…"
    : isFree ? "Register" : `Pay ${formatPrice(total, currency)}`;

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
          <Stepper steps={steps} currentIndex={1} />
          <span className="h-4 w-px bg-line" />
          <DesktopHoldTimerLabel remaining={holdRemaining} />
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto grid max-w-[1100px] grid-cols-[1fr_360px] items-start gap-8 px-10 py-8">
        {/* ── Form column ─────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <h2 className="mb-3.5 text-[18px] font-semibold tracking-[-0.02em]">
              Contact information
            </h2>
            <ContactSection
              idPrefix="d-contact"
              layout="grid"
              values={checkout.contact}
              onChange={checkout.setContact}
              isGuest={isGuest}
              loginHref={loginHref}
              disabled={submitting}
              showErrors={checkout.showErrors}
            />
          </Card>

          {!isFree && (
            <Card className="p-5">
              <h2 className="mb-1 text-[18px] font-semibold tracking-[-0.02em]">Payment</h2>
              <p className="mb-3.5 font-mono text-[11px] text-ink-3">
                Only methods accepted by this organizer are shown.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {paymentMethods.map((p) => (
                  <RadioCard
                    key={p.id}
                    name="payment"
                    value={p.id}
                    selected={paymentId === p.id}
                    onChange={setPaymentId}
                    title={p.label}
                    subtitle={p.sub}
                  />
                ))}
              </div>
              <div className="mt-4">
                <PromoCodeInput eventId={eventUuid} onApply={checkout.setPromo} />
                {checkout.promoError && (
                  <p role="alert" className="mt-1.5 text-[12px] text-danger">{checkout.promoError}</p>
                )}
              </div>
            </Card>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-2 text-[12px] text-ink-3">
              <input
                id="desktop-policy-acceptance"
                type="checkbox"
                checked={checkout.accepted}
                onChange={(e) => checkout.setAccepted(e.target.checked)}
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
            {checkout.submitError && (
              <div role="alert" className="rounded-md border border-danger/40 bg-danger-soft px-3 py-2 text-[12px] text-danger">
                {checkout.submitError}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                className="flex-1"
                onClick={() => router.push(editTicketsHref as "/")}
              >
                Back
              </Button>
              <button
                type="button"
                onClick={checkout.submit}
                disabled={submitting || holdRemaining <= 0}
                className="flex flex-[2] items-center justify-center gap-2 rounded-[var(--radius-md)] bg-accent px-4 py-2.5 text-[14px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {ctaLabel}
                {!submitting && <Icon name="arrowR" size={14} />}
              </button>
            </div>
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
            {discount > 0 && checkout.promo && (
              <SummaryRow
                label={`Promo ${checkout.promo.code}`}
                value={`−${formatPrice(discount, currency)}`}
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
                  ? "Your hold has expired. Pick your tickets again to continue."
                  : `Your tickets are held for ${formatHoldTimer(holdRemaining)}`}
              </span>
            </div>
          </div>

          <div className="mt-3 rounded-md border border-line bg-bg p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold">
              <Icon name="check" size={12} className="text-success" />
              {isFree ? "Free registration" : "Secure checkout"}
            </div>
            <p className="font-mono text-[10px] leading-relaxed text-ink-3">
              Tickets emailed to you · no account needed · refund policy per organizer.
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
