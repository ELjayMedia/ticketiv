import "server-only";

import type { CheckoutTicketTypeRow } from "@/lib/mappers/checkout";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export interface CheckoutAvailability {
  ticketTypes: CheckoutTicketTypeRow[];
  orgId: string | null;
}

/**
 * Live, buyer-facing ticket availability for one event: on-sale ticket types
 * with remaining stock and purchase limits. Shared by the ticket picker and
 * checkout so both quote the same numbers. Never cached — remaining stock moves with every order.
 */
export async function loadCheckoutAvailability(eventId: string): Promise<CheckoutAvailability> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ticketTypes: [], orgId: null };

  const { data: eventRow } = await supabase
    .from("events")
    .select("org_id")
    .eq("id", eventId)
    .maybeSingle();

  const orgId = eventRow?.org_id ?? null;
  const admin = createAdminClient();

  const [ttRes, remainingRes, channelRes] = await Promise.all([
    supabase
      .from("ticket_types")
      .select("id, name, price_cents, currency, quota, sales_status, per_user_limit")
      .eq("event_id", eventId)
      // Hidden ticket types are organizer-only (comp / employee / unpublished).
      // They should never appear in the public listing or be reachable by URL.
      .neq("sales_status", "hidden")
      .order("price_cents", { ascending: true }),
    (supabase.rpc as any)("fn_ticket_type_remaining", { p_event_id: eventId }),
    admin
      .from("ticket_type_channels")
      .select("ticket_type_id, per_order_limit, ticket_types!inner(event_id)")
      .eq("channel", "online")
      .eq("ticket_types.event_id", eventId),
  ]);

  if (ttRes.error) console.error("[checkout] ticket_types:", ttRes.error);
  if (remainingRes.error) console.error("[checkout] fn_ticket_type_remaining:", remainingRes.error);
  if (channelRes.error) console.error("[checkout] ticket_type_channels:", channelRes.error);

  const remainingMap = new Map<string, number>(
    ((remainingRes.data ?? []) as Array<{ ticket_type_id: string; remaining: number }>).map(
      (r) => [r.ticket_type_id, r.remaining],
    ),
  );
  const perOrderLimitMap = new Map<string, number | null>(
    (channelRes.data ?? []).map((channel) => [channel.ticket_type_id, channel.per_order_limit]),
  );

  return {
    ticketTypes: (ttRes.data ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      price_cents: t.price_cents,
      currency: t.currency,
      sales_status: t.sales_status,
      per_user_limit: t.per_user_limit,
      per_order_limit: perOrderLimitMap.get(t.id) ?? null,
      remaining: remainingMap.get(t.id) ?? null,
    })),
    orgId,
  };
}
