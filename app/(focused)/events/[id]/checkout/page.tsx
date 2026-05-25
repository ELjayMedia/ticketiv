import { notFound } from "next/navigation";
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
      ticketTypes: [] as Array<{ id: string; name: string; price_cents: number; quota: number | null; sales_status: string | null }>,
      plan: null as { platform_fixed_cents: number | null; platform_percent_bps: number | null } | null,
      orgId: null as string | null,
    };

  const { data: eventRow } = await supabase
    .from("events")
    .select("org_id")
    .eq("id", eventId)
    .maybeSingle();

  const orgId = eventRow?.org_id ?? null;

  const [ttRes, planRes] = await Promise.all([
    supabase
      .from("ticket_types")
      .select("id, name, price_cents, quota, sales_status")
      .eq("event_id", eventId)
      .order("price_cents", { ascending: true }),
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
  if ("error" in planRes && planRes.error) console.error("[checkout] pricing_plans:", planRes.error);

  return {
    ticketTypes: ttRes.data ?? [],
    plan: planRes.data ?? null,
    orgId,
  };
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await getPublicEventBySlug(id);
  if (!row) notFound();

  const sharedProps = mapCheckoutEvent(row);
  const { ticketTypes, plan } = await fetchCheckoutExtras(row.id);

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
        />
      </div>
    </>
  );
}
