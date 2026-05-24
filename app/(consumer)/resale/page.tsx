import { TicketListingsCentre } from "@/components/quiet/screens/resale/resale-centre";
import { getMyTicketListings, getPublicEventTicketListings } from "@/lib/data/attendee/ticket-listings";

export const metadata = { title: "Resale" };
export const dynamic = "force-dynamic";

export default async function ResalePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const ticketId = typeof params.ticketId === "string" ? params.ticketId : null;
  const eventId = typeof params.eventId === "string" ? params.eventId : null;
  const [listings, publicListings] = await Promise.all([
    getMyTicketListings(),
    getPublicEventTicketListings(eventId),
  ]);

  return (
    <TicketListingsCentre
      listings={listings}
      publicListings={publicListings}
      ticketId={ticketId}
      eventId={eventId}
    />
  );
}
