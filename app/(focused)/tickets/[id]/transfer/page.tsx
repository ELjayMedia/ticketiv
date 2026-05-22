import { Transfer } from "@/components/quiet/screens/tickets/transfer";

export const metadata = { title: "Transfer ticket" };

export default async function TransferPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="h-dvh">
      <Transfer />
    </div>
  );
}
