"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/quiet/ui/icon";
import { QuantityStepper } from "@/components/quiet/ui/form";
import { Modal, ModalContent } from "@/components/quiet/ui/modal";
import { trackBuyerFunnel } from "@/components/analytics/buyer-funnel";
import {
  createSeatHoldAction,
  loadTicketPickerAction,
  type TicketPickerData,
} from "@/app/(focused)/events/[id]/actions";
import {
  MAX_CART_QUANTITY,
  cartQuantity,
  clampCart,
  parseCartParam,
  serializeCart,
  ticketTypeLimit,
  type CartLine,
} from "@/lib/checkout/cart";
import { formatPrice, formatScarcityLabel } from "@/lib/format";

/* ──────────────────────────────────────────────────────────────
 * Ticket picker — the Eventbrite-style "Get tickets" step.
 *
 * Opens over the event page (centred dialog on md+, full-screen
 * sheet on phones), loads live availability, and lets the buyer
 * build a cart across ticket types. "Check out" posts the cart to
 * createSeatHoldAction, which starts the hold and opens checkout.
 * No sign-in is needed at any point.
 *
 * `?tickets=1[&items=…]` reopens the picker (Edit tickets from
 * checkout, or a failed / unavailable hold bounce-back).
 * ────────────────────────────────────────────────────────────── */

interface TicketPickerContextValue {
  open: (ticketTypeId?: string | null) => void;
}

const TicketPickerContext = React.createContext<TicketPickerContextValue | null>(null);

export function useTicketPicker(): TicketPickerContextValue {
  const ctx = React.useContext(TicketPickerContext);
  if (!ctx) throw new Error("useTicketPicker must be used inside <TicketPickerProvider>");
  return ctx;
}

type Notice = "unavailable" | "hold_failed" | null;

export function TicketPickerProvider({
  eventSlug,
  eventUuid,
  eventTitle,
  eventWhenLabel,
  children,
}: {
  eventSlug: string;
  eventUuid: string;
  eventTitle: string;
  eventWhenLabel: string;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [initialCart, setInitialCart] = React.useState<CartLine[]>([]);
  const [preselectId, setPreselectId] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<Notice>(null);

  const openFromLink = React.useCallback((cart: CartLine[], linkNotice: Notice) => {
    setInitialCart(cart);
    setPreselectId(null);
    setNotice(linkNotice);
    setIsOpen(true);
  }, []);

  const open = React.useCallback(
    (ticketTypeId?: string | null) => {
      setInitialCart([]);
      setPreselectId(ticketTypeId ?? null);
      setNotice(null);
      setIsOpen(true);
      trackBuyerFunnel("ticket_picker_open", {
        event_id: eventUuid,
        event_slug: eventSlug,
        ticket_type_id: ticketTypeId ?? null,
      });
    },
    [eventSlug, eventUuid],
  );

  const value = React.useMemo(() => ({ open }), [open]);

  return (
    <TicketPickerContext.Provider value={value}>
      {children}
      <React.Suspense fallback={null}>
        <TicketPickerDeepLink onOpen={openFromLink} />
      </React.Suspense>
      <Modal open={isOpen} onOpenChange={setIsOpen}>
        {isOpen && (
          <TicketPickerDialog
            eventSlug={eventSlug}
            eventUuid={eventUuid}
            eventTitle={eventTitle}
            eventWhenLabel={eventWhenLabel}
            initialCart={initialCart}
            preselectId={preselectId}
            notice={notice}
          />
        )}
      </Modal>
    </TicketPickerContext.Provider>
  );
}

/**
 * `?tickets=1[&items=…][&hold_failed=1|&unavailable=1]` opens the picker once,
 * then the flags are dropped from the URL so a refresh or share doesn't keep
 * re-opening it. Isolated (and Suspense-wrapped by the provider) so reading
 * search params doesn't opt the ISR event page into client rendering.
 */
function TicketPickerDeepLink({ onOpen }: { onOpen: (cart: CartLine[], notice: Notice) => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const query = searchParams?.toString() ?? "";
  const handledQuery = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (searchParams?.get("tickets") !== "1" || handledQuery.current === query) return;
    handledQuery.current = query;
    onOpen(
      parseCartParam(searchParams.get("items")),
      searchParams.get("hold_failed") === "1"
        ? "hold_failed"
        : searchParams.get("unavailable") === "1"
          ? "unavailable"
          : null,
    );
    const next = new URLSearchParams(searchParams.toString());
    for (const key of ["tickets", "items", "hold_failed", "unavailable"]) next.delete(key);
    const qs = next.toString();
    router.replace((qs ? `${pathname}?${qs}` : pathname) as "/", { scroll: false });
  }, [query, searchParams, pathname, router, onOpen]);

  return null;
}

const NOTICE_COPY: Record<Exclude<Notice, null>, string> = {
  unavailable: "Those tickets are no longer available. Pick again below.",
  hold_failed: "We couldn't reserve your tickets. Please try again.",
};

function TicketPickerDialog({
  eventSlug,
  eventUuid,
  eventTitle,
  eventWhenLabel,
  initialCart,
  preselectId,
  notice,
}: {
  eventSlug: string;
  eventUuid: string;
  eventTitle: string;
  eventWhenLabel: string;
  initialCart: CartLine[];
  preselectId: string | null;
  notice: Notice;
}) {
  const [data, setData] = React.useState<TicketPickerData | null>(null);
  const [loadFailed, setLoadFailed] = React.useState(false);
  const [quantities, setQuantities] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    let cancelled = false;
    loadTicketPickerAction(eventSlug)
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          setLoadFailed(true);
          return;
        }
        setData(result);
        // Seed the cart: a deep-linked cart wins, else the type the buyer
        // tapped on the event page, else a lone on-sale type at qty 1.
        const sellable = result.ticketTypes.filter((t) => ticketTypeLimit(t) !== 0);
        const seed: CartLine[] =
          initialCart.length > 0
            ? initialCart
            : preselectId
              ? [{ ticketTypeId: preselectId, quantity: 1 }]
              : sellable.length === 1
                ? [{ ticketTypeId: sellable[0].id, quantity: 1 }]
                : [];
        setQuantities(
          Object.fromEntries(
            clampCart(seed, result.ticketTypes).map((l) => [l.ticketTypeId, l.quantity]),
          ),
        );
      })
      .catch(() => !cancelled && setLoadFailed(true));
    return () => {
      cancelled = true;
    };
  }, [eventSlug, initialCart, preselectId]);

  const types = data?.ticketTypes ?? [];
  const cart = types
    .map((t) => ({ ticketTypeId: t.id, quantity: quantities[t.id] ?? 0 }))
    .filter((l) => l.quantity > 0);
  const totalQty = cartQuantity(cart);
  const currency = types[0]?.currency ?? "SZL";
  const subtotal = types.reduce((sum, t) => sum + t.priceMinor * (quantities[t.id] ?? 0), 0);
  // Buyers pay the ticket price; fees settle on the organizer side.
  const total = subtotal;
  const isFree = totalQty > 0 && total === 0;
  const allSoldOut = types.length > 0 && types.every((t) => ticketTypeLimit(t) === 0);

  return (
    <ModalContent
      title="Tickets"
      description={`Choose tickets for ${eventTitle}`}
      size="lg"
      className="max-md:inset-0 max-md:left-0 max-md:top-0 max-md:h-dvh max-md:w-full max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none max-md:border-0 md:max-h-[min(720px,calc(100dvh-4rem))]"
      footer={
        <form
          action={createSeatHoldAction}
          onSubmit={() =>
            trackBuyerFunnel("add_to_checkout", {
              event_id: eventUuid,
              event_slug: eventSlug,
              ticket_type_id: cart.length === 1 ? cart[0].ticketTypeId : null,
              quantity: totalQty,
              line_count: cart.length,
              surface: "ticket_picker",
            })
          }
          className="border-t border-line bg-surface px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"
        >
          <input type="hidden" name="eventSlug" value={eventSlug} />
          <input type="hidden" name="items" value={serializeCart(cart)} />
          {totalQty > 0 && (
            <div className="mb-3 flex flex-col gap-0.5">
              <SummaryRow label={`Subtotal · ${totalQty} ticket${totalQty === 1 ? "" : "s"}`} value={formatPrice(subtotal, currency)} />
              <div className="mt-1 flex items-center">
                <span className="flex-1 text-[14px] font-semibold">Total</span>
                <span className="font-mono text-[18px] font-semibold tabular-nums">{formatPrice(total, currency)}</span>
              </div>
            </div>
          )}
          <CheckoutButton disabled={totalQty === 0} isFree={isFree} />
          <p className="mt-2 text-center font-mono text-[11px] text-ink-3">
            No account needed · tickets are emailed to you
          </p>
        </form>
      }
    >
      <div className="mb-4">
        <p className="text-[15px] font-semibold leading-tight">{eventTitle}</p>
        <p className="mt-0.5 font-mono text-[11px] uppercase text-ink-3">{eventWhenLabel}</p>
      </div>

      {notice && (
        <div role="alert" className="mb-4 flex items-center gap-2 rounded-[var(--radius-md)] border border-danger/40 bg-danger-soft px-3 py-2.5 text-[13px] font-semibold text-danger">
          <Icon name="zap" size={15} />
          {NOTICE_COPY[notice]}
        </div>
      )}

      {!data && !loadFailed && (
        <ul className="flex flex-col gap-2" aria-busy="true" aria-label="Loading tickets">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-[72px] animate-pulse rounded-[var(--radius-md)] border border-line bg-surface-2" />
          ))}
        </ul>
      )}

      {loadFailed && (
        <p role="alert" className="rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-4 text-center text-[13px] text-ink-3">
          Tickets couldn&apos;t be loaded. Close this and try again.
        </p>
      )}

      {data && types.length === 0 && (
        <p className="rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-4 text-center text-[13px] text-ink-3">
          No tickets are on sale for this event right now.
        </p>
      )}

      {allSoldOut && (
        <p className="mb-3 text-[13px] font-semibold text-ink-2">This event is sold out.</p>
      )}

      <ul className="flex flex-col gap-2">
        {types.map((t) => {
          const qty = quantities[t.id] ?? 0;
          const limit = ticketTypeLimit(t);
          const unavailable = limit === 0;
          // A type can grow by whatever cart room remains, up to its own cap.
          const room = MAX_CART_QUANTITY - totalQty + qty;
          const max = Math.min(limit ?? MAX_CART_QUANTITY, room);
          const status =
            t.salesStatus === "paused"
              ? "Sales paused"
              : t.remaining === 0
                ? "Sold out"
                : formatScarcityLabel(t.remaining);
          const capNote = limit != null && !unavailable && qty >= limit && limit !== t.remaining
            ? `Max ${limit} per order`
            : null;
          return (
            <li
              key={t.id}
              className={
                "flex items-center gap-3 rounded-[var(--radius-md)] border p-3.5 transition-colors " +
                (unavailable
                  ? "border-line bg-surface-2 opacity-60"
                  : qty > 0
                    ? "border-accent bg-accent-soft"
                    : "border-line bg-surface")
              }
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-[14px] font-semibold">{t.name}</span>
                <span className={"font-mono text-[13px] tabular-nums " + (unavailable ? "text-ink-3 line-through" : "text-ink-2")}>
                  {formatPrice(t.priceMinor, t.currency)}
                </span>
                {(status || capNote) && (
                  <span className={"mt-0.5 font-mono text-[10px] font-semibold uppercase " + (unavailable ? "text-ink-3" : "text-accent")}>
                    {status ?? capNote}
                  </span>
                )}
              </div>
              {unavailable ? (
                <span className="font-mono text-[11px] font-semibold uppercase text-ink-3">Unavailable</span>
              ) : (
                <QuantityStepper
                  label={`${t.name} quantity`}
                  value={qty}
                  min={0}
                  max={Math.max(qty, max)}
                  onChange={(next) => setQuantities((prev) => ({ ...prev, [t.id]: next }))}
                />
              )}
            </li>
          );
        })}
      </ul>

      {totalQty >= MAX_CART_QUANTITY && (
        <p className="mt-3 font-mono text-[11px] text-ink-3">
          Up to {MAX_CART_QUANTITY} tickets per order.
        </p>
      )}
    </ModalContent>
  );
}

function CheckoutButton({ disabled, isFree }: { disabled: boolean; isFree: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-accent px-4 py-3.5 text-[14px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Reserving your tickets…" : disabled ? "Select tickets" : isFree ? "Register" : "Check out"}
      {!pending && !disabled && <Icon name="arrowR" size={16} />}
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center">
      <span className="flex-1 font-mono text-[12px] text-ink-3">{label}</span>
      <span className="font-mono text-[12px] tabular-nums text-ink">{value}</span>
    </div>
  );
}
