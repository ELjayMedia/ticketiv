import { notFound } from "next/navigation";
import { TicketView } from "@/components/quiet/screens/tickets/ticket-view";
import {
  getTicketById,
  getTicketEventPolicy,
  getTicketHolderName,
  getTicketOfflineExpiry,
  getTicketsByOrderId,
} from "@/lib/data/attendee/tickets";
import { mapTicketView } from "@/lib/mappers/tickets";

export const metadata = { title: "Your ticket" };
export const dynamic = "force-dynamic";

/**
 * `/tickets/[id]` — QR view of a ticket and the rest of its order.
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

  const [refundPolicy, offlineExpiresAt, siblingRows, holderName] = await Promise.all([
    row.event_id ? getTicketEventPolicy(row.event_id) : undefined,
    row.event_id
      ? getTicketOfflineExpiry(row.event_id, row.event_starts_at)
      : undefined,
    getTicketsByOrderId(row.order_id),
    getTicketHolderName(),
  ]);
  // Every ticket in the order is rendered on this page (a vertical stack you
  // swipe up through); `[id]` only decides which one opens first.
  const rows = siblingRows.some((ticket) => ticket.order_item_id === row.order_item_id) ? siblingRows : [row];
  const opts = { refundPolicy, offlineExpiresAt, holderName, totalInOrder: rows.length };
  const tickets = rows.map((ticket, index) => mapTicketView(ticket, { ...opts, position: index + 1 }));

  return <TicketView tickets={tickets} initialTicketId={row.order_item_id} />;
}
