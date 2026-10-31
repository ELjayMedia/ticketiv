"use client";

import * as React from "react";
import Link from "next/link";
import { Icon } from "@/components/quiet/ui/icon";
import { Card } from "@/components/quiet/ui/card";
import { Photo, Divider } from "@/components/quiet/ui/primitives";
import { RadioCard } from "@/components/quiet/ui/form";
import { Modal, ModalContent, ModalFooter } from "@/components/quiet/ui/modal";
import { useRouter } from "next/navigation";
import { formatPrice, formatHoldTimer } from "@/lib/format";
import { useEventLiveStats } from "@/lib/hooks/use-event-live-stats";
import { PromoCodeInput } from "@/components/quiet/screens/checkout/promo-code-input";
import { ContactSection } from "@/components/quiet/screens/checkout/contact-section";
import { useCheckout } from "@/components/quiet/screens/checkout/use-checkout";
import type { CheckoutCartLine } from "@/lib/checkout/pricing";

/* ──────────────────────────────────────────────────────────────
 * Mobile checkout · `/events/[id]/checkout` on phones.
 *
 * Single column, Eventbrite-style: tickets (chosen in the picker,
 * editable), contact information (guest-friendly, optional log in),
 * promo, payment, then a sticky Pay / Register bar. The hold timer
 * decrements client-side and returns to the event page on expiry.
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
  /** No session, or an anonymous guest session from an earlier visit. */
  isGuest?: boolean;
  /** Log in and come straight back to this checkout. */
  loginHref?: string;
  defaultBuyerEmail?: string;
  defaultBuyerFirstName?: string;
  defaultBuyerLastName?: string;
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
  isGuest = true,
  loginHref = "/login",
  defaultBuyerEmail = "",
  defaultBuyerFirstName = "",
  defaultBuyerLastName = "",
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
    surface: "mobile_checkout",
  });
  const { currency, subtotal, discount, total, isFree, submitting } = checkout;
  const [paymentId, setPaymentId] = React.useState(paymentMethods[0]?.id);
  const [holdRemaining, setHoldRemaining] = React.useState(holdSeconds);
  const [guaranteeOpen, setGuaranteeOpen] = React.useState(false);

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

  const ctaLabel = submitting
    ? isFree ? "Registering…" : "Starting payment…"
    : isFree ? "Register" : `Pay ${formatPrice(total, currency)}`;

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
            <span className="text-[15px] font-semibold">{isFree ? "Register" : "Checkout"}</span>
            <HoldTimerLabel remaining={holdRemaining} />
          </div>
          <Link
            href="/help"
            className="font-mono text-[10px] font-semibold uppercase text-ink-3 hover:text-ink"
          >
            Help
          </Link>
        </header>

        {/* Progress indicator: Tickets (done in the picker) → Details → Payment → Done */}
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
        </div>

        {/* Your tickets — chosen in the picker; edit goes back there. */}
        <section className="px-5 pb-5">
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
          </Card>
        </section>

        {/* Contact information */}
        <section className="px-5 pb-5">
          <h2 className="mb-3 text-[16px] font-semibold tracking-[-0.01em]">Contact information</h2>
          <ContactSection
            idPrefix="m-contact"
            values={checkout.contact}
            onChange={checkout.setContact}
            isGuest={isGuest}
            loginHref={loginHref}
            disabled={submitting}
            showErrors={checkout.showErrors}
          />
        </section>

        {/* Promo */}
        {!isFree && (
          <section className="px-5 pb-5">
            <PromoCodeInput eventId={eventUuid} onApply={checkout.setPromo} />
            {checkout.promoError && (
              <p role="alert" className="mt-1.5 text-[12px] text-danger">{checkout.promoError}</p>
            )}
          </section>
        )}

        {/* Payment */}
        {!isFree && (
          <section className="px-5 pb-5">
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
        )}

        {/* Summary */}
        <section className="px-5 pb-4">
          <Card className="bg-bg p-3.5" flat>
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
            <Divider className="my-2" />
            <div className="flex items-center">
              <span className="flex-1 text-[14px] font-semibold">Total</span>
              <span className="font-mono text-[16px] font-semibold">
                {formatPrice(total, currency)}
              </span>
            </div>
          </Card>
        </section>

        {/* Reassurance block */}
        <section className="px-5 pb-4">
          <Card className="bg-bg p-3.5" flat>
            <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold">
              <Icon name="check" size={14} className="text-success" />
              {isFree ? "Free registration" : "Secure checkout"}
            </div>
            <ul className="flex flex-col gap-1 font-mono text-[11px] text-ink-3">
              {!isFree && <li>Encrypted payment · cards & mobile money</li>}
              <li>Tickets emailed to you · no account needed</li>
              <li>Refund window per organizer policy</li>
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

        {/* Terms */}
        <div className="flex items-start gap-2 px-5 pb-4 text-[11px] text-ink-3">
          <input
            id="mobile-policy-acceptance"
            type="checkbox"
            checked={checkout.accepted}
            onChange={(e) => checkout.setAccepted(e.target.checked)}
            className="mt-0.5 accent-accent"
          />
          <span>
            <label htmlFor="mobile-policy-acceptance">I accept the </label>
            <Link href="/refund-policy" className="font-semibold text-accent hover:underline">
              refund &amp; cancellation policy
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="font-semibold text-accent hover:underline">
              Terms
            </Link>
          </span>
        </div>

        <div className="h-20" />
      </div>

      {checkout.submitError && (
        <div
          role="alert"
          className="border-t border-danger/40 bg-danger-soft px-5 py-2 text-[12px] text-danger"
        >
          {checkout.submitError}
        </div>
      )}
      {/* Sticky pay / register */}
      <div className="sticky bottom-0 flex items-center gap-3 border-t border-line bg-surface px-5 py-3.5 pb-7">
        <div className="flex flex-col">
          <span className="text-label">Total</span>
          <span className="font-mono text-[18px] font-semibold leading-none">
            {formatPrice(total, currency)}
          </span>
        </div>
        <button
          type="button"
          onClick={checkout.submit}
          disabled={holdRemaining <= 0 || submitting || lines.length === 0}
          className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-accent px-4 py-3.5 text-[14px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {ctaLabel}
          {!submitting && <Icon name="arrowR" size={16} />}
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
