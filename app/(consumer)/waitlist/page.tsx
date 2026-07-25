import { notFound } from "next/navigation";
import { WaitlistCentre } from "@/components/quiet/screens/waitlist/waitlist-centre";
import { getMyWaitlistEntries } from "@/lib/data/attendee/waitlist";
import { isFeatureEnabled } from "@/lib/feature-flags";

export const metadata = { title: "Waitlist" };
export const dynamic = "force-dynamic";

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  // TICK-346 — waitlist_enabled is off: this feature is outside the launch scope.
  if (!(await isFeatureEnabled("waitlist_enabled"))) notFound();

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
