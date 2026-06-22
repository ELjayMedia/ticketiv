import { TicketListingsCentre } from "@/components/quiet/screens/resale/resale-centre";
import {
  getMyTicketListings,
  getPublicEventTicketListings,
  type ResaleSort,
} from "@/lib/data/attendee/ticket-listings";

export const metadata = { title: "Resale" };
export const dynamic = "force-dynamic";

const SORT_VALUES: ResaleSort[] = ["price_asc", "price_desc", "newest"];

export default async function ResalePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const ticketId = typeof params.ticketId === "string" ? params.ticketId : null;
  const eventId = typeof params.eventId === "string" ? params.eventId : null;
  const sort: ResaleSort =
    typeof params.sort === "string" && SORT_VALUES.includes(params.sort as ResaleSort)
      ? (params.sort as ResaleSort)
      : "price_asc";
  const ticketType = typeof params.ticketType === "string" ? params.ticketType : null;

  const [listings, publicListingsResult] = await Promise.all([
    getMyTicketListings(),
    getPublicEventTicketListings(eventId, { sort, ticketTypeId: ticketType }),
  ]);

  return (
    <TicketListingsCentre
      listings={listings}
      publicListings={publicListingsResult.listings}
      publicTicketTypes={publicListingsResult.ticketTypes}
      sort={sort}
      ticketType={ticketType}
      ticketId={ticketId}
      eventId={eventId}
    />
  );
}
