import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MobileCheckout } from "@/components/quiet/screens/checkout/mobile-checkout";
import { DesktopCheckout } from "@/components/quiet/screens/checkout/desktop-checkout";
import { CheckoutProviderBridge } from "@/components/quiet/screens/checkout/checkout-provider-bridge";
import { CheckoutStartTracker } from "@/components/analytics/buyer-funnel";
import { getPublicEventBySlug } from "@/lib/adapters/events";
import {
  CHECKOUT_VAT_RATE,
  bookingFeeFor,
  cartSubtotalMinor,
  mapCheckoutCartLines,
  mapCheckoutEvent,
  mapCheckoutTicketType,
} from "@/lib/mappers/checkout";
import { loadCheckoutAvailability } from "@/lib/checkout/availability";
import { clampCart, parseCartParam, serializeCart, type CartLine } from "@/lib/checkout/cart";
import { getEffectivePaymentMethodsForEvent } from "@/lib/payments/availability";
import {
  createPaymentChannelUnavailableError,
  reportPaymentChannelUnavailable,
} from "@/lib/payments/errors";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deriveEventLifecycle } from "@/lib/events/lifecycle";

/**
 * `/events/[id]/checkout`
 *
 * `[id]` is the event slug. The cart arrives from the ticket picker as
 * `?hold=…&items=typeId:qty,…`; it is re-clamped against live availability
 * here and handed to the screens as priced lines. Editing tickets goes back
 * to the picker (`/events/[id]?tickets=1&items=…`) rather than re-picking
 * inside checkout. Legacy `?tt=&qty=` links still resolve to a cart.
 */
export const metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ hold?: string; items?: string; tt?: string; qty?: string }>;
}) {
  const { id } = await params;
  const { hold: holdCode, items: itemsParam, tt, qty } = await searchParams;

  const supabase = await createServerSupabaseClient();

  // Resolve slug → UUID
  const { data: eventRow } = supabase
    ? await supabase.from("events").select("id").eq("slug", id).maybeSingle()
    : { data: null };
  if (!eventRow?.id) redirect("/browse");

  const eventUuidFromSlug = eventRow.id;

  // Validate the hold when a code is present. The Get Tickets button creates a
  // hold via fn_create_seat_hold and appends ?hold= to this URL. Callers without
  // a hold code (e.g. hold creation failure) fall through with holdSeconds = 0.
  // Admin client is required because seat_holds has no SELECT RLS policy.
  let holdSeconds = 0;
  let holdCart: CartLine[] = [];
  if (holdCode) {
    const admin = createAdminClient();
    const { data: hold } = await admin
      .from("seat_holds")
      .select("id, expires_at, ticket_type_id, quantity")
      .eq("hold_code", holdCode)
      .eq("event_id", eventUuidFromSlug)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (!hold) redirect(`/events/${id}?hold_expired=1`);

    holdSeconds = Math.max(
      0,
      Math.floor((new Date(hold.expires_at ?? "").getTime() - Date.now()) / 1000),
    );
    if (hold.ticket_type_id) {
      holdCart = [{ ticketTypeId: hold.ticket_type_id, quantity: hold.quantity }];
    }
  }

  const row = await getPublicEventBySlug(id);
  if (!row) notFound();
  const lifecycle = deriveEventLifecycle({
    status: row.status,
    eventStartsAt: row.starts_at,
    eventEndsAt: row.event_ends_at,
  });
  if (lifecycle === "ended" || lifecycle === "cancelled") {
    redirect(`/events/${id}?${lifecycle}=1`);
  }

  const sharedProps = mapCheckoutEvent(row);
  const [{ ticketTypes, plan }, paymentMethods] = await Promise.all([
    loadCheckoutAvailability(row.id),
    getEffectivePaymentMethodsForEvent(row.id),
  ]);

  // Prefill the buyer-email field when the buyer is already signed in (and
  // their account carries a real address — not an anonymous guest from a
  // previous visit). Empty otherwise; the UI collects it from guests.
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const defaultBuyerEmail = user?.email ?? "";
  let defaultBuyerName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    "";
  let defaultBuyerPhone =
    (user?.user_metadata?.phone as string | undefined) ??
    (user?.user_metadata?.phone_number as string | undefined) ??
    user?.phone ??
    "";

  if (user) {
    const { data: profile } = await supabase!
      .from("profiles")
      .select("name, surname, display_name, phone")
      .eq("user_id", user.id)
      .maybeSingle();
    const profileName = [profile?.name, profile?.surname].filter(Boolean).join(" ");
    defaultBuyerName = profile?.display_name ?? (profileName || defaultBuyerName);
    defaultBuyerPhone = profile?.phone ?? defaultBuyerPhone;
  }

  const mappedTypes = ticketTypes.map(mapCheckoutTicketType);
  const requestedCart =
    parseCartParam(itemsParam).length > 0
      ? parseCartParam(itemsParam)
      : tt
        ? [{ ticketTypeId: tt, quantity: Math.max(1, Number(qty) || 1) }]
        : holdCart;
  const cart = clampCart(requestedCart, mappedTypes);
  // Nothing (left) to buy — send the buyer back to the picker with whatever
  // they had, so they can choose again instead of paying for nothing.
  if (cart.length === 0) {
    const pickerParams = new URLSearchParams({ tickets: "1" });
    if (requestedCart.length > 0) {
      pickerParams.set("items", serializeCart(requestedCart));
      pickerParams.set("unavailable", "1");
    }
    redirect(`/events/${id}?${pickerParams.toString()}`);
  }
  const cartLines = mapCheckoutCartLines(cart, mappedTypes);
  const subtotal = cartSubtotalMinor(cartLines);
  const bookingFee = bookingFeeFor(plan, subtotal);
  const editTicketsHref = `/events/${id}?${new URLSearchParams({ tickets: "1", items: serializeCart(cart) }).toString()}`;

  if (paymentMethods.length === 0) {
    const unavailable = createPaymentChannelUnavailableError("no_matching_route", {
      eventId: row.id,
      eventSlug: row.slug,
    });
    reportPaymentChannelUnavailable(unavailable);
    return (
      <>
        <CheckoutStartTracker
          eventId={row.id}
          eventSlug={row.slug}
          ticketTypeCount={mappedTypes.length}
          hasHold={Boolean(holdCode)}
        />
        <main className="flex min-h-dvh items-center justify-center bg-bg px-5 py-12">
          <div className="w-full max-w-lg rounded-[var(--radius-lg)] border border-line bg-surface p-6 text-center">
            <p className="font-mono text-[11px] font-semibold uppercase text-danger">Checkout paused</p>
            <h1 className="mt-2 text-[24px] font-semibold tracking-[-0.03em]">No active payment method</h1>
            <p className="mt-3 text-[14px] leading-6 text-ink-3">
              Ticket sales for this event are temporarily unavailable because the organizer has not enabled an operational Ticketiv-supported payment method.
            </p>
            <p className="mt-2 font-mono text-[11px] text-ink-3">Reference: {unavailable.correlationId}</p>
            <div className="mt-5 flex justify-center gap-2">
              <Link href={`/events/${id}`} className="rounded-md border border-line-2 px-4 py-2 text-[13px] font-semibold hover:bg-bg">
                Back to event
              </Link>
              <Link href="/support" className="rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90">
                Contact support
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <CheckoutStartTracker
        eventId={row.id}
        eventSlug={row.slug}
        ticketTypeCount={mappedTypes.length}
        hasHold={Boolean(holdCode)}
      />
      <div className="h-dvh md:hidden">
        <CheckoutProviderBridge
          methods={paymentMethods}
          eventId={row.id}
          eventSlug={row.slug}
        >
          <MobileCheckout
            {...sharedProps}
            eventUuid={row.id}
            lines={cartLines}
            editTicketsHref={editTicketsHref}
            paymentMethods={paymentMethods}
            bookingFeeMinor={bookingFee}
            vatRate={CHECKOUT_VAT_RATE}
            holdSeconds={holdSeconds}
            defaultBuyerEmail={defaultBuyerEmail}
            defaultBuyerName={defaultBuyerName}
            defaultBuyerPhone={defaultBuyerPhone}
          />
        </CheckoutProviderBridge>
      </div>
      <div className="hidden md:block">
        <CheckoutProviderBridge
          methods={paymentMethods}
          eventId={row.id}
          eventSlug={row.slug}
          showDesktopPicker
        >
          <DesktopCheckout
            {...sharedProps}
            eventUuid={row.id}
            lines={cartLines}
            editTicketsHref={editTicketsHref}
            bookingFeeMinor={bookingFee}
            vatRate={CHECKOUT_VAT_RATE}
            holdSeconds={holdSeconds}
            defaultBuyerEmail={defaultBuyerEmail}
          />
        </CheckoutProviderBridge>
      </div>
    </>
  );
}
