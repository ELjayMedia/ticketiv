import { notFound } from "next/navigation";
import { MobileEvent } from "@/components/quiet/screens/event-detail/mobile-event";
import { DesktopEvent } from "@/components/quiet/screens/event-detail/desktop-event";
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
    };
  }

  const [ttRes, lineupRes, friendsRes, eventRes, trustRes, orgEventsRes] = await Promise.all([
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
    fetchTrustSignals(supabase, eventId),
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
    ...trustRes,
  };
}

type SupabaseLike = NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;

/**
 * Best-effort fetch of public trust signals. We don't fail the page when the
 * orders/order_items tables are out of RLS reach — the UI simply hides any
 * count we can't compute.
 */
async function fetchTrustSignals(supabase: SupabaseLike, eventId: string) {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [soldRes, recentRes] = await Promise.all([
    supabase
      .from("order_items")
      .select("id, order:order_id!inner(buyer_id, status, event_id)", { count: "exact", head: true })
      .eq("order.event_id", eventId)
      .eq("order.status", "paid"),
    supabase
      .from("order_items")
      .select("id, order:order_id!inner(status, event_id, created_at)", { count: "exact", head: true })
      .eq("order.event_id", eventId)
      .eq("order.status", "paid")
      .gte("order.created_at", dayAgo),
  ]);

  return {
    soldCount: soldRes.error ? null : soldRes.count ?? null,
    attendeeCount: soldRes.error ? null : soldRes.count ?? null,
    recentSoldCount: recentRes.error ? null : recentRes.count ?? null,
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
    <>
      <div className="h-dvh md:hidden">
        <MobileEvent event={mobile} />
      </div>
      <div className="hidden md:block">
        <DesktopEvent event={desktop} />
      </div>
    </>
  );
}
