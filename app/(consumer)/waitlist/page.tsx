import { AccountEmptyPage } from "@/components/quiet/screens/account/account-empty-page";

export const metadata = { title: "Waitlist" };
export const dynamic = "force-dynamic";

export default function WaitlistPage() {
  return (
    <AccountEmptyPage
      eyebrow="Sold-out events"
      title="Waitlist"
      description="Events and ticket tiers you join a waitlist for will appear here with offer status and expiry times."
      icon="clock"
      primaryHref="/"
      primaryLabel="Find events"
      secondaryHref="/me"
      secondaryLabel="Account"
      bullets={[
        "Pending waitlist requests",
        "Available offers with expiry countdowns",
        "Expired, fulfilled and cancelled waitlist entries",
      ]}
    />
  );
}
