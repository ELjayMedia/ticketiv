import { ResaleCheckoutReview } from "@/components/quiet/screens/resale/resale-checkout-review";
import { getPublicTicketListing } from "@/lib/data/attendee/ticket-listings";

export const metadata = { title: "Resale checkout" };
export const dynamic = "force-dynamic";

export default async function ResaleCheckoutPage({
  params,
}: {
  params: Promise<{ listingId: string }>;
}) {
  const { listingId } = await params;
  const listing = await getPublicTicketListing(listingId);

  return <ResaleCheckoutReview listing={listing} />;
}
