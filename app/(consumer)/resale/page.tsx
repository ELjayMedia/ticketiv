import { AccountEmptyPage } from "@/components/quiet/screens/account/account-empty-page";

export const metadata = { title: "Resale" };
export const dynamic = "force-dynamic";

export default function ResalePage() {
  return (
    <AccountEmptyPage
      eyebrow="Ticket listings"
      title="Resale"
      description="Tickets you make available to another buyer, and tickets you buy from another fan, will be managed here once the listing flow is wired."
      icon="ticket"
      primaryHref="/tickets"
      primaryLabel="My tickets"
      secondaryHref="/"
      secondaryLabel="Browse events"
      bullets={[
        "Eligible tickets you can list",
        "Active, completed, expired and cancelled listings",
        "Purchased listings that transfer into My tickets",
      ]}
    />
  );
}
