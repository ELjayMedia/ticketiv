import { notFound } from "next/navigation";
import { TicketView } from "@/components/quiet/screens/tickets/ticket-view";
import {
  getTicketById,
  getTicketEventPolicy,
  getTicketOfflineExpiry,
  getTicketsByOrderId,
} from "@/lib/data/attendee/tickets";
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

  const [refundPolicy, offlineExpiresAt, siblingRows] = await Promise.all([
    row.event_id ? getTicketEventPolicy(row.event_id) : undefined,
    row.event_id
      ? getTicketOfflineExpiry(row.event_id, row.event_starts_at)
      : undefined,
    getTicketsByOrderId(row.order_id),
  ]);
  const siblingIds = siblingRows.map((ticket) => ticket.order_item_id);
  const position = Math.max(0, siblingIds.indexOf(row.order_item_id)) + 1;

  return (
    <TicketView
      ticket={mapTicketView(row, {
        refundPolicy,
        offlineExpiresAt,
        position,
        totalInOrder: Math.max(1, siblingIds.length),
      })}
      siblingIds={siblingIds}
    />
  );
}
