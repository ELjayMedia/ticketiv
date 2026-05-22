import { MyTickets } from "@/components/quiet/screens/tickets/my-tickets";
import { getMyTickets } from "@/lib/data/attendee/tickets";
import { mapMyTickets } from "@/lib/mappers/tickets";

export const metadata = { title: "My tickets" };
export const dynamic = "force-dynamic";

export default async function TicketsPage() {
  const rows = await getMyTickets();
  const props = mapMyTickets(rows);

  return (
    <div className="mx-auto max-w-[480px]">
      <MyTickets
        featured={props.featured}
        upcoming={props.upcoming}
        inboundTransfer={null}
        counts={props.counts}
      />
    </div>
  );
}
