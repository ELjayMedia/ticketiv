import { notFound } from "next/navigation";
import { WaitlistOfferCheckout } from "@/components/quiet/screens/waitlist/waitlist-offer-checkout";
import { CheckoutStatusPoller } from "@/components/quiet/screens/checkout/checkout-status-poller";
import { getMyWaitlistOffer } from "@/lib/data/attendee/waitlist";
import { getWaitlistCheckoutPaymentStatus } from "@/lib/data/attendee/waitlist-checkout";
import { isFeatureEnabled } from "@/lib/feature-flags";

export const metadata = { title: "Waitlist checkout" };
export const dynamic = "force-dynamic";

export default async function WaitlistOfferCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ waitlistId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  // TICK-346 — waitlist_enabled is off: this feature is outside the launch scope.
  if (!(await isFeatureEnabled("waitlist_enabled"))) notFound();

  const { waitlistId } = await params;
  const query = (await searchParams) ?? {};
  const offer = await getMyWaitlistOffer(waitlistId);
  const orderId = typeof query.orderId === "string" ? query.orderId : null;
  const paymentId = typeof query.paymentId === "string" ? query.paymentId : null;
  const paymentStatus = await getWaitlistCheckoutPaymentStatus(paymentId);

  return (
    <>
      <CheckoutStatusPoller active={Boolean(paymentId) && paymentStatus?.isSucceeded !== true} />
      <WaitlistOfferCheckout
        offer={offer}
        pendingOrderId={orderId}
        pendingPaymentId={paymentId}
        paymentStatus={paymentStatus}
      />
    </>
  );
}
