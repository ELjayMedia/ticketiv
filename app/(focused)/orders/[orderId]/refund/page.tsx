import { notFound } from "next/navigation";
import { Refund } from "@/components/quiet/screens/tickets/refund";
import { getOrderForBuyer } from "@/lib/data/attendee/orders";
import { mapRefund } from "@/lib/mappers/refund";

/**
 * `/orders/[orderId]/refund`
 *
 * RLS-scoped through getOrderForBuyer. The mapper resolves the event's
 * structured refund policy into the exact quote shown on screen; the server
 * action recomputes the same policy before it creates a request.
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
      <Refund {...props} />
    </div>
  );
}
