import { MyTickets } from "@/components/quiet/screens/tickets/my-tickets";

export const metadata = { title: "My tickets" };

export default function TicketsPage() {
  return (
    <div className="mx-auto max-w-[480px]">
      <MyTickets />
    </div>
  );
}
