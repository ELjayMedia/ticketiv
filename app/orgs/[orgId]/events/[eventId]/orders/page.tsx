import Link from "next/link"
import { redirect } from "next/navigation"

import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { EmptyState } from "@/components/quiet/ui/empty-state"
import { Icon } from "@/components/quiet/ui/icon"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { AttendeesBulkTable } from "./attendees-bulk-table"
import { CompTicketButton } from "./comp-ticket-button"
import { EmailAttendeesButton } from "./email-attendees-button"
import { LiveOrderKpis } from "./live-kpis"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 50
const ORDER_STATUSES = new Set(["paid", "pending", "failed", "refunded"])
const ATTENDEE_STATUSES = new Set(["issued", "checked_in", "transferred", "revoked", "refunded"])
type View = "orders" | "attendees"

const ORDER_STATUS_CHIP: Record<string, "active" | "muted" | "default" | "accent"> = {
  paid: "active",
  pending: "muted",
  failed: "default",
  refunded: "accent",
}

function orderStatusVariant(status: string) {
  return ORDER_STATUS_CHIP[status] ?? "default"
}

function fmtDate(value: string | null) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-SZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

function Paginator({ page, totalPages, buildHref }: { page: number; totalPages: number; buildHref: (page: number) => string }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between border-t border-line px-5 py-3">
      <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Page {page} of {totalPages}</span>
      <div className="flex items-center gap-1">
        {page > 1 && (
          <Link href={buildHref(page - 1)} aria-label="Previous page" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-3 hover:bg-bg hover:text-ink">
            <Icon name="chevL" size={14} />
          </Link>
        )}
        {page < totalPages && (
          <Link href={buildHref(page + 1)} aria-label="Next page" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-3 hover:bg-bg hover:text-ink">
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
  const view: View = sp.view === "attendees" ? "attendees" : "orders"
  const rawStatus = (sp.status ?? "").trim()
  const allowedStatuses = view === "orders" ? ORDER_STATUSES : ATTENDEE_STATUSES
  const filterStatus = allowedStatuses.has(rawStatus) ? rawStatus : ""
  const filterQ = (sp.q ?? "").trim().slice(0, 200)
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1)
  const rangeFrom = (page - 1) * PAGE_SIZE
  const rangeTo = rangeFrom + PAGE_SIZE - 1
  const returnTo = `/orgs/${orgId}/events/${eventId}/orders`

  const supabase = createServerSupabaseClient()
  if (!supabase) return redirect(`/login?next=${encodeURIComponent(returnTo)}`)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect(`/login?next=${encodeURIComponent(returnTo)}`)

  const [{ data: event }, { data: member }] = await Promise.all([
    supabase.from("events").select("id, title").eq("id", eventId).eq("org_id", orgId).maybeSingle(),
    supabase.from("org_members").select("role").eq("org_id", orgId).eq("user_id", user.id).maybeSingle(),
  ])
  if (!event || !member) return redirect("/403")

  const [{ data: liveStats }, { data: ticketTypesRaw }, { data: eventItems }] = await Promise.all([
    supabase.from("event_live_stats").select("tickets_sold, gross_sales_cents, checked_in_count").eq("event_id", eventId).maybeSingle(),
    supabase.from("ticket_types").select("id, name, price_cents").eq("event_id", eventId).order("name"),
    supabase
      .from("order_items")
      .select("order_id, ticket_types!inner(id), orders!inner(org_id)")
      .eq("ticket_types.event_id", eventId)
      .eq("orders.org_id", orgId)
      .limit(10000),
  ])

  const ticketTypes = (ticketTypesRaw ?? []).map((ticketType) => ({
    id: ticketType.id,
    name: ticketType.name,
    price_cents: ticketType.price_cents ?? 0,
  }))
  const allOrderIds = [...new Set((eventItems ?? []).map((row: any) => String(row.order_id)))]
  const totalOrdersCount = allOrderIds.length
  const totalAttendees = liveStats?.tickets_sold ?? 0

  let orders: any[] = []
  let ordersResultCount = 0
  if (view === "orders" && allOrderIds.length > 0) {
    const idMatches = filterQ ? allOrderIds.filter((id) => id.toLowerCase().startsWith(filterQ.toLowerCase())).slice(0, 100) : []
    let query = supabase
      .from("orders")
      .select("id, status, total_cents, currency, buyer_email, email, channel, created_at, item_count", { count: "exact" })
      .eq("org_id", orgId)
      .in("id", allOrderIds)
      .order("created_at", { ascending: false })
      .range(rangeFrom, rangeTo)

    if (filterQ) {
      const escaped = filterQ.replace(/[,%()]/g, "")
      query = idMatches.length > 0
        ? query.or(`buyer_email.ilike.%${escaped}%,email.ilike.%${escaped}%,id.in.(${idMatches.join(",")})`)
        : query.or(`buyer_email.ilike.%${escaped}%,email.ilike.%${escaped}%`)
    }
    if (filterStatus) query = query.eq("status", filterStatus as any)

    const { data, count } = await query
    orders = data ?? []
    ordersResultCount = count ?? 0
  }

  let attendees: any[] = []
  let attendeesResultCount = 0
  if (view === "attendees") {
    let query = supabase
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
      const escaped = filterQ.replace(/[,%()]/g, "")
      query = query.or(`holder_name.ilike.%${escaped}%,holder_email.ilike.%${escaped}%,ticket_code.ilike.%${escaped}%`)
    }
    if (filterStatus) query = query.eq("status", filterStatus as any)

    const { data, count } = await query
    attendees = data ?? []
    attendeesResultCount = count ?? 0
  }

  const currentCount = view === "orders" ? ordersResultCount : attendeesResultCount
  const totalPages = Math.max(1, Math.ceil(currentCount / PAGE_SIZE))
  if (currentCount > 0 && page > totalPages) {
    const next = new URLSearchParams({ view })
    if (filterQ) next.set("q", filterQ)
    if (filterStatus) next.set("status", filterStatus)
    next.set("page", String(totalPages))
    return redirect(`${returnTo}?${next.toString()}`)
  }

  const buildHref = (nextPage: number) => {
    const next = new URLSearchParams({ view })
    if (filterQ) next.set("q", filterQ)
    if (filterStatus) next.set("status", filterStatus)
    if (nextPage > 1) next.set("page", String(nextPage))
    return `${returnTo}?${next.toString()}`
  }
  const tabHref = (nextView: View) => `${returnTo}?view=${nextView}`

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/orgs/${orgId}/events/${eventId}`} aria-label="Back to event dashboard" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-3 hover:bg-bg hover:text-ink">
              <Icon name="chevL" size={16} />
            </Link>
            <div className="flex flex-col gap-0.5">
              <h1 className="text-h1">Orders & attendees</h1>
              <p className="text-[13px] text-ink-3">{event.title}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <EmailAttendeesButton orgId={orgId} eventId={eventId} ticketTypes={ticketTypes.map(({ id, name }) => ({ id, name }))} />
            {ticketTypes.length > 0 && <CompTicketButton orgId={orgId} eventId={eventId} ticketTypes={ticketTypes} />}
            <a href={`/api/orgs/${orgId}/events/${eventId}/attendees.csv`} className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-transparent px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-bg">
              <Icon name="download" size={14} /> Export attendees CSV
            </a>
          </div>
        </div>

        <LiveOrderKpis eventId={eventId} totalOrdersCount={totalOrdersCount} initialStats={liveStats} />

        <div className="flex gap-1 border-b border-line">
          {(["orders", "attendees"] as View[]).map((tab) => (
            <Link key={tab} href={tabHref(tab)} className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-semibold capitalize transition-colors ${view === tab ? "border-b-2 border-ink text-ink" : "text-ink-3 hover:text-ink"}`}>
              {tab}
              <span className="font-mono text-[11px] tabular-nums text-ink-3">{tab === "orders" ? totalOrdersCount.toLocaleString() : totalAttendees.toLocaleString()}</span>
            </Link>
          ))}
        </div>

        <Card flat className="border border-line">
          <CardBody className="p-4">
            <form className="flex flex-wrap gap-3">
              <input type="hidden" name="view" value={view} />
              <input name="q" defaultValue={filterQ} maxLength={200} placeholder={view === "attendees" ? "Search holder name, email or ticket code…" : "Search buyer email or order ID…"} className="min-w-48 flex-1 rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-2 text-[13px] text-ink outline-none transition focus:border-accent focus:ring-[3px] focus:ring-accent-soft" />
              <select name="status" defaultValue={filterStatus} className="rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-2 text-[13px] text-ink outline-none">
                <option value="">All statuses</option>
                {[...(view === "orders" ? ORDER_STATUSES : ATTENDEE_STATUSES)].map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}
              </select>
              <button type="submit" className="rounded-[var(--radius)] border border-line-2 bg-surface px-4 py-2 text-[13px] font-semibold text-ink transition hover:bg-bg">Filter</button>
              {(filterStatus || filterQ) && <Link href={`${returnTo}?view=${view}`} className="rounded-[var(--radius)] px-4 py-2 text-[13px] font-semibold text-ink-3 transition hover:text-ink">Clear</Link>}
            </form>
          </CardBody>
        </Card>

        {view === "orders" && (
          <Card>
            <CardBody className="px-5 py-4">
              <p className="text-label">{filterQ || filterStatus ? `Orders — ${ordersResultCount.toLocaleString()} of ${totalOrdersCount.toLocaleString()}` : `Orders (${totalOrdersCount.toLocaleString()})`}</p>
            </CardBody>
            <CardDivider />
            {orders.length === 0 ? (
              <CardBody className="py-12">
                <EmptyState icon="ticket" title={filterQ || filterStatus ? "No orders match" : "No orders yet"} description={filterQ || filterStatus ? "Try adjusting the search or status filter." : "Orders will appear here once tickets are sold."} compact />
              </CardBody>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-line">
                      <th className="px-5 py-3 text-left text-label">Order</th><th className="px-5 py-3 text-left text-label">Buyer</th><th className="px-5 py-3 text-left text-label">Channel</th><th className="px-5 py-3 text-right text-label">Items</th><th className="px-5 py-3 text-right text-label">Total</th><th className="px-5 py-3 text-left text-label">Status</th><th className="px-5 py-3 text-left text-label">Date</th><th className="px-5 py-3 text-right text-label">Detail</th>
                    </tr></thead>
                    <tbody>{orders.map((order, index) => (
                      <tr key={order.id} className={index > 0 ? "border-t border-line" : ""}>
                        <td className="px-5 py-3 font-mono text-[12px] text-ink-3" title={order.id}>{order.id.slice(0, 8)}…</td>
                        <td className="px-5 py-3 text-[13px] text-ink">{order.buyer_email ?? order.email ?? "Guest checkout"}</td>
                        <td className="px-5 py-3"><Chip size="sm" variant="muted" className="capitalize">{order.channel ?? "online"}</Chip></td>
                        <td className="px-5 py-3 text-right font-mono text-[13px] tabular-nums text-ink">{order.item_count ?? 0}</td>
                        <td className="px-5 py-3 text-right font-mono text-[13px] font-semibold tabular-nums text-ink">{order.currency ?? "SZL"} {((order.total_cents ?? 0) / 100).toLocaleString("en-SZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="px-5 py-3"><Chip size="sm" variant={orderStatusVariant(order.status)} className="capitalize">{order.status}</Chip></td>
                        <td className="px-5 py-3 font-mono text-[12px] text-ink-3">{fmtDate(order.created_at)}</td>
                        <td className="px-5 py-3 text-right"><Link href={`${returnTo}/${order.id}`} aria-label={`Open order ${order.id}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-3 hover:bg-bg hover:text-ink"><Icon name="arrowR" size={14} /></Link></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                <Paginator page={page} totalPages={totalPages} buildHref={buildHref} />
              </>
            )}
          </Card>
        )}

        {view === "attendees" && <AttendeesBulkTable attendees={attendees} orgId={orgId} eventId={eventId} totalCount={attendeesResultCount} filterActive={Boolean(filterQ || filterStatus)} paginator={<Paginator page={page} totalPages={totalPages} buildHref={buildHref} />} />}
      </div>
    </main>
  )
}
