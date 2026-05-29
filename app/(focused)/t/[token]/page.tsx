import Link from "next/link"

import { TicketView } from "@/components/quiet/screens/tickets/ticket-view"
import { mapTicketView } from "@/lib/mappers/tickets"
import { MyTicketsViewSchema } from "@/lib/schemas/views"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyTicketToken } from "@/lib/ticket-tokens"

type RecoveryReason =
  | "missing_secret"
  | "malformed"
  | "bad_signature"
  | "expired"
  | "unsupported_version"
import { Card, CardBody } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"

// TICK-75 — Capability-token ticket route.
//
// Opens a ticket from a delivered link (WhatsApp/SMS/email) without requiring
// a logged-in session. The token grants *view* only — every status decision
// (issued / transferred / refunded / revoked / checked_in) is still read live
// from the database, and TicketView already withholds the QR for non-valid
// states. No mutations are reachable from this page.

export const metadata = { title: "Your ticket" }
export const dynamic = "force-dynamic"

function RecoveryScreen({ reason }: { reason: RecoveryReason }) {
  const copy: Record<RecoveryReason, { title: string; body: string }> = {
    missing_secret: {
      title: "Ticket links are temporarily unavailable",
      body: "Open your ticket from the Ticketiv app — it's saved under My Tickets on the device you used to buy.",
    },
    malformed: {
      title: "This ticket link looks broken",
      body: "Try opening the link again from the original message, or sign in to find it under My Tickets.",
    },
    bad_signature: {
      title: "This ticket link can't be verified",
      body: "For your security, this link is no longer active. Sign in with the phone or email used at checkout to recover your ticket.",
    },
    expired: {
      title: "This ticket link has expired",
      body: "For your security, this link is no longer active. Sign in with the phone or email used at checkout to recover your ticket.",
    },
    unsupported_version: {
      title: "This ticket link is out of date",
      body: "Open Ticketiv and find your ticket under My Tickets, or contact support if you can't sign in.",
    },
  } as const

  const c = copy[reason]
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10">
      <Card className="max-w-md">
        <CardBody className="flex flex-col gap-4 p-6 text-center">
          <Icon name="ticket" size={28} className="mx-auto text-ink-3" />
          <h1 className="text-h2">{c.title}</h1>
          <p className="text-[14px] text-ink-3">{c.body}</p>
          <div className="flex flex-col gap-2 pt-2">
            <Link
              href="/tickets"
              className="inline-flex items-center justify-center rounded-md bg-ink px-4 py-2 text-[14px] font-semibold text-bg"
            >
              Sign in to My Tickets
            </Link>
            <Link href="/support" className="text-[13px] text-ink-3">
              Contact support
            </Link>
          </div>
        </CardBody>
      </Card>
    </main>
  )
}

export default async function TokenTicketPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const verification = verifyTicketToken(token)
  if (!verification.ok) return <RecoveryScreen reason={verification.reason} />

  // Admin client is intentional: this path is gated by the verified capability
  // token, not by a logged-in session. The query is locked to the single
  // order_item the token names — never broader.
  const admin = createAdminClient()
  const { data: rawRow } = await admin
    .from("v_my_tickets")
    .select("*")
    .eq("order_item_id", verification.orderItemId)
    .maybeSingle()

  if (!rawRow) return <RecoveryScreen reason="bad_signature" />

  const parsed = MyTicketsViewSchema.safeParse(rawRow)
  if (!parsed.success) return <RecoveryScreen reason="malformed" />

  return <TicketView ticket={mapTicketView(parsed.data)} />
}
