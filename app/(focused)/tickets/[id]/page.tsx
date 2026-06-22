import { notFound } from "next/navigation";
import { TicketView } from "@/components/quiet/screens/tickets/ticket-view";
import { getTicketById, getTicketEventPolicy } from "@/lib/data/attendee/tickets";
import { mapTicketView } from "@/lib/mappers/tickets";

export const metadata = { title: "Your ticket" };
export const dynamic = "force-dynamic";

/**
 * `/tickets/[id]` — single ticket QR view.
 *
 * `[id]` is the `order_item_id`. The query goes through `v_my_tickets`,
 * which is RLS-scoped to the authenticated buyer (buyer_id = auth.uid()),
 * so there's no extra ownership check needed here.
 */
export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await getTicketById(id);
  if (!row) notFound();

  const refundPolicy = row.event_id ? await getTicketEventPolicy(row.event_id) : undefined;

  return <TicketView ticket={mapTicketView(row, { refundPolicy })} />;
}
