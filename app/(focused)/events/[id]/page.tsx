import { notFound } from "next/navigation";
import { MobileEvent } from "@/components/quiet/screens/event-detail/mobile-event";
import { DesktopEvent } from "@/components/quiet/screens/event-detail/desktop-event";
import { getPublicEventBySlug } from "@/lib/adapters/events";
import { mapEventDetail, mapDesktopEventDetail } from "@/lib/mappers/event-detail";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const revalidate = 60;

/**
 * `/events/[id]`
 *
 * `[id]` is the event slug (matches `v_event_public.slug`). Title, poster,
 * venue, pricing and organizer come from `v_event_public`; ticket types are
 * pulled directly from `ticket_types` for the desktop right-rail.
 * Lineup, friends-going, and the fact grid still use placeholder data —
 * those need joins on `event_artists` / `user_connections` not yet exposed
 * as a view.
 */
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

async function fetchTicketTypes(eventId: string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("ticket_types")
    .select("id, name, price_cents, quota")
    .eq("event_id", eventId)
    .order("price_cents", { ascending: true });
  if (error) {
    console.error("[event-detail] ticket_types:", error);
    return [];
  }
  return data ?? [];
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await getPublicEventBySlug(id);
  if (!row) notFound();

  const ticketTypes = await fetchTicketTypes(row.id);
  const mobile = mapEventDetail(row);
  const desktop = mapDesktopEventDetail(row, ticketTypes);

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
