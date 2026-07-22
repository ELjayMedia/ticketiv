import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import Link from "next/link"

import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"
import { OrderSupportActions } from "./order-support-actions"

export const dynamic = "force-dynamic"

function fmtDate(d: string | null) {
  if (!d) return "—"
  return new Intl.DateTimeFormat("en-SZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(d))
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orgId: string; eventId: string; orderId: string }>
}) {
  const { orgId, eventId, orderId } = await params
  const returnTo = `/orgs/${orgId}/events/${eventId}/orders/${orderId}`
  const supabase = createServerSupabaseClient()
  if (!supabase) return redirect(`/login?next=${encodeURIComponent(returnTo)}`)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return redirect(`/login?next=${encodeURIComponent(returnTo)}`)

  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("id", eventId)
    .eq("org_id", orgId)
    .maybeSingle()
  if (!event) return redirect("/403")

  const { data: member } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!member) return redirect("/403")

  const supportRoles = new Set([
    "admin",
    "organizer",
    "organizer_owner",
    "organizer_admin",
    "finance",
    "finance_manager",
  ])
  const canSupport = supportRoles.has(String(member.role))

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, total_cents, currency, email, buyer_email, buyer_phone, buyer_id, channel, created_at, item_count, subtotal_cents, platform_fee_cents, processor_fee_cents, org_id")
    .eq("id", orderId)
    .eq("org_id", orgId)
    .maybeSingle()
  if (!order) return redirect("/403")

  const { data: itemRows = [] } = await supabase
    .from("order_items")
    .select(`
      id, ticket_code, status, holder_name, holder_email, holder_phone,
      checked_in_at, revoked_at, refunded_at, created_at, updated_at,
      ticket_types!inner(id, name, price_cents, currency, event_id)
    `)
    .eq("order_id", orderId)
    .eq("ticket_types.event_id", eventId)
    .order("created_at", { ascending: true })
  const items = (itemRows ?? []) as any[]

  const { data: payments = [] } = await supabase
    .from("payments")
    .select("id, provider, status, amount_cents, currency, ext_payment_id, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
  const paymentIds = (payments ?? []).map((payment) => payment.id)

  const { data: refunds = [] } = paymentIds.length
    ? await supabase
        .from("refunds")
        .select("id, payment_id, amount_cents, currency, status, type, initiated_by, created_at, processed_at")
        .in("payment_id", paymentIds)
        .order("created_at", { ascending: false })
    : { data: [] as any[] }

  const { data: adjustments = [] } = await supabase
    .from("order_adjustments")
    .select("id, type, label, amount_cents, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true })

  const itemIds = items.map((item) => item.id)
  const { data: transfers = [] } = itemIds.length
    ? await supabase
        .from("transfers")
        .select("id, order_item_id, from_user_id, to_user_id, status, price_cents, created_at")
        .in("order_item_id", itemIds)
        .order("created_at", { ascending: false })
    : { data: [] as any[] }

  const { data: supportAudit = [] } = await supabase
    .from("audit_log")
    .select("id, action, changes, actor_id, created_at")
    .eq("org_id", orgId)
    .in("action", ["refund_requested", "ticket_revoked"])
    .order("created_at", { ascending: false })
    .limit(50)

  const orderAudit = (supportAudit ?? []).filter((entry: any) =>
    entry.changes?.order_id === orderId || itemIds.includes(entry.changes?.order_item_id),
  )

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex max-w-4xl flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/orgs/${orgId}/events/${eventId}/orders`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-3 hover:bg-bg hover:text-ink"
          >
            <Icon name="chevL" size={16} />
          </Link>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-h1">Order {order.id.slice(0, 8)}…</h1>
            <p className="text-[13px] text-ink-3">{event.title}</p>
          </div>
          <div className="ml-auto">
            <Chip size="sm" variant={order.status === "paid" ? "active" : order.status === "refunded" ? "accent" : "muted"} className="capitalize">
              {order.status}
            </Chip>
          </div>
        </div>

        <Card>
          <CardBody className="px-5 py-4"><p className="text-label">Order and buyer</p></CardBody>
          <CardDivider />
          <CardBody className="grid gap-4 p-5 sm:grid-cols-2">
            <Summary label="Buyer email" value={order.buyer_email ?? order.email ?? "—"} />
            <Summary label="Phone" value={order.buyer_phone ?? "—"} />
            <Summary label="Buyer profile" value={order.buyer_id ? `User ${order.buyer_id.slice(0, 8)}…` : "Guest checkout"} mono />
            <Summary label="Channel" value={order.channel ?? "online"} />
            <Summary label="Ordered" value={fmtDate(order.created_at)} />
            <Summary label="Order reference" value={order.id} mono />
            <div className="flex flex-col gap-1">
              <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Total</p>
              <p className="font-mono text-[18px] font-semibold tabular-nums text-ink">
                {order.currency ?? "SZL"} {((order.total_cents ?? 0) / 100).toFixed(2)}
              </p>
            </div>
            <Summary
              label="Fees"
              value={`Platform ${((order.platform_fee_cents ?? 0) / 100).toFixed(2)} · Processor ${((order.processor_fee_cents ?? 0) / 100).toFixed(2)}`}
              mono
            />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="px-5 py-4"><p className="text-label">Payments ({payments.length})</p></CardBody>
          <CardDivider />
          {payments.length === 0 ? (
            <CardBody className="py-8 text-center text-[13px] text-ink-3">No payment attempt is recorded for this order.</CardBody>
          ) : (
            <div className="divide-y divide-line">
              {payments.map((payment: any) => (
                <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <p className="text-[13px] font-semibold capitalize text-ink">{payment.provider ?? "Payment"}</p>
                    <p className="font-mono text-[11px] text-ink-3">{payment.ext_payment_id ?? payment.id} · {fmtDate(payment.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Chip size="sm" variant={payment.status === "succeeded" ? "active" : "muted"} className="capitalize">{payment.status}</Chip>
                    <p className="font-mono text-[13px] font-semibold">{payment.currency ?? order.currency} {((payment.amount_cents ?? 0) / 100).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardBody className="flex items-center justify-between px-5 py-4"><p className="text-label">Tickets ({items.length})</p></CardBody>
          <CardDivider />
          {items.length === 0 ? (
            <CardBody className="py-8 text-center text-[13px] text-ink-3">No tickets found for this event.</CardBody>
          ) : (
            <div className="divide-y divide-line">
              {items.map((item: any) => (
                <div key={item.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <p className="font-mono text-[13px] font-semibold text-ink">{item.ticket_code}</p>
                    <p className="text-[13px] text-ink-3">{item.ticket_types?.name} · {item.ticket_types?.currency ?? order.currency} {((item.ticket_types?.price_cents ?? 0) / 100).toFixed(2)}</p>
                    <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Holder: {item.holder_name ?? "—"} · {item.holder_email ?? "—"}</p>
                    {item.checked_in_at && <p className="font-mono text-[11px] uppercase tracking-wider text-success">Checked in {fmtDate(item.checked_in_at)}</p>}
                    {item.revoked_at && <p className="font-mono text-[11px] uppercase tracking-wider text-danger">Revoked {fmtDate(item.revoked_at)}</p>}
                    {item.refunded_at && <p className="font-mono text-[11px] uppercase tracking-wider text-danger">Refunded {fmtDate(item.refunded_at)}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <Chip size="sm" variant={item.status === "issued" || item.status === "checked_in" ? "active" : "muted"} className="capitalize">{item.status}</Chip>
                    {canSupport && (
                      <OrderSupportActions
                        orgId={orgId}
                        eventId={eventId}
                        orderId={orderId}
                        orderItemId={item.id}
                        itemStatus={item.status}
                        itemPriceCents={item.ticket_types?.price_cents ?? 0}
                        currency={item.ticket_types?.currency ?? order.currency ?? "SZL"}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {(adjustments ?? []).length > 0 && (
          <Card>
            <CardBody className="px-5 py-4"><p className="text-label">Adjustments</p></CardBody>
            <CardDivider />
            <CardBody className="flex flex-col gap-3 p-5">
              {(adjustments ?? []).map((adj: any) => (
                <div key={adj.id} className="flex items-center justify-between gap-3">
                  <div><p className="text-[13px] font-semibold text-ink">{adj.label ?? adj.type}</p><p className="font-mono text-[11px] text-ink-3">{fmtDate(adj.created_at)}</p></div>
                  <p className="font-mono text-[14px] font-semibold tabular-nums">{adj.amount_cents >= 0 ? "+" : ""}{(adj.amount_cents / 100).toFixed(2)}</p>
                </div>
              ))}
            </CardBody>
          </Card>
        )}

        <Card>
          <CardBody className="px-5 py-4"><p className="text-label">Refund history ({refunds.length})</p></CardBody>
          <CardDivider />
          {refunds.length === 0 ? (
            <CardBody className="py-8 text-center text-[13px] text-ink-3">No refund has been requested for this order.</CardBody>
          ) : (
            <CardBody className="flex flex-col gap-3 p-5">
              {refunds.map((refund: any) => (
                <div key={refund.id} className="flex items-center justify-between gap-3">
                  <div><p className="text-[13px] font-semibold capitalize text-ink">{refund.type?.replace(/_/g, " ")}</p><p className="font-mono text-[11px] text-ink-3">Initiated {fmtDate(refund.created_at)}{refund.processed_at ? ` · Processed ${fmtDate(refund.processed_at)}` : ""}</p></div>
                  <div className="flex items-center gap-2"><Chip size="sm" variant={refund.status === "processed" ? "active" : "muted"} className="capitalize">{refund.status}</Chip><p className="font-mono text-[14px] font-semibold">{refund.currency} {(refund.amount_cents / 100).toFixed(2)}</p></div>
                </div>
              ))}
            </CardBody>
          )}
        </Card>

        {transfers.length > 0 && (
          <Card>
            <CardBody className="px-5 py-4"><p className="text-label">Ownership and transfers ({transfers.length})</p></CardBody>
            <CardDivider />
            <CardBody className="flex flex-col gap-3 p-5">
              {transfers.map((transfer: any) => (
                <div key={transfer.id} className="flex items-center justify-between gap-3">
                  <div><p className="font-mono text-[12px] text-ink">Ticket {String(transfer.order_item_id).slice(0, 8)}…</p><p className="font-mono text-[11px] text-ink-3">{fmtDate(transfer.created_at)}</p></div>
                  <Chip size="sm" variant="muted" className="capitalize">{transfer.status}</Chip>
                </div>
              ))}
            </CardBody>
          </Card>
        )}

        {orderAudit.length > 0 && (
          <Card>
            <CardBody className="px-5 py-4"><p className="text-label">Support audit trail</p></CardBody>
            <CardDivider />
            <CardBody className="flex flex-col gap-3 p-5">
              {orderAudit.map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between gap-3"><p className="text-[13px] font-semibold capitalize text-ink">{entry.action.replace(/_/g, " ")}</p><p className="font-mono text-[11px] text-ink-3">{fmtDate(entry.created_at)}</p></div>
              ))}
            </CardBody>
          </Card>
        )}
      </div>
    </main>
  )
}

function Summary({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="flex min-w-0 flex-col gap-1"><p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{label}</p><p className={`${mono ? "font-mono text-[12px]" : "text-[14px]"} break-all text-ink`}>{value}</p></div>
}
