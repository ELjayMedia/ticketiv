import { AccountEmptyPage } from "@/components/quiet/screens/account/account-empty-page";

export const metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default function NotificationsPage() {
  return (
    <AccountEmptyPage
      eyebrow="Updates"
      title="Notifications"
      description="Ticket, transfer, waitlist, listing, refund and event updates will be collected here with direct actions."
      icon="bell"
      primaryHref="/tickets"
      primaryLabel="My tickets"
      secondaryHref="/me"
      secondaryLabel="Account"
      bullets={[
        "Ticket purchase and event reminders",
        "Transfer and waitlist updates",
        "Refund, listing and event-change alerts",
      ]}
    />
  );
}
