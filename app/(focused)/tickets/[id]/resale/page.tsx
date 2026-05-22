import { Resale } from "@/components/quiet/screens/tickets/resale";

export const metadata = { title: "Resell ticket" };

export default async function ResalePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="h-dvh">
      <Resale />
    </div>
  );
}
