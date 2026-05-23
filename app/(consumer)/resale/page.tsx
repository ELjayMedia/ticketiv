import { TicketListingsCentre } from "@/components/quiet/screens/resale/resale-centre";
import { getMyTicketListings } from "@/lib/data/attendee/ticket-listings";

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
  const listings = await getMyTicketListings();

  return <TicketListingsCentre listings={listings} ticketId={ticketId} eventId={eventId} />;
}
