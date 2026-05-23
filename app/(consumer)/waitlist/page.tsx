import { WaitlistCentre } from "@/components/quiet/screens/waitlist/waitlist-centre";
import { getMyWaitlistEntries } from "@/lib/data/attendee/waitlist";

export const metadata = { title: "Waitlist" };
export const dynamic = "force-dynamic";

export default async function WaitlistPage() {
  const entries = await getMyWaitlistEntries();

  return <WaitlistCentre entries={entries} />;
}
