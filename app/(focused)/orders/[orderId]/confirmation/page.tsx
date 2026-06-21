import { notFound } from "next/navigation";
import { OrderConfirmation } from "@/components/quiet/screens/confirmation/order-confirmation";
import { RealtimeOrderStatus } from "@/components/quiet/screens/confirmation/realtime-order-status";
import { SaveMyTicketsCard } from "@/components/quiet/screens/tickets/save-my-tickets-card";
import { getOrderForBuyer } from "@/lib/data/attendee/orders";
import { mapConfirmation } from "@/lib/mappers/confirmation";
import { createServerSupabaseClient } from "@/lib/supabase-server";

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

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const order = await getOrderForBuyer(orderId);
  if (!order) notFound();

  const props = mapConfirmation(order);

  // Prompt anonymous buyers to save their tickets to a recoverable account
  // right at the "ticket ready" moment — the highest-intent point in the flow.
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const isAnonymous = Boolean(user && (user as { is_anonymous?: boolean }).is_anonymous);
  const defaultClaimEmail = order.buyer_email ?? "";

  return (
    <div className="h-dvh">
      <RealtimeOrderStatus orderId={orderId} active={props.state === "pending"} />
      <OrderConfirmation order={props} />
      {isAnonymous && props.state !== "pending" && (
        <div className="mx-auto max-w-[480px] px-4 pb-6">
          <SaveMyTicketsCard defaultEmail={defaultClaimEmail} />
        </div>
      )}
    </div>
  );
}
