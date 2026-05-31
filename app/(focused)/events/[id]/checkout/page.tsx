import { notFound, redirect } from "next/navigation";
import { MobileCheckout } from "@/components/quiet/screens/checkout/mobile-checkout";
import { DesktopCheckout } from "@/components/quiet/screens/checkout/desktop-checkout";
import { getPublicEventBySlug } from "@/lib/adapters/events";
import {
  mapCheckoutEvent,
  mapCheckoutTicketType,
  bookingFeeFor,
} from "@/lib/mappers/checkout";
import { createServerSupabaseClient } from "@/lib/supabase-server";

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
      ticketTypes: [] as Array<{ id: string; name: string; price_cents: number; remaining: number | null; sales_status: string | null }>,
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
      .select("id, name, price_cents, quota, sales_status")
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
      sales_status: t.sales_status,
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

  // Validate the hold when a code is present. The full seat-hold reservation
  // flow (TICK-16) is not yet wired up, so callers without a hold code proceed
  // with holdSeconds = 0 (no countdown shown).
  let holdSeconds = 0;
  if (holdCode) {
    const { data: hold } = supabase
      ? await supabase
          .from("seat_holds")
          .select("id, expires_at")
          .eq("hold_code", holdCode)
          .eq("event_id", eventUuidFromSlug)
          .eq("status", "active")
          .gt("expires_at", new Date().toISOString())
          .maybeSingle()
      : { data: null };

    if (!hold) redirect(`/events/${id}?hold_expired=1`);

    holdSeconds = Math.max(
      0,
      Math.floor((new Date(hold.expires_at).getTime() - Date.now()) / 1000),
    );
  }

  const row = await getPublicEventBySlug(id);
  if (!row) notFound();

  const sharedProps = mapCheckoutEvent(row);
  const { ticketTypes, plan } = await fetchCheckoutExtras(row.id);

  // Prefill the buyer-email field when the buyer is already signed in (and
  // their account carries a real address — not an anonymous guest from a
  // previous visit). Empty otherwise; the UI collects it from guests.
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const defaultBuyerEmail = user?.email ?? "";

  const mappedTypes = ticketTypes.map(mapCheckoutTicketType);
  const firstSellable = mappedTypes.find((t) => t.remaining !== 0) ?? mappedTypes[0];
  const subtotalForFirst = firstSellable ? firstSellable.priceMinor : 0;
  const bookingFee = bookingFeeFor(plan, subtotalForFirst);

  return (
    <>
      <div className="h-dvh md:hidden">
        <MobileCheckout
          {...sharedProps}
          eventUuid={row.id}
          ticketTypes={mappedTypes}
          bookingFeeMinor={bookingFee}
          holdSeconds={holdSeconds}
          defaultBuyerEmail={defaultBuyerEmail}
        />
      </div>
      <div className="hidden md:block">
        <DesktopCheckout
          {...sharedProps}
          eventUuid={row.id}
          ticketTypeId={firstSellable?.id ?? ""}
          ticketTypeName={firstSellable?.name ?? "General"}
          quantity={1}
          subtotalMinor={subtotalForFirst}
          bookingFeeMinor={bookingFee}
          vatRate={0.15}
          holdSeconds={holdSeconds}
          defaultBuyerEmail={defaultBuyerEmail}
        />
      </div>
    </>
  );
}
