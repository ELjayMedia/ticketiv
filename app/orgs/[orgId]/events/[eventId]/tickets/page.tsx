import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import Link from "next/link"

import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"
import { getDemoEventById } from "@/lib/demo-data"
import { DeleteTicketTypeButton } from "./_components/delete-ticket-type-button"

export const dynamic = "force-dynamic"

export default async function TicketsPage({ params }: { params: { orgId: string; eventId: string } }) {
  const { orgId, eventId } = params
  const cookieStore = await cookies()
  const demoSessionCookie = cookieStore.get("demo_session")

  let event: any = null
  let ticketTypes: any[] = []

  if (demoSessionCookie) {
    try {
      event = getDemoEventById(eventId)
      if (!event) return redirect("/403")
      ticketTypes = [
        { id: "general", name: "General Admission", price_cents: 12900, quota: 100, per_user_limit: 5 },
        { id: "vip", name: "VIP", price_cents: 29900, quota: 20, per_user_limit: 2 },
      ]
    } catch {
      /* fall through */
    }
  } else {
    const supabase = createServerSupabaseClient()
    if (!supabase) return redirect("/login")

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return redirect("/login")

    const { data: eventData } = await supabase
      .from("events")
      .select("id, title")
      .eq("id", eventId)
      .eq("org_id", orgId)
      .maybeSingle()
    if (!eventData) return redirect("/403")
    event = eventData

    const { data: types = [] } = await supabase
      .from("ticket_types")
      .select("id, name, price_cents, quota, per_user_limit")
      .eq("event_id", eventId)
    ticketTypes = types ?? []
  }

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex flex-col gap-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/orgs/${orgId}/events/${eventId}/edit`}
              aria-label="Back to event"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink hover:bg-bg"
            >
              <Icon name="chevL" size={16} />
            </Link>
            <div className="flex flex-col gap-1">
              <h1 className="text-h1">Ticket types</h1>
              <p className="text-[13px] text-ink-3">{event?.title}</p>
            </div>
          </div>
          <Link href={`/orgs/${orgId}/events/${eventId}/tickets/new`}>
            <Button variant="primary" size="md">
              <Icon name="plus" size={14} />
              Add ticket type
            </Button>
          </Link>
        </div>

        <div className="flex flex-col gap-4">
          {ticketTypes.length === 0 ? (
            <Card>
              <CardBody className="flex flex-col items-center justify-center gap-4 py-12">
                <p className="text-[13px] text-ink-3">No ticket types yet.</p>
                <Link href={`/orgs/${orgId}/events/${eventId}/tickets/new`}>
                  <Button variant="primary" size="md">
                    <Icon name="plus" size={14} />
                    Create first ticket type
                  </Button>
                </Link>
              </CardBody>
            </Card>
          ) : (
            ticketTypes.map((ticket) => (
              <Card key={ticket.id}>
                <CardBody className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <p className="text-h3">{ticket.name}</p>
                    <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                      ID · {ticket.id}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/orgs/${orgId}/events/${eventId}/tickets/${ticket.id}/edit`}>
                      <Button variant="outline" size="sm">Edit</Button>
                    </Link>
                    <DeleteTicketTypeButton eventId={eventId} ticketTypeId={ticket.id} />
                  </div>
                </CardBody>
                <CardDivider />
                <CardBody>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-label">Price</span>
                      <span className="inline-flex items-center gap-1.5 font-mono text-[14px] font-semibold tabular-nums text-ink">
                        <Icon name="wallet" size={14} className="text-ink-3" />
                        ${(ticket.price_cents / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-label">Quota</span>
                      <span className="inline-flex items-center gap-1.5 font-mono text-[14px] font-semibold tabular-nums text-ink">
                        <Icon name="users" size={14} className="text-ink-3" />
                        {ticket.quota}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-label">Per-user limit</span>
                      <span className="font-mono text-[14px] font-semibold tabular-nums text-ink">
                        {ticket.per_user_limit}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-label">Status</span>
                      <Chip size="sm" variant="active" className="w-fit">Active</Chip>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))
          )}
        </div>
      </div>
    </main>
  )
}
