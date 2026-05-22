import { notFound } from "next/navigation";
import { MobileEvent } from "@/components/quiet/screens/event-detail/mobile-event";
import { DesktopEvent } from "@/components/quiet/screens/event-detail/desktop-event";

/**
 * `/events/[id]`
 *
 * Phase 2 wiring will swap the mock data for a Supabase fetch:
 *
 *   const event = await getEventBySlug(params.id);
 *   if (!event) notFound();
 *
 * Both viewport variants take the same data shape (`MobileEventData`
 * is extended by `DesktopEventData` with `longDescription`, `amenities`,
 * `ticketTypes`). One server query feeds both.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // In Phase 2: const event = await getEventBySlug(id);
  return {
    title: `${id.replace(/-/g, " ")}`,
    description: "Get tickets for this event on Ticketiv.",
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Phase 2: real Supabase fetch here. For Phase 1 of the buy flow
  // we render the default mock so the route is verifiable end-to-end.
  if (!id) notFound();

  return (
    <>
      <div className="h-dvh md:hidden">
        <MobileEvent />
      </div>
      <div className="hidden md:block">
        <DesktopEvent />
      </div>
    </>
  );
}
