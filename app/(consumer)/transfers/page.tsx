import { redirect } from "next/navigation";

// Transfers live in the My Tickets "Transfers" tab (accept, decline, cancel and
// history). This route stays only so old links, emails and notifications land
// in the right place.
export default function TransfersPage() {
  redirect("/tickets?tab=transfers");
}
