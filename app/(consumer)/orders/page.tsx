import { AccountEmptyPage } from "@/components/quiet/screens/account/account-empty-page";

export const metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

export default function OrdersPage() {
  return (
    <AccountEmptyPage
      eyebrow="Orders"
      title="Orders"
      description="Your purchase records, receipts and refund updates will be collected here once the account ledger view is wired."
      icon="fileText"
      primaryHref="/tickets"
      primaryLabel="My tickets"
      secondaryHref="/me"
      secondaryLabel="Account"
      bullets={[
        "Recent ticket orders",
        "Receipt and refund status",
        "Links back to the related tickets",
      ]}
    />
  );
}
