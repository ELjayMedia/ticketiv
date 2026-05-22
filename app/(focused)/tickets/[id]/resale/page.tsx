import { notFound } from "next/navigation";
import { Resale } from "@/components/quiet/screens/tickets/resale";
import { PHOTOS } from "@/lib/photos";
import { formatEventDate, formatTimeRange } from "@/lib/format";
import { getTicketById } from "@/lib/data/attendee/tickets";
import { resolveResaleCapBps } from "@/lib/resale-cap";
import { createServerSupabaseClient } from "@/lib/supabase-server";

/**
 * `/tickets/[id]/resale`
 *
 * `[id]` is order_item_id. Cap rate is sourced from events.resale_cap_bps
 * (per-event override) with `resolveResaleCapBps` falling back to the
 * platform default. Fee rate uses the org's active pricing_plan
 * (resale_fee_bps if present, else the platform fee bps).
 */
export const metadata = { title: "Resell ticket" };
export const dynamic = "force-dynamic";

async function fetchResaleConfig(eventId: string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { capBps: resolveResaleCapBps(null), feeBps: 800 };

  const { data: eventRow } = await supabase
    .from("events")
    .select("org_id, resale_cap_bps")
    .eq("id", eventId)
    .maybeSingle();

  const capBps = resolveResaleCapBps(eventRow?.resale_cap_bps ?? null);

  let feeBps = 800;
  if (eventRow?.org_id) {
    const { data: plan } = await supabase
      .from("pricing_plans")
      .select("platform_percent_bps")
      .eq("org_id", eventRow.org_id)
      .eq("active", true)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (plan?.platform_percent_bps) feeBps = plan.platform_percent_bps;
  }

  return { capBps, feeBps };
}

export default async function ResalePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ticket = await getTicketById(id);
  if (!ticket) notFound();

  const { capBps, feeBps } = await fetchResaleConfig(ticket.event_id);
  const start = ticket.event_starts_at ? new Date(ticket.event_starts_at) : null;

  return (
    <div className="h-dvh">
      <Resale
        ticket={{
          id: ticket.order_item_id,
          eventTitle: ticket.event_title,
          eventPhoto: ticket.cover_image_url ?? PHOTOS.dj_set,
          seatLabel: ticket.ticket_type_name ?? "General",
          whenLabel: start
            ? `${formatEventDate(start)} · ${formatTimeRange(start)}`
            : "Date TBA",
          typeLabel: (ticket.ticket_type_name ?? "General").toUpperCase(),
          paidMinor: ticket.price_cents ?? 0,
          faceMinor: ticket.price_cents ?? 0,
        }}
        feeRate={feeBps / 10000}
        capRate={capBps / 10000}
      />
    </div>
  );
}
