import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MobileCheckout } from "@/components/quiet/screens/checkout/mobile-checkout";
import { DesktopCheckout } from "@/components/quiet/screens/checkout/desktop-checkout";
import { CheckoutProviderBridge } from "@/components/quiet/screens/checkout/checkout-provider-bridge";
import { CheckoutStartTracker } from "@/components/analytics/buyer-funnel";
import { getPublicEventBySlug } from "@/lib/adapters/events";
import {
  mapCheckoutEvent,
  mapCheckoutTicketType,
  bookingFeeFor,
} from "@/lib/mappers/checkout";
import { getEffectivePaymentMethodsForEvent } from "@/lib/payments/availability";
import {
  createPaymentChannelUnavailableError,
  reportPaymentChannelUnavailable,
} from "@/lib/payments/errors";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * `/events/[id]/checkout`
 *
 * `[id]` is the event slug. Reads ticket_types and the event's org pricing
 * plan from Supabase, then hands the screens a ready-to-render shape.
 * Cart selection state (qty, picked ticket type) lives in the screens.
 *
 * Hold timer (`holdSeconds`) is still placeholder — TICK-16 cart-persist
 * and the seat_holds reservation flow land separately.
 */
export const metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

async function fetchCheckoutExtras(eventId: string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase)
    return {
      ticketTypes: [] as Array<{ id: string; name: string; price_cents: number; currency: string; remaining: number | null; sales_status: string | null; per_user_limit: number | null }>,
      plan: null as { platform_fixed_cents: number | null; platform_percent_bps: number | null } | null,
      orgId: null as string | null,
    };

  const { data: eventRow } = await supabase
    .from("events")
    .select("org_id")
    .eq("id", eventId)
    .maybeSingle();

  const orgId = eventRow?.org_id ?? null;

  const [ttRes, remainingRes, planRes] = await Promise.all([
    supabase
      .from("ticket_types")
      .select("id, name, price_cents, currency, quota, sales_status, per_user_limit")
      .eq("event_id", eventId)
      // Hidden ticket types are organizer-only (comp / employee / unpublished).
      // They should never appear in the public listing or be reachable by URL.
      .neq("sales_status", "hidden")
      .order("price_cents", { ascending: true }),
    (supabase.rpc as any)("fn_ticket_type_remaining", { p_event_id: eventId }),
    orgId
      ? supabase
          .from("pricing_plans")
          .select("platform_fixed_cents, platform_percent_bps")
          .eq("org_id", orgId)
          .eq("active", true)
          .order("effective_from", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as const),
  ]);

  if (ttRes.error) console.error("[checkout] ticket_types:", ttRes.error);
  if (remainingRes.error) console.error("[checkout] fn_ticket_type_remaining:", remainingRes.error);
  if ("error" in planRes && planRes.error) console.error("[checkout] pricing_plans:", planRes.error);

  const remainingMap = new Map<string, number>(
    ((remainingRes.data ?? []) as Array<{ ticket_type_id: string; remaining: number }>).map(
      (r) => [r.ticket_type_id, r.remaining],
    ),
  );

  return {
    ticketTypes: (ttRes.data ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      price_cents: t.price_cents,
      currency: t.currency,
      sales_status: t.sales_status,
      per_user_limit: t.per_user_limit,
      remaining: remainingMap.get(t.id) ?? null,
    })),
    plan: planRes.data ?? null,
    orgId,
  };
}

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ hold?: string }>;
}) {
  const { id } = await params;
  const { hold: holdCode } = await searchParams;

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
  let holdTicketTypeId: string | null = null;
  if (holdCode) {
    const admin = createAdminClient();
    const { data: hold } = await admin
      .from("seat_holds")
      .select("id, expires_at, ticket_type_id")
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
    holdTicketTypeId = hold.ticket_type_id ?? null;
  }

  const row = await getPublicEventBySlug(id);
  if (!row) notFound();

  const sharedProps = mapCheckoutEvent(row);
  const [{ ticketTypes, plan }, paymentMethods] = await Promise.all([
    fetchCheckoutExtras(row.id),
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
    defaultBuyerName =
      profile?.display_name ??
      [profile?.name, profile?.surname].filter(Boolean).join(" ") ??
      defaultBuyerName;
    defaultBuyerPhone = profile?.phone ?? defaultBuyerPhone;
  }

  const mappedTypes = ticketTypes.map(mapCheckoutTicketType);
  const holdType = holdTicketTypeId ? mappedTypes.find((t) => t.id === holdTicketTypeId) : null;
  const firstSellable = holdType ?? mappedTypes.find((t) => t.remaining !== 0) ?? mappedTypes[0];
  const subtotalForFirst = firstSellable ? firstSellable.priceMinor : 0;
  const bookingFee = bookingFeeFor(plan, subtotalForFirst);

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
            ticketTypes={mappedTypes}
            paymentMethods={paymentMethods}
            bookingFeeMinor={bookingFee}
            holdSeconds={holdSeconds}
            defaultBuyerEmail={defaultBuyerEmail}
            defaultBuyerName={defaultBuyerName}
            defaultBuyerPhone={defaultBuyerPhone}
            defaultTicketTypeId={firstSellable?.id}
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
            ticketTypeId={firstSellable?.id ?? ""}
            ticketTypeName={firstSellable?.name ?? "General"}
            quantity={1}
            subtotalMinor={subtotalForFirst}
            currency={firstSellable?.currency}
            bookingFeeMinor={bookingFee}
            vatRate={0.15}
            holdSeconds={holdSeconds}
            defaultBuyerEmail={defaultBuyerEmail}
          />
        </CheckoutProviderBridge>
      </div>
    </>
  );
}
