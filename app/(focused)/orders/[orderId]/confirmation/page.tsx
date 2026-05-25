import { notFound } from "next/navigation";
import { OrderConfirmation } from "@/components/quiet/screens/confirmation/order-confirmation";
import { getOrderForBuyer } from "@/lib/data/attendee/orders";
import { mapConfirmation } from "@/lib/mappers/confirmation";

/**
 * `/orders/[orderId]/confirmation`
 *
 * Reached after the payment-gateway callback. The webhook (separate request
 * from the buyer's redirect) is what flips `orders.status` to "paid" and
 * issues the order_items. The page derives its UX state from the order row
 * so a refresh after webhook arrival "just works".
 *
 * When the order is still "pending" we set a short meta-refresh so the
 * buyer doesn't have to manually reload while we wait for the webhook.
 */
export const metadata = { title: "You're going" };
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const PENDING_REFRESH_SECONDS = 4;

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const order = await getOrderForBuyer(orderId);
  if (!order) notFound();

  const props = mapConfirmation(order);

  return (
    <div className="h-dvh">
      {props.state === "pending" && (
        <meta httpEquiv="refresh" content={String(PENDING_REFRESH_SECONDS)} />
      )}
      <OrderConfirmation order={props} />
    </div>
  );
}
