import { OrderConfirmation } from "@/components/quiet/screens/confirmation/order-confirmation";
import { PHOTOS } from "@/lib/photos";

/**
 * `/orders/[orderId]/confirmation`
 *
 * Reached after the payment-gateway callback writes the order to
 * Supabase and webhook-issues the ticket records. The route is
 * shareable (orderId is in the URL) but order detail itself is
 * RLS-gated to the buyer.
 *
 * TICK-15 redirected `/events/[id]/success` here; the redirect
 * already exists in production. No new proxy rules needed.
 */

export const metadata = { title: "You're going" };

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  // Phase 2 wiring: real fetch
  // const order = await getOrderForBuyer(orderId);
  // if (!order) notFound();

  return (
    <div className="h-dvh">
      <OrderConfirmation
        order={{
          id: orderId,
          orderNumber: orderId.slice(0, 6).toUpperCase(),
          eventTitle: "Tribal Tales",
          eventSubtitle: "SUNSET SET BY DJ FUN",
          eventPhoto: PHOTOS.dj_set,
          whenDate: "30 Aug",
          whenTime: "15:50",
          seats: ["C-4", "C-5"],
          ticketTypeName: "Regular",
          quantity: 2,
          totalMinor: 101800,
          paymentDescription: "Visa ••42",
          receiptEmail: "you@example.com",
          firstTicketId: "tkt_demo_001",
        }}
      />
    </div>
  );
}
