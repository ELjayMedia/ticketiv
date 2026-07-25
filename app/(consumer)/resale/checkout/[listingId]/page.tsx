import { notFound } from "next/navigation";
import { ResaleCheckoutReview } from "@/components/quiet/screens/resale/resale-checkout-review";
import { CheckoutStatusPoller } from "@/components/quiet/screens/checkout/checkout-status-poller";
import { getResaleCheckoutPaymentStatus } from "@/lib/data/attendee/resale-checkout";
import { getPublicTicketListing } from "@/lib/data/attendee/ticket-listings";
import { isFeatureEnabled } from "@/lib/feature-flags";

export const metadata = { title: "Resale checkout" };
export const dynamic = "force-dynamic";

export default async function ResaleCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ listingId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  // TICK-346 — resale_enabled is off: this feature is outside the launch scope.
  if (!(await isFeatureEnabled("resale_enabled"))) notFound();

  const { listingId } = await params;
  const query = (await searchParams) ?? {};
  const listing = await getPublicTicketListing(listingId);
  const orderId = typeof query.orderId === "string" ? query.orderId : null;
  const paymentId = typeof query.paymentId === "string" ? query.paymentId : null;
  const paymentStatus = await getResaleCheckoutPaymentStatus(paymentId);

  return (
    <>
      <CheckoutStatusPoller active={Boolean(paymentId) && paymentStatus?.isSucceeded !== true} />
      <ResaleCheckoutReview
        listing={listing}
        pendingOrderId={orderId}
        pendingPaymentId={paymentId}
        paymentStatus={paymentStatus}
      />
    </>
  );
}
