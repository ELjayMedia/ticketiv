import { notFound } from "next/navigation";
import { LiveEventShell } from "@/components/quiet/screens/event-detail/live-event-shell";
import { getPublicEventBySlug } from "@/lib/adapters/events";
import { mapEventDetail, mapDesktopEventDetail } from "@/lib/mappers/event-detail";
import type { EventLineupRow, EventFriendRow } from "@/lib/mappers/event-detail";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getPublicEventBySlug(id);
  if (!event) return { title: "Event" };
  return {
    title: event.title,
    description: event.description ?? "Get tickets for this event on Ticketiv.",
  };
}

async function fetchEventExtras(eventId: string, organizerId: string | null) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return {
      ticketTypes: [] as { id: string; name: string; price_cents: number; quota: number | null }[],
      lineup: [] as EventLineupRow[],
      friends: [] as EventFriendRow[],
      refundPolicy: null as unknown,
      soldCount: null as number | null,
      attendeeCount: null as number | null,
      recentSoldCount: null as number | null,
      organizerEventsHosted: null as number | null,
      liveStats: null as Record<string, unknown> | null,
    };
  }

  const [ttRes, lineupRes, friendsRes, eventRes, liveStatsRes, orgEventsRes] = await Promise.all([
    supabase
      .from("ticket_types")
      .select("id, name, price_cents, quota")
      .eq("event_id", eventId)
      .order("price_cents", { ascending: true }),
    supabase
      .from("v_event_lineup_public")
      .select("artist_id, artist_name, artist_slug, artist_image_url, role")
      .eq("event_id", eventId),
    supabase
      .from("v_event_friends_going")
      .select("friend_id, friend_name, friend_handle")
      .eq("event_id", eventId),
    supabase.from("events").select("refund_policy").eq("id", eventId).maybeSingle(),
    supabase
      .from("event_live_stats")
      .select(
        "event_id,tickets_sold,tickets_available,gross_sales_cents,successful_payments,failed_payments,checked_in_count,last_order_at,last_scan_at,updated_at",
      )
      .eq("event_id", eventId)
      .maybeSingle(),
    organizerId
      ? supabase
          .from("events")
          .select("id", { count: "exact", head: true })
          .eq("org_id", organizerId)
          .eq("status", "published")
      : Promise.resolve({ count: null as number | null, error: null }),
  ]);

  if (ttRes.error) console.error("[event-detail] ticket_types:", ttRes.error);
  if (lineupRes.error) console.error("[event-detail] lineup:", lineupRes.error);
  if (friendsRes.error) console.error("[event-detail] friends:", friendsRes.error);
  if (eventRes.error) console.error("[event-detail] refund_policy:", eventRes.error);

  return {
    ticketTypes: ttRes.data ?? [],
    lineup: (lineupRes.data ?? []) as EventLineupRow[],
    friends: (friendsRes.data ?? []) as EventFriendRow[],
    refundPolicy: eventRes.data?.refund_policy ?? null,
    organizerEventsHosted: orgEventsRes && "error" in orgEventsRes && orgEventsRes.error
      ? null
      : orgEventsRes?.count ?? null,
    soldCount: liveStatsRes.data?.tickets_sold ?? null,
    attendeeCount: liveStatsRes.data?.tickets_sold ?? null,
    recentSoldCount: null as number | null,
    liveStats: liveStatsRes.data ?? null,
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await getPublicEventBySlug(id);
  if (!row) notFound();

  const {
    ticketTypes,
    lineup,
    friends,
    refundPolicy,
    soldCount,
    attendeeCount,
    recentSoldCount,
    organizerEventsHosted,
    liveStats,
  } = await fetchEventExtras(row.id, row.organizer_id ?? null);

  const trust = {
    soldCount,
    attendeeCount,
    recentSoldCount,
    recentSoldWindow: "today" as const,
    supportUrl: "/help",
    organizerEventsHosted,
  };

  const mobile = mapEventDetail(row, { lineup, friends, refundPolicy, ...trust });
  const desktop = mapDesktopEventDetail(row, ticketTypes, {
    lineup,
    friends,
    refundPolicy,
    ...trust,
  });

  return (
    <LiveEventShell eventId={row.id} mobile={mobile} desktop={desktop} initialStats={liveStats} />
  );
}
