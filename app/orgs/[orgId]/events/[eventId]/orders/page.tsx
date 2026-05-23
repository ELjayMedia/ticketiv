import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import Link from "next/link"

import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"
import { getDemoEventById, getDemoEventOrders } from "@/lib/demo-data"

export const dynamic = "force-dynamic"

function StatTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardBody className="flex flex-col gap-1 p-4">
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{label}</p>
        <p className="font-mono text-[22px] font-semibold tabular-nums text-ink">{value}</p>
      </CardBody>
    </Card>
  )
}

export default async function OrdersPage({ params }: { params: { orgId: string; eventId: string } }) {
  const { orgId, eventId } = params
  const cookieStore = await cookies()
  const demoSessionCookie = cookieStore.get("demo_session")

  let event: any = null
  let orders: any[] = []
  let totalRevenue = 0

  if (demoSessionCookie) {
    try {
      event = getDemoEventById(eventId)
      if (!event) return redirect("/403")
      orders = getDemoEventOrders(eventId)
      totalRevenue = orders.reduce((sum, order) => sum + order.total_amount_cents, 0)
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

    const { data: ordersData = [] } = await supabase
      .from("orders")
      .select(`
        id, status, total_amount_cents, created_at, buyer_email,
        order_items(count)
      `)
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })

    orders = ordersData ?? []
    totalRevenue = orders.reduce((sum, order) => sum + order.total_amount_cents, 0)
  }

  const ticketsSold = orders.reduce((sum, order) => sum + (order.order_items?.[0]?.count || 0), 0)

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
              <h1 className="text-h1">Orders</h1>
              <p className="text-[13px] text-ink-3">{event?.title}</p>
            </div>
          </div>
          <Button variant="outline" size="md">
            <Icon name="download" size={14} />
            Export CSV
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatTile label="Total orders" value={orders.length} />
          <StatTile
            label="Total revenue"
            value={`$${(totalRevenue / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
          />
          <StatTile label="Tickets sold" value={ticketsSold} />
        </div>

        <Card>
          <CardBody className="px-5 py-4">
            <p className="text-label">Recent orders</p>
          </CardBody>
          <CardDivider />
          {orders.length === 0 ? (
            <CardBody className="px-5 py-10 text-center">
              <p className="text-[13px] text-ink-3">No orders yet.</p>
            </CardBody>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line">
                    <th className="px-5 py-3 text-left text-label">Order ID</th>
                    <th className="px-5 py-3 text-left text-label">Buyer email</th>
                    <th className="px-5 py-3 text-left text-label">Tickets</th>
                    <th className="px-5 py-3 text-left text-label">Amount</th>
                    <th className="px-5 py-3 text-left text-label">Status</th>
                    <th className="px-5 py-3 text-left text-label">Date</th>
                    <th className="px-5 py-3 text-right text-label">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, i) => (
                    <tr key={order.id} className={i > 0 ? "border-t border-line" : ""}>
                      <td className="px-5 py-3 font-mono text-[12px] text-ink">{order.id.substring(0, 8)}…</td>
                      <td className="px-5 py-3 text-[13px] text-ink-3">{order.buyer_email}</td>
                      <td className="px-5 py-3 font-mono text-[13px] tabular-nums text-ink">
                        {order.order_items?.[0]?.count || 0}
                      </td>
                      <td className="px-5 py-3 font-mono text-[13px] font-semibold tabular-nums text-ink">
                        ${(order.total_amount_cents / 100).toFixed(2)}
                      </td>
                      <td className="px-5 py-3">
                        <Chip size="sm" variant={order.status === "completed" ? "active" : "default"}>
                          {order.status}
                        </Chip>
                      </td>
                      <td className="px-5 py-3 font-mono text-[12px] text-ink-3">{order.created_at}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          aria-label="View order"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-bg hover:text-ink"
                        >
                          <Icon name="search" size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </main>
  )
}
