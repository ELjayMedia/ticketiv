import { WaitlistOfferCheckout } from "@/components/quiet/screens/waitlist/waitlist-offer-checkout";
import { getMyWaitlistOffer } from "@/lib/data/attendee/waitlist";

export const metadata = { title: "Waitlist checkout" };
export const dynamic = "force-dynamic";

export default async function WaitlistOfferCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ waitlistId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { waitlistId } = await params;
  const query = (await searchParams) ?? {};
  const offer = await getMyWaitlistOffer(waitlistId);
  const orderId = typeof query.orderId === "string" ? query.orderId : null;
  const paymentId = typeof query.paymentId === "string" ? query.paymentId : null;

  return (
    <WaitlistOfferCheckout
      offer={offer}
      pendingOrderId={orderId}
      pendingPaymentId={paymentId}
    />
  );
}
