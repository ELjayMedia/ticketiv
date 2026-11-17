"use client";

import * as React from "react";

import { Icon } from "@/components/quiet/ui/icon";
import { isCheckoutProvider, PAYMENT_PROVIDER_CATALOG } from "@/lib/payments/providers/catalog";

/**
 * Per-ticket payment methods. By default a ticket type takes every method the
 * event accepts; the organiser can instead limit it to specific methods (say,
 * MoMo only for a door-price ticket). Server routes re-check everything.
 */

export interface TicketPaymentOption {
  id: string;
  label: string;
  sub: string;
  /** Switched on and set up on the platform. */
  configured: boolean;
}

export interface TicketPaymentOptions {
  options: TicketPaymentOption[];
  /** The event's own list; empty = every method. */
  eventProviders: string[];
}

/** Loads the methods this event can offer, once per event. */
export function useTicketPaymentOptions(eventId: string): TicketPaymentOptions | null {
  const [state, setState] = React.useState<TicketPaymentOptions | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    fetch(`/api/events/${eventId}/policies`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (cancelled || !payload) return;
        const options: TicketPaymentOption[] = (Array.isArray(payload.providerOptions) ? payload.providerOptions : [])
          .filter((option: any) => isCheckoutProvider(option?.id))
          .map((option: any) => ({
            id: String(option.id),
            label: String(option.label ?? option.id),
            sub: String(option.sub ?? ""),
            configured: Boolean(option.configured ?? (option.enabled && option.operational)),
          }));
        const eventProviders = Array.isArray(payload.event?.payment_providers) ? payload.event.payment_providers.map(String) : [];
        setState({ options, eventProviders });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [eventId]);
  return state;
}

function takesCurrency(id: string, currency: string) {
  if (!isCheckoutProvider(id) || !currency) return true;
  return (PAYMENT_PROVIDER_CATALOG[id].currencies as readonly string[]).includes(currency.toUpperCase());
}

export function TicketPaymentMethodsField({
  data,
  value,
  onChange,
  currency,
  disabled,
}: {
  data: TicketPaymentOptions | null;
  /** Empty = all methods (the default). */
  value: string[];
  onChange: (next: string[]) => void;
  currency: string;
  disabled?: boolean;
}) {
  // Remember the last specific choice so switching back from "All" restores it.
  const [lastSpecific, setLastSpecific] = React.useState<string[]>(value);
  const specific = value.length > 0;

  if (!data) {
    return <p className="text-[12px] text-ink-3">Loading payment methods…</p>;
  }

  const eventLock = data.eventProviders;
  // Methods this event accepts at all; the rest aren't offered here.
  const options = data.options.filter((o) => eventLock.length === 0 || eventLock.includes(o.id));
  const usable = (o: TicketPaymentOption) => o.configured && takesCurrency(o.id, currency);
  const allLabels = options.filter(usable).map((o) => o.label);

  function choose(mode: "all" | "specific") {
    if (mode === "all") {
      if (specific) setLastSpecific(value);
      onChange([]);
      return;
    }
    const restore = lastSpecific.filter((id) => options.some((o) => o.id === id && usable(o)));
    const first = options.find(usable);
    onChange(restore.length > 0 ? restore : first ? [first.id] : []);
  }

  function toggle(id: string) {
    const next = value.includes(id) ? value.filter((v) => v !== id) : [...value, id];
    // Unticking the last method means "all methods" again, never "none".
    onChange(next);
    if (next.length > 0) setLastSpecific(next);
  }

  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="text-label mb-1">Payment methods</legend>
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Payment methods for this ticket">
        {(["all", "specific"] as const).map((mode) => {
          const active = mode === "all" ? !specific : specific;
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => choose(mode)}
              className={`flex flex-col items-start gap-0.5 rounded-[var(--radius)] border px-3 py-2.5 text-left transition-colors ${
                active ? "border-ink bg-surface-2" : "border-line-2 bg-surface hover:border-ink"
              }`}
            >
              <span className="flex items-center gap-2 text-[13px] font-semibold">
                <span
                  aria-hidden
                  className={`inline-flex h-4 w-4 items-center justify-center rounded-full border ${active ? "border-ink bg-ink text-surface" : "border-line-2"}`}
                >
                  {active ? <Icon name="check" size={10} /> : null}
                </span>
                {mode === "all" ? "All payment methods" : "Only specific methods"}
              </span>
              <span className="pl-6 text-[12px] text-ink-3">
                {mode === "all"
                  ? allLabels.length > 0
                    ? `Buyers choose from ${allLabels.join(", ")}.`
                    : "Every method the event accepts."
                  : "Limit this ticket to the methods you pick."}
              </span>
            </button>
          );
        })}
      </div>

      {specific ? (
        <div className="flex flex-col gap-1.5 rounded-[var(--radius)] border border-line bg-bg p-2">
          {options.map((o) => {
            const checked = value.includes(o.id);
            const currencyOk = takesCurrency(o.id, currency);
            const blocked = !o.configured || !currencyOk;
            return (
              <label
                key={o.id}
                className={`flex min-h-11 items-center gap-3 rounded-[var(--radius)] px-2.5 py-2 ${
                  blocked && !checked ? "opacity-60" : "cursor-pointer hover:bg-surface"
                }`}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--color-accent)]"
                  checked={checked}
                  disabled={blocked && !checked}
                  onChange={() => toggle(o.id)}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[13px] font-semibold">{o.label}</span>
                  <span className={`text-[12px] ${blocked ? "text-warning" : "text-ink-3"}`}>
                    {!currencyOk
                      ? `Doesn't take ${currency.toUpperCase()}`
                      : !o.configured
                        ? "Not available on Ticketiv yet"
                        : o.sub}
                  </span>
                </span>
              </label>
            );
          })}
          <p className="px-2.5 pb-1 text-[12px] text-ink-3">
            Buyers can only put this ticket in an order with tickets that share one of these methods.
          </p>
        </div>
      ) : null}
    </fieldset>
  );
}
