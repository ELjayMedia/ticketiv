import Link from "next/link"

import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"
import { TokenRecoveryScreen } from "@/components/quiet/screens/tickets/token-recovery"
import { ticketDisplayStatus, type TicketDisplayStatus } from "@/lib/mappers/tickets"
import { MyTicketsViewSchema, type MyTicketsView } from "@/lib/schemas/views"
import { createAdminClient } from "@/lib/supabase/admin"
import { issueTicketToken, verifyOrderToken } from "@/lib/ticket-tokens"

// TICK-77 — Order-level capability-token route.
//
// Opens the buyer's full order from a delivered link, listing every issued
// ticket in the bundle. Each row links to its own per-item /t/{token} page
// (same secret, same TTL, view-only) so a buyer can forward a single ticket
// to a friend on WhatsApp without leaking the whole order.
//
// Capability-scoped to one order id; no mutations reachable. Live status is
// read from v_my_tickets, so transferred/refunded/revoked/checked-in tickets
// show their badge accurately.

export const metadata = { title: "Your tickets" }
export const dynamic = "force-dynamic"

const STATUS_LABEL: Record<TicketDisplayStatus, string> = {
  issued: "Valid",
  checked_in: "Checked in",
  transferred: "Transferred",
  refunded: "Refunded",
  revoked: "Revoked",
}

const STATUS_VARIANT: Record<TicketDisplayStatus, "active" | "muted" | "default"> = {
  issued: "active",
  checked_in: "muted",
  transferred: "muted",
  refunded: "muted",
  revoked: "muted",
}

export default async function OrderTokenPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const verification = verifyOrderToken(token)
  if (!verification.ok) return <TokenRecoveryScreen reason={verification.reason} />

  const admin = createAdminClient()
  const { data: rawRows } = await admin
    .from("v_my_tickets")
    .select("*")
    .eq("order_id", verification.orderId)

  if (!rawRows || rawRows.length === 0) return <TokenRecoveryScreen reason="bad_signature" />

  const rows: MyTicketsView[] = []
  for (const raw of rawRows) {
    const parsed = MyTicketsViewSchema.safeParse(raw)
    if (parsed.success) rows.push(parsed.data)
  }
  if (rows.length === 0) return <TokenRecoveryScreen reason="malformed" />

  // Reuse the same expiry the order token was issued with — keeps per-item
  // links from outliving the bundle link the buyer was given.
  const perItemExpSeconds = Math.floor(verification.expiresAt.getTime() / 1000)
  const eventTitle = rows[0].event_title
  const start = rows[0].event_starts_at ? new Date(rows[0].event_starts_at) : null

  return (
    <main className="flex min-h-dvh flex-col bg-bg">
      <div className="container mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-8">
        <div className="flex flex-col gap-1">
          <p className="text-label">Your tickets</p>
          <h1 className="text-h1">{eventTitle}</h1>
          {start && (
            <p className="text-[13px] text-ink-3">
              {start.toLocaleString("en-SZ", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          )}
        </div>

        <Card>
          <CardBody className="px-5 py-3">
            <p className="text-label">{rows.length} {rows.length === 1 ? "ticket" : "tickets"}</p>
          </CardBody>
          <CardDivider />
          <div className="divide-y divide-line">
            {rows.map((row) => {
              const status = ticketDisplayStatus(row)
              const display: TicketDisplayStatus = status === "pending" ? "issued" : status
              const itemToken = issueTicketToken(row.order_item_id, perItemExpSeconds)
              const href = itemToken ? `/t/${itemToken}` : `/tickets/${row.order_item_id}`
              return (
                <Link
                  key={row.order_item_id}
                  href={href}
                  className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-surface-2"
                >
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[14px] font-semibold text-ink">{row.ticket_type_name}</p>
                    <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                      Ticket · {row.order_item_id.slice(0, 6).toUpperCase()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Chip size="sm" variant={STATUS_VARIANT[display]}>{STATUS_LABEL[display]}</Chip>
                    <Icon name="chevR" size={16} className="text-ink-3" />
                  </div>
                </Link>
              )
            })}
          </div>
        </Card>

        <p className="px-1 text-[12px] text-ink-3">
          Forward an individual ticket by tapping it and sharing that page&apos;s link — each ticket has its own secure QR.
        </p>
      </div>
    </main>
  )
}
