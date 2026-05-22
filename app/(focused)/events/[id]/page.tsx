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

async function fetchEventExtras(eventId: string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return {
      ticketTypes: [] as { id: string; name: string; price_cents: number; quota: number | null }[],
      lineup: [] as EventLineupRow[],
      friends: [] as EventFriendRow[],
      refundPolicy: null as unknown,
    };
  }

  const [ttRes, lineupRes, friendsRes, eventRes] = await Promise.all([
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

  const { ticketTypes, lineup, friends, refundPolicy } = await fetchEventExtras(row.id);

  const mobile = mapEventDetail(row, { lineup, friends, refundPolicy });
  const desktop = mapDesktopEventDetail(row, ticketTypes, { lineup, friends, refundPolicy });

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
