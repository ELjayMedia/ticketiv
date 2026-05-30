import { TicketView } from "@/components/quiet/screens/tickets/ticket-view"
import { TokenRecoveryScreen } from "@/components/quiet/screens/tickets/token-recovery"
import { mapTicketView } from "@/lib/mappers/tickets"
import { MyTicketsViewSchema } from "@/lib/schemas/views"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyTicketToken } from "@/lib/ticket-tokens"

// TICK-75 — Capability-token ticket route.
//
// Opens a ticket from a delivered link (WhatsApp/SMS/email) without requiring
// a logged-in session. The token grants *view* only — every status decision
// (issued / transferred / refunded / revoked / checked_in) is still read live
// from the database, and TicketView already withholds the QR for non-valid
// states. No mutations are reachable from this page.

export const metadata = { title: "Your ticket" }
export const dynamic = "force-dynamic"

export default async function TokenTicketPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const verification = verifyTicketToken(token)
  if (!verification.ok) return <TokenRecoveryScreen reason={verification.reason} />

  // Admin client is intentional: this path is gated by the verified capability
  // token, not by a logged-in session. The query is locked to the single
  // order_item the token names — never broader.
  const admin = createAdminClient()
  const { data: rawRow } = await admin
    .from("v_my_tickets")
    .select("*")
    .eq("order_item_id", verification.orderItemId)
    .maybeSingle()

  if (!rawRow) return <TokenRecoveryScreen reason="bad_signature" />

  const parsed = MyTicketsViewSchema.safeParse(rawRow)
  if (!parsed.success) return <TokenRecoveryScreen reason="malformed" />

  return <TicketView ticket={mapTicketView(parsed.data)} />
}
