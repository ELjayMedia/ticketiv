import { notFound } from "next/navigation";
import { Refund } from "@/components/quiet/screens/tickets/refund";
import { getOrderForBuyer } from "@/lib/data/attendee/orders";
import { mapRefund } from "@/lib/mappers/refund";

/**
 * `/orders/[orderId]/refund`
 *
 * RLS-scoped through getOrderForBuyer. The Refund screen does its own
 * band resolution from `daysUntil`; the JSON policy on the event row is
 * available on order.refund_policy for a future "show full schedule" panel.
 */
export const metadata = { title: "Request refund" };
export const dynamic = "force-dynamic";

export default async function RefundPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const order = await getOrderForBuyer(orderId);
  if (!order) notFound();

  const props = mapRefund(order);

  return (
    <div className="h-dvh">
      <Refund order={props.order} daysUntil={props.daysUntil} />
    </div>
  );
}
