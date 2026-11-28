import { notFound } from "next/navigation";
import { OrderConfirmation } from "@/components/quiet/screens/confirmation/order-confirmation";
import { RealtimeOrderStatus } from "@/components/quiet/screens/confirmation/realtime-order-status";
import { SaveMyTicketsCard } from "@/components/quiet/screens/tickets/save-my-tickets-card";
import { PaymentOutcomeTracker } from "@/components/analytics/buyer-funnel";
import { PostPurchaseFollow } from "@/components/follows/post-purchase-follow";
import { getFollowSnapshot } from "@/lib/data/public/follows";
import { getOrderForBuyer } from "@/lib/data/attendee/orders";
import { mapConfirmation } from "@/lib/mappers/confirmation";
import { reconcileVerifiedPaystackReturn } from "@/lib/payments/paystack-return";
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
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  const { orderId } = await params;
  const { reference, trxref } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  const paystackReference = reference ?? trxref ?? null;
  if (user && paystackReference) {
    try {
      await reconcileVerifiedPaystackReturn({
        orderId,
        reference: paystackReference,
        userId: user.id,
      });
    } catch (error) {
      console.error("[payments] Paystack return reconciliation failed", {
        orderId,
        reference: paystackReference,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const order = await getOrderForBuyer(orderId);
  if (!order) notFound();

  const props = mapConfirmation(order);

  // Prompt anonymous buyers to save their tickets to a recoverable account
  // right at the "ticket ready" moment — the highest-intent point in the flow.
  const isAnonymous = Boolean(user && (user as { is_anonymous?: boolean }).is_anonymous);
  const defaultClaimEmail = order.buyer_email ?? "";

  // Follow prompt for signed-in buyers once the order is paid (TICK-434).
  // Guest-checkout sessions get the save-my-tickets card instead.
  let organiser: { id: string; name: string; following: boolean; followerCount: number } | null = null;
  if (supabase && user && !isAnonymous && props.state === "paid" && order.event_id) {
    const { data: event } = await supabase
      .from("events")
      .select("org_id, organizations(name)")
      .eq("id", order.event_id)
      .maybeSingle();
    const org = (event as { org_id?: string; organizations?: { name?: string } | null } | null) ?? null;
    if (org?.org_id && org.organizations?.name) {
      const snap = await getFollowSnapshot("organizer", org.org_id);
      organiser = { id: org.org_id, name: org.organizations.name, following: snap.following, followerCount: snap.followerCount };
    }
  }

  return (
    <div className="h-dvh">
      <RealtimeOrderStatus orderId={orderId} active={props.state === "pending"} />
      <PaymentOutcomeTracker
        orderId={props.id}
        state={props.state}
        eventSlug={props.eventSlug}
        quantity={props.quantity}
        totalMinor={props.totalMinor}
      />
      <OrderConfirmation order={props} />
      {organiser && (
        <PostPurchaseFollow
          orgId={organiser.id}
          orgName={organiser.name}
          following={organiser.following}
          followerCount={organiser.followerCount}
          returnTo={`/orders/${orderId}/confirmation`}
        />
      )}
      {isAnonymous && props.state !== "pending" && (
        <div className="mx-auto max-w-[480px] px-4 pb-6">
          <SaveMyTicketsCard defaultEmail={defaultClaimEmail} />
        </div>
      )}
    </div>
  );
}
