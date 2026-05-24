import { ResaleCheckoutReview } from "@/components/quiet/screens/resale/resale-checkout-review";
import { getResaleCheckoutPaymentStatus } from "@/lib/data/attendee/resale-checkout";
import { getPublicTicketListing } from "@/lib/data/attendee/ticket-listings";

export const metadata = { title: "Resale checkout" };
export const dynamic = "force-dynamic";

export default async function ResaleCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ listingId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { listingId } = await params;
  const query = (await searchParams) ?? {};
  const listing = await getPublicTicketListing(listingId);
  const orderId = typeof query.orderId === "string" ? query.orderId : null;
  const paymentId = typeof query.paymentId === "string" ? query.paymentId : null;
  const paymentStatus = await getResaleCheckoutPaymentStatus(paymentId);

  return (
    <ResaleCheckoutReview
      listing={listing}
      pendingOrderId={orderId}
      pendingPaymentId={paymentId}
      paymentStatus={paymentStatus}
    />
  );
}
