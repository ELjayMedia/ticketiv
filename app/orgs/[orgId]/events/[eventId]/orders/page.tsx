import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import Link from "next/link"

import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"

export const dynamic = "force-dynamic"

// TICK-49 — Orders, attendee & support management

type View = "orders" | "attendees"

const STATUS_CHIP: Record<string, "active" | "muted" | "default" | "accent"> = {
  paid: "active",
  pending: "muted",
  failed: "default",
  refunded: "accent",
}

function statusVariant(s: string): "active" | "muted" | "default" | "accent" {
  return STATUS_CHIP[s] ?? "default"
}

function fmtDate(d: string | null) {
  if (!d) return "—"
  return new Intl.DateTimeFormat("en-SZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(d))
}

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

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string; eventId: string }>
  searchParams?: Promise<{ view?: string; status?: string; q?: string }>
}) {
  const { orgId, eventId } = await params
  const sp = searchParams ? await searchParams : {}
  const view = (sp.view ?? "orders") as View
  const filterStatus = sp.status
  const filterQ = sp.q?.toLowerCase()

  const supabase = createServerSupabaseClient()
  if (!supabase) return redirect("/login")

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return redirect("/login")

  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("id", eventId)
    .eq("org_id", orgId)
    .maybeSingle()
  if (!event) return redirect("/403")

  // Fetch order_items for this event (joined through ticket_types)
  const { data: itemRows = [] } = await supabase
    .from("order_items")
    .select(`
      id, ticket_code, status, holder_name, holder_email, holder_phone,
      checked_in_at, revoked_at, refunded_at, created_at,
      ticket_types!inner(id, name, price_cents, currency, event_id),
      orders!inner(id, status, total_cents, currency, email, buyer_email, channel, created_at, org_id)
    `)
    .eq("ticket_types.event_id", eventId)
    .eq("orders.org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(500)

  const items = (itemRows ?? []) as any[]

  // Derive unique orders from items
  const orderMap = new Map<string, any>()
  for (const item of items) {
    const order = item.orders
    if (!order) continue
    if (!orderMap.has(order.id)) {
      orderMap.set(order.id, {
        ...order,
        items: [],
      })
    }
    orderMap.get(order.id).items.push(item)
  }
  let orders = Array.from(orderMap.values())

  // Filter
  if (filterStatus) orders = orders.filter((o) => o.status === filterStatus)
  if (filterQ) {
    orders = orders.filter((o) => {
      const haystack = [o.email, o.buyer_email, o.id, o.channel].filter(Boolean).join(" ").toLowerCase()
      return haystack.includes(filterQ)
    })
  }

  const totalRevenueCents = orders.filter((o) => o.status === "paid").reduce((s: number, o: any) => s + o.total_cents, 0)
  const ticketsSold = items.filter((i: any) => i.status === "issued" || i.status === "checked_in").length
  const checkedIn = items.filter((i: any) => i.status === "checked_in").length

  // Attendee list for attendees view — filter by holder name/email, ticket
  // code or ticket type (search) and order_item status.
  const attendees =
    view === "attendees"
      ? items.filter((it: any) => {
          if (filterStatus && it.status !== filterStatus) return false
          if (filterQ) {
            const hay = [
              it.holder_name,
              it.holder_email,
              it.ticket_code,
              it.ticket_types?.name,
              it.orders?.buyer_email,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
            if (!hay.includes(filterQ)) return false
          }
          return true
        })
      : []

  const tabHref = (v: View) => `/orgs/${orgId}/events/${eventId}/orders?view=${v}`

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/orgs/${orgId}/events/${eventId}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-3 hover:bg-bg hover:text-ink"
            >
              <Icon name="chevL" size={16} />
            </Link>
            <div className="flex flex-col gap-0.5">
              <h1 className="text-h1">Orders & attendees</h1>
              <p className="text-[13px] text-ink-3">{event.title}</p>
            </div>
          </div>
          <a
            href={`/api/orgs/${orgId}/events/${eventId}/attendees.csv`}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-transparent px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-bg"
          >
            <Icon name="download" size={14} />
            Export attendees CSV
          </a>
        </div>

        {/* KPI tiles */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Total orders" value={orderMap.size} />
          <StatTile label="Gross revenue" value={`SZL ${(totalRevenueCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`} />
          <StatTile label="Tickets issued" value={ticketsSold} />
          <StatTile label="Checked in" value={`${checkedIn} / ${ticketsSold}`} />
        </div>

        {/* View tabs */}
        <div className="flex gap-1 border-b border-line pb-0">
          {(["orders", "attendees"] as View[]).map((v) => (
            <Link
              key={v}
              href={tabHref(v)}
              className={[
                "inline-flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-semibold capitalize transition-colors",
                view === v
                  ? "border-b-2 border-ink text-ink"
                  : "text-ink-3 hover:text-ink",
              ].join(" ")}
            >
              {v}
              <span className="font-mono text-[11px] tabular-nums text-ink-3">
                {v === "orders" ? orderMap.size : items.length}
              </span>
            </Link>
          ))}
        </div>

        {/* Filters */}
        <Card flat className="border border-line">
          <CardBody className="p-4">
            <form className="flex flex-wrap gap-3">
              <input type="hidden" name="view" value={view} />
              <input
                name="q"
                defaultValue={sp.q ?? ""}
                placeholder={
                  view === "attendees"
                    ? "Search holder name, email or ticket code…"
                    : "Search buyer email or order ID…"
                }
                className="flex-1 min-w-48 rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-2 text-[13px] text-ink outline-none transition focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
              />
              <select
                name="status"
                defaultValue={filterStatus ?? ""}
                className="rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-2 text-[13px] text-ink outline-none"
              >
                <option value="">All statuses</option>
                {view === "attendees" ? (
                  <>
                    <option value="issued">Issued</option>
                    <option value="checked_in">Checked in</option>
                    <option value="transferred">Transferred</option>
                    <option value="revoked">Revoked</option>
                    <option value="refunded">Refunded</option>
                  </>
                ) : (
                  <>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                  </>
                )}
              </select>
              <button
                type="submit"
                className="rounded-[var(--radius)] border border-line-2 bg-surface px-4 py-2 text-[13px] font-semibold text-ink transition hover:bg-bg"
              >
                Filter
              </button>
              {(filterStatus || filterQ) && (
                <Link
                  href={tabHref(view)}
                  className="rounded-[var(--radius)] px-4 py-2 text-[13px] font-semibold text-ink-3 transition hover:text-ink"
                >
                  Clear
                </Link>
              )}
            </form>
          </CardBody>
        </Card>

        {/* Orders view */}
        {view === "orders" && (
          <Card>
            <CardBody className="px-5 py-4">
              <p className="text-label">
                Orders{orders.length !== orderMap.size ? ` (${orders.length} of ${orderMap.size})` : ` (${orders.length})`}
              </p>
            </CardBody>
            <CardDivider />
            {orders.length === 0 ? (
              <CardBody className="py-12 text-center text-[13px] text-ink-3">
                No orders match the current filters.
              </CardBody>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="px-5 py-3 text-left text-label">Order</th>
                      <th className="px-5 py-3 text-left text-label">Buyer</th>
                      <th className="px-5 py-3 text-left text-label">Channel</th>
                      <th className="px-5 py-3 text-right text-label">Items</th>
                      <th className="px-5 py-3 text-right text-label">Total</th>
                      <th className="px-5 py-3 text-left text-label">Status</th>
                      <th className="px-5 py-3 text-left text-label">Date</th>
                      <th className="px-5 py-3 text-right text-label">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order, i) => (
                      <tr key={order.id} className={i > 0 ? "border-t border-line" : ""}>
                        <td className="px-5 py-3 font-mono text-[12px] text-ink-3">
                          {order.id.slice(0, 8)}…
                        </td>
                        <td className="px-5 py-3 text-[13px] text-ink">
                          {order.buyer_email ?? order.email ?? "—"}
                        </td>
                        <td className="px-5 py-3">
                          <Chip size="sm" variant="muted" className="capitalize">
                            {order.channel ?? "online"}
                          </Chip>
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-[13px] tabular-nums text-ink">
                          {order.items?.length ?? 0}
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-[13px] font-semibold tabular-nums text-ink">
                          SZL {((order.total_cents ?? 0) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-3">
                          <Chip size="sm" variant={statusVariant(order.status)} className="capitalize">
                            {order.status}
                          </Chip>
                        </td>
                        <td className="px-5 py-3 font-mono text-[12px] text-ink-3">
                          {fmtDate(order.created_at)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link
                            href={`/orgs/${orgId}/events/${eventId}/orders/${order.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-3 hover:bg-bg hover:text-ink"
                          >
                            <Icon name="arrowR" size={14} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Attendees view */}
        {view === "attendees" && (
          <Card>
            <CardBody className="px-5 py-4">
              <p className="text-label">
                Attendees{attendees.length !== items.length ? ` (${attendees.length} of ${items.length})` : ` (${items.length})`}
              </p>
            </CardBody>
            <CardDivider />
            {attendees.length === 0 ? (
              <CardBody className="py-12 text-center text-[13px] text-ink-3">
                {items.length === 0 ? "No attendees yet." : "No attendees match the current filters."}
              </CardBody>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="px-5 py-3 text-left text-label">Ticket code</th>
                      <th className="px-5 py-3 text-left text-label">Holder</th>
                      <th className="px-5 py-3 text-left text-label">Ticket type</th>
                      <th className="px-5 py-3 text-left text-label">Check-in</th>
                      <th className="px-5 py-3 text-left text-label">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendees.map((item: any, i: number) => (
                      <tr key={item.id} className={i > 0 ? "border-t border-line" : ""}>
                        <td className="px-5 py-3 font-mono text-[12px] text-ink">
                          {item.ticket_code}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[13px] font-semibold text-ink">
                              {item.holder_name ?? "—"}
                            </span>
                            <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                              {item.holder_email ?? item.orders?.buyer_email ?? "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-[13px] text-ink">
                          {item.ticket_types?.name ?? "—"}
                        </td>
                        <td className="px-5 py-3 font-mono text-[12px] text-ink-3">
                          {item.checked_in_at ? (
                            <span className="text-success">{fmtDate(item.checked_in_at)}</span>
                          ) : (
                            "Not checked in"
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <Chip
                            size="sm"
                            variant={
                              item.status === "checked_in" || item.status === "issued"
                                ? "active"
                                : item.status === "refunded" || item.status === "revoked"
                                  ? "muted"
                                  : "default"
                            }
                            className="capitalize"
                          >
                            {item.status}
                          </Chip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>
    </main>
  )
}
