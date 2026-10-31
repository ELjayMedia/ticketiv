"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { startCheckoutAction } from "@/app/(focused)/events/[id]/checkout/actions";
import { describePromoFailure } from "@/lib/checkout/promo-copy";
import { trackBuyerFunnel } from "@/components/analytics/buyer-funnel";
import {
  cartSubtotalMinor,
  promoDiscountMinor,
  type CheckoutCartLine,
} from "@/lib/checkout/pricing";
import type { PromoResult } from "@/components/quiet/screens/checkout/promo-code-input";
import {
  isContactComplete,
  type ContactValues,
} from "@/components/quiet/screens/checkout/contact-section";

/**
 * Shared checkout state for the mobile and desktop screens: contact details,
 * promo, policy acceptance, the quoted total and submission.
 *
 * The quote mirrors what the order RPC charges — the ticket subtotal less any
 * promo. Booking fees are settled from the organizer side, not added to the
 * buyer's total. A zero total is a free registration: no payment step.
 */
export function useCheckout({
  eventId,
  eventUuid,
  lines,
  isGuest,
  defaultContact,
  surface,
}: {
  eventId: string;
  eventUuid: string;
  lines: ReadonlyArray<CheckoutCartLine>;
  isGuest: boolean;
  defaultContact: Partial<ContactValues>;
  surface: "mobile_checkout" | "desktop_checkout";
}) {
  const router = useRouter();
  const [contact, setContact] = React.useState<ContactValues>({
    firstName: defaultContact.firstName ?? "",
    lastName: defaultContact.lastName ?? "",
    email: defaultContact.email ?? "",
    confirmEmail: defaultContact.confirmEmail ?? "",
  });
  const [showErrors, setShowErrors] = React.useState(false);
  const [promo, setPromo] = React.useState<PromoResult | null>(null);
  const [promoError, setPromoError] = React.useState<string | null>(null);
  const [accepted, setAccepted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const items = lines.map((l) => ({ ticketTypeId: l.ticketTypeId, quantity: l.quantity }));
  const totalQuantity = items.reduce((sum, l) => sum + l.quantity, 0);
  const currency = lines[0]?.currency ?? "SZL";
  const subtotal = cartSubtotalMinor(lines);
  const discount = promoDiscountMinor(subtotal, promo);
  const total = subtotal - discount;
  const isFree = subtotal === 0;
  const contactComplete = isContactComplete(contact, isGuest);

  function track(event: "checkout_error" | "payment_redirect", props: Record<string, unknown>) {
    trackBuyerFunnel(event, { event_id: eventUuid, event_slug: eventId, surface, ...props });
  }

  async function submit() {
    setSubmitError(null);
    if (!contactComplete) {
      setShowErrors(true);
      setSubmitError("Check your contact details above.");
      return;
    }
    if (!accepted) {
      setSubmitError("Accept the refund policy and terms to continue.");
      return;
    }
    setSubmitting(true);
    const result = await startCheckoutAction({
      eventId: eventUuid,
      buyerEmail: contact.email.trim(),
      buyerFirstName: contact.firstName,
      buyerLastName: contact.lastName,
      items,
      promoCode: promo?.code ?? null,
    });
    if (!result.ok) {
      setSubmitError(result.error);
      track("checkout_error", { reason: result.error });
      setSubmitting(false);
      return;
    }
    if (result.promo && !result.promo.applied) {
      // The order exists but the code didn't stick at order time; let the
      // buyer drop or fix it rather than silently charging full price.
      setPromo(null);
      setPromoError(describePromoFailure(result.promo.reason));
      track("checkout_error", { reason: `promo_${result.promo.reason}` });
      setSubmitting(false);
      return;
    }
    track("payment_redirect", {
      ticket_type_id: lines.length === 1 ? lines[0].ticketTypeId : null,
      quantity: totalQuantity,
      line_count: lines.length,
      total_minor: total,
      provider: result.provider,
    });
    if (result.checkoutUrl) {
      window.location.assign(result.checkoutUrl);
    } else {
      router.push(`/orders/${result.orderId}/confirmation`);
    }
  }

  return {
    contact,
    setContact,
    showErrors,
    promo,
    setPromo: (next: PromoResult | null) => {
      setPromo(next);
      setPromoError(null);
    },
    promoError,
    accepted,
    setAccepted,
    submitting,
    submitError,
    currency,
    subtotal,
    discount,
    total,
    isFree,
    totalQuantity,
    contactComplete,
    submit,
  };
}
