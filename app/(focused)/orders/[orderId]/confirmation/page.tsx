import { notFound } from "next/navigation";
import { OrderConfirmation } from "@/components/quiet/screens/confirmation/order-confirmation";
import { getOrderForBuyer } from "@/lib/data/attendee/orders";
import { mapConfirmation } from "@/lib/mappers/confirmation";

/**
 * `/orders/[orderId]/confirmation`
 *
 * Reached after the payment-gateway callback writes the order to Supabase
 * and webhook-issues the ticket records. RLS keeps the data scoped to the
 * authenticated buyer; non-owners hit notFound().
 */
export const metadata = { title: "You're going" };
export const dynamic = "force-dynamic";

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const order = await getOrderForBuyer(orderId);
  if (!order) notFound();

  return (
    <div className="h-dvh">
      <OrderConfirmation order={mapConfirmation(order)} />
    </div>
  );
}
