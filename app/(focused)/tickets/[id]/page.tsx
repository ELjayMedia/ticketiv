import { TicketView } from "@/components/quiet/screens/tickets/ticket-view";

export const metadata = { title: "Your ticket" };

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Phase 3 wiring: real Supabase fetch with RLS on tickets.user_id
  // const ticket = await getTicketForBuyer(id);
  // if (!ticket) notFound();
  return <TicketView />;
}
