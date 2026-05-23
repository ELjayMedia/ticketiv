import { AccountEmptyPage } from "@/components/quiet/screens/account/account-empty-page";

export const metadata = { title: "Transfers" };
export const dynamic = "force-dynamic";

export default function TransfersPage() {
  return (
    <AccountEmptyPage
      eyebrow="Ticket ownership"
      title="Transfers"
      description="Incoming and outgoing ticket transfers will appear here with expiry, acceptance, decline, and ownership status."
      icon="arrowUR"
      primaryHref="/tickets"
      primaryLabel="My tickets"
      secondaryHref="/me"
      secondaryLabel="Account"
      bullets={[
        "Tickets sent to you",
        "Tickets you have sent to someone else",
        "Pending, accepted, declined, expired and cancelled states",
      ]}
    />
  );
}
