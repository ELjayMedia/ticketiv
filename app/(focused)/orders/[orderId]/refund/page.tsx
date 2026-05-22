import { Refund } from "@/components/quiet/screens/tickets/refund";

export const metadata = { title: "Request refund" };

export default async function RefundPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return (
    <div className="h-dvh">
      <Refund />
    </div>
  );
}
