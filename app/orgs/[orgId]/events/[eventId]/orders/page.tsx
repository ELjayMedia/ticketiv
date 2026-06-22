import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import Link from "next/link"
import React from "react"

import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"
import { EmptyState } from "@/components/quiet/ui/empty-state"
import { AttendeesBulkTable } from "./attendees-bulk-table"
import { CompTicketButton } from "./comp-ticket-button"
import { EmailAttendeesButton } from "./email-attendees-button"

export const dynamic = "force-dynamic"

// TICK-238: Server-side search + pagination (50 rows/page) replacing the 500-item client-side limit.

const PAGE_SIZE = 50
type View = "orders" | "attendees"

const ORDER_STATUS_CHIP: Record<string, "active" | "muted" | "default" | "accent"> = {
  paid: "active",
  pending: "muted",
  failed: "default",
  refunded: "accent",
}

function orderStatusVariant(s: string): "active" | "muted" | "default" | "accent" {
  return ORDER_STATUS_CHIP[s] ?? "default"
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

function Paginator({
  page,
  totalPages,
  buildHref,
}: {
  page: number
  totalPages: number
  buildHref: (p: number) => string
}) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between border-t border-line px-5 py-3">
      <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
        Page {page} of {totalPages}
      </span>
      <div className="flex items-center gap-1">
        {page > 1 && (
          <Link
            href={buildHref(page - 1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-3 hover:bg-bg hover:text-ink"
          >
            <Icon name="chevL" size={14} />
          </Link>
        )}
        {page < totalPages && (
          <Link
            href={buildHref(page + 1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-3 hover:bg-bg hover:text-ink"
          >
            <Icon name="chevR" size={14} />
          </Link>
        )}
      </div>
    </div>
  )
}

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string; eventId: string }>
  searchParams?: Promise<{ view?: string; status?: string; q?: string; page?: string }>
}) {
  const { orgId, eventId } = await params
  const sp = searchParams ? await searchParams : {}
  const view = (sp.view ?? "orders") as View
  const filterStatus = sp.status ?? ""
  const filterQ = sp.q ?? ""
  const page = Math.max(1, parseInt(sp.page ?? "1") || 1)
  const rangeFrom = (page - 1) * PAGE_SIZE
  const rangeTo = rangeFrom + PAGE_SIZE - 1

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

  // KPI figures from the materialized stats view
  const { data: liveStats } = await supabase
    .from("event_live_stats")
    .select("tickets_sold, gross_sales_cents, checked_in_count")
    .eq("event_id", eventId)
    .maybeSingle()

  // Ticket types for the comp-ticket modal (TICK-237)
  const { data: ticketTypesRaw } = await supabase
    .from("ticket_types")
    .select("id, name, price_cents")
    .eq("event_id", eventId)
    .order("name")
  const ticketTypes = (ticketTypesRaw ?? []).map((tt) => ({
    id: tt.id,
    name: tt.name,
    price_cents: tt.price_cents ?? 0,
  }))

  // Lightweight fetch of all order IDs for this event (just UUIDs).
  // Used for: orders tab count and item-count-per-order in the orders table.
  const { data: eventItems } = await supabase
    .from("order_items")
    .select("order_id, ticket_types!inner(id), orders!inner(org_id)")
    .eq("ticket_types.event_id", eventId)
    .eq("orders.org_id", orgId)
    .limit(10000)

  const orderItemCountMap = new Map<string, number>()
  for (const row of (eventItems ?? []) as any[]) {
    const oid = row.order_id as string
    orderItemCountMap.set(oid, (orderItemCountMap.get(oid) ?? 0) + 1)
  }
  const allOrderIds = [...orderItemCountMap.keys()]
  const totalOrdersCount = allOrderIds.length
  const totalAttendees = liveStats?.tickets_sold ?? 0

  // ── Orders view ──────────────────────────────────────────────────────────────
  let orders: any[] = []
  let ordersResultCount = 0

  if (view === "orders" && allOrderIds.length > 0) {
    let q = supabase
      .from("orders")
      .select(
        "id, status, total_cents, currency, buyer_email, email, channel, created_at",
        { count: "exact" },
      )
      .eq("org_id", orgId)
      .in("id", allOrderIds)
      .order("created_at", { ascending: false })
      .range(rangeFrom, rangeTo)

    if (filterQ) {
      q = q.or(`buyer_email.ilike.%${filterQ}%,email.ilike.%${filterQ}%`)
    }
    if (filterStatus) {
      q = q.eq("status", filterStatus as any)
    }

    const { data, count } = await q
    orders = (data as any[]) ?? []
    ordersResultCount = count ?? 0
  }

  // ── Attendees view ───────────────────────────────────────────────────────────
  let attendees: any[] = []
  let attendeesResultCount = 0

  if (view === "attendees") {
    let q = supabase
      .from("order_items")
      .select(
        `id, ticket_code, status, holder_name, holder_email, checked_in_at, created_at,
         ticket_types!inner(name, event_id),
         orders!inner(buyer_email, org_id)`,
        { count: "exact" },
      )
      .eq("ticket_types.event_id", eventId)
      .eq("orders.org_id", orgId)
      .order("created_at", { ascending: false })
      .range(rangeFrom, rangeTo)

    if (filterQ) {
      q = q.or(
        `holder_name.ilike.%${filterQ}%,holder_email.ilike.%${filterQ}%,ticket_code.ilike.%${filterQ}%`,
      )
    }
    if (filterStatus) {
      q = q.eq("status", filterStatus as any)
    }

    const { data, count } = await q
    attendees = (data as any[]) ?? []
    attendeesResultCount = count ?? 0
  }

  const currentCount = view === "orders" ? ordersResultCount : attendeesResultCount
  const totalPages = Math.ceil(currentCount / PAGE_SIZE)

  const buildHref = (p: number) => {
    const next = new URLSearchParams()
    next.set("view", view)
    if (filterQ) next.set("q", filterQ)
    if (filterStatus) next.set("status", filterStatus)
    if (p > 1) next.set("page", String(p))
    return `/orgs/${orgId}/events/${eventId}/orders?${next.toString()}`
  }

  const tabHref = (v: View) => {
    const next = new URLSearchParams()
    next.set("view", v)
    if (filterQ) next.set("q", filterQ)
    if (filterStatus) next.set("status", filterStatus)
    return `/orgs/${orgId}/events/${eventId}/orders?${next.toString()}`
  }

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
          <div className="flex items-center gap-2">
            <EmailAttendeesButton
              orgId={orgId}
              eventId={eventId}
              ticketTypes={ticketTypes.map((tt) => ({ id: tt.id, name: tt.name }))}
            />
            {ticketTypes.length > 0 && (
              <CompTicketButton orgId={orgId} eventId={eventId} ticketTypes={ticketTypes} />
            )}
            <a
              href={`/api/orgs/${orgId}/events/${eventId}/attendees.csv`}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-transparent px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-bg"
            >
              <Icon name="download" size={14} />
              Export attendees CSV
            </a>
          </div>
        </div>

        {/* KPI tiles */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Total orders" value={totalOrdersCount.toLocaleString()} />
          <StatTile
            label="Gross revenue"
            value={`SZL ${((liveStats?.gross_sales_cents ?? 0) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          />
          <StatTile label="Tickets issued" value={(liveStats?.tickets_sold ?? 0).toLocaleString()} />
          <StatTile
            label="Checked in"
            value={`${(liveStats?.checked_in_count ?? 0).toLocaleString()} / ${(liveStats?.tickets_sold ?? 0).toLocaleString()}`}
          />
        </div>

        {/* View tabs */}
        <div className="flex gap-1 border-b border-line pb-0">
          {(["orders", "attendees"] as View[]).map((v) => (
            <Link
              key={v}
              href={tabHref(v)}
              className={[
                "inline-flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-semibold capitalize transition-colors",
                view === v ? "border-b-2 border-ink text-ink" : "text-ink-3 hover:text-ink",
              ].join(" ")}
            >
              {v}
              <span className="font-mono text-[11px] tabular-nums text-ink-3">
                {v === "orders" ? totalOrdersCount.toLocaleString() : totalAttendees.toLocaleString()}
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
                defaultValue={filterQ}
                placeholder={
                  view === "attendees"
                    ? "Search holder name, email or ticket code…"
                    : "Search buyer email or order ID…"
                }
                className="min-w-48 flex-1 rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-2 text-[13px] text-ink outline-none transition focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
              />
              <select
                name="status"
                defaultValue={filterStatus}
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
                  href={`/orgs/${orgId}/events/${eventId}/orders?view=${view}`}
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
                {filterQ || filterStatus
                  ? `Orders — ${ordersResultCount.toLocaleString()} of ${totalOrdersCount.toLocaleString()}`
                  : `Orders (${totalOrdersCount.toLocaleString()})`}
              </p>
            </CardBody>
            <CardDivider />
            {orders.length === 0 ? (
              <CardBody className="py-12">
                <EmptyState
                  icon="ticket"
                  title={filterQ || filterStatus ? "No orders match" : "No orders yet"}
                  description={
                    filterQ || filterStatus
                      ? "Try adjusting the search or status filter."
                      : "Orders will appear here once tickets are sold."
                  }
                  compact
                />
              </CardBody>
            ) : (
              <>
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
                            {orderItemCountMap.get(order.id) ?? 0}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-[13px] font-semibold tabular-nums text-ink">
                            SZL{" "}
                            {((order.total_cents ?? 0) / 100).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-5 py-3">
                            <Chip
                              size="sm"
                              variant={orderStatusVariant(order.status)}
                              className="capitalize"
                            >
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
                <Paginator page={page} totalPages={totalPages} buildHref={buildHref} />
              </>
            )}
          </Card>
        )}

        {/* Attendees view — TICK-235: bulk check-in via AttendeesBulkTable client component */}
        {view === "attendees" && (
          <AttendeesBulkTable
            attendees={attendees}
            orgId={orgId}
            eventId={eventId}
            totalCount={attendeesResultCount}
            filterActive={!!(filterQ || filterStatus)}
            paginator={<Paginator page={page} totalPages={totalPages} buildHref={buildHref} />}
          />
        )}

      </div>
    </main>
  )
}
