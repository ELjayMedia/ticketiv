import { WaitlistOfferCheckout } from "@/components/quiet/screens/waitlist/waitlist-offer-checkout";
import { getMyWaitlistOffer } from "@/lib/data/attendee/waitlist";

export const metadata = { title: "Waitlist checkout" };
export const dynamic = "force-dynamic";

export default async function WaitlistOfferCheckoutPage({
  params,
}: {
  params: Promise<{ waitlistId: string }>;
}) {
  const { waitlistId } = await params;
  const offer = await getMyWaitlistOffer(waitlistId);

  return <WaitlistOfferCheckout offer={offer} />;
}
