import { WaitlistCentre } from "@/components/quiet/screens/waitlist/waitlist-centre";
import { getMyWaitlistEntries } from "@/lib/data/attendee/waitlist";

export const metadata = { title: "Waitlist" };
export const dynamic = "force-dynamic";

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const eventId = typeof params.eventId === "string" ? params.eventId : null;
  const ticketTypeId = typeof params.ticketTypeId === "string" ? params.ticketTypeId : null;
  const joined = params.joined === "1";
  const entries = await getMyWaitlistEntries();

  return (
    <WaitlistCentre
      entries={entries}
      joinEventId={eventId}
      joinTicketTypeId={ticketTypeId}
      joined={joined}
    />
  );
}
