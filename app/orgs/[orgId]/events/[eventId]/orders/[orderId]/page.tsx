import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import Link from "next/link"

import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"
import { OrderSupportActions } from "./order-support-actions"

export const dynamic = "force-dynamic"

// TICK-49 — Order detail with line items, check-in state, refund history, support actions

function fmtDate(d: string | null) {
  if (!d) return "—"
  return new Intl.DateTimeFormat("en-SZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(d))
}

export default async function OrderDetailPage({
  params,
}: {
  params: { orgId: string; eventId: string; orderId: string }
}) {
  const { orgId, eventId, orderId } = params

  const supabase = createServerSupabaseClient()
  if (!supabase) return redirect("/login")

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return redirect("/login")

  // Verify event belongs to org
  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("id", eventId)
    .eq("org_id", orgId)
    .maybeSingle()
  if (!event) return redirect("/403")

  // Verify caller is org member
  const { data: member } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", session.user.id)
    .maybeSingle()
  if (!member) return redirect("/403")

  const adminRoles = new Set(["admin", "organizer", "organizer_owner", "organizer_admin"])
  const canSupport = adminRoles.has(String(member.role))

  // Load order
  const { data: order } = await supabase
    .from("orders")
    .select("id, status, total_cents, currency, email, buyer_email, buyer_phone, channel, created_at, item_count, subtotal_cents, platform_fee_cents, processor_fee_cents, org_id")
    .eq("id", orderId)
    .eq("org_id", orgId)
    .maybeSingle()

  if (!order) return redirect("/403")

  // Load order items (verify event_id via ticket_types)
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

  // Load refund history for this order
  const { data: refunds = [] } = await supabase
    .from("refunds")
    .select("id, amount_cents, currency, status, type, created_at, processed_at")
    .in(
      "id",
      items
        .filter((i) => i.refunded_at)
        .map((i) => i.id)
        .slice(0, 20),
    )

  // Load order adjustments
  const { data: adjustments = [] } = await supabase
    .from("order_adjustments")
    .select("id, type, label, amount_cents, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true })

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex max-w-4xl flex-col gap-6 p-6">
        {/* Header */}
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
            <Chip
              size="sm"
              variant={
                order.status === "paid" ? "active" : order.status === "refunded" ? "accent" : "muted"
              }
              className="capitalize"
            >
              {order.status}
            </Chip>
          </div>
        </div>

        {/* Order summary */}
        <Card>
          <CardBody className="px-5 py-4">
            <p className="text-label">Order summary</p>
          </CardBody>
          <CardDivider />
          <CardBody className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Buyer email</p>
              <p className="text-[14px] text-ink">{order.buyer_email ?? order.email ?? "—"}</p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Phone</p>
              <p className="text-[14px] text-ink">{order.buyer_phone ?? "—"}</p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Channel</p>
              <p className="text-[14px] capitalize text-ink">{order.channel ?? "online"}</p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Ordered</p>
              <p className="text-[14px] text-ink">{fmtDate(order.created_at)}</p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Total</p>
              <p className="font-mono text-[18px] font-semibold tabular-nums text-ink">
                {order.currency ?? "SZL"} {((order.total_cents ?? 0) / 100).toFixed(2)}
              </p>
            </div>
            {order.platform_fee_cents ? (
              <div className="flex flex-col gap-1">
                <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Fees</p>
                <p className="font-mono text-[14px] tabular-nums text-ink-3">
                  Platform: {((order.platform_fee_cents ?? 0) / 100).toFixed(2)} · Processor:{" "}
                  {((order.processor_fee_cents ?? 0) / 100).toFixed(2)}
                </p>
              </div>
            ) : null}
          </CardBody>
        </Card>

        {/* Line items */}
        <Card>
          <CardBody className="flex items-center justify-between px-5 py-4">
            <p className="text-label">Tickets ({items.length})</p>
          </CardBody>
          <CardDivider />
          {items.length === 0 ? (
            <CardBody className="py-8 text-center text-[13px] text-ink-3">No tickets found for this event.</CardBody>
          ) : (
            <div className="divide-y divide-line">
              {items.map((item: any) => (
                <div key={item.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <p className="font-mono text-[13px] font-semibold text-ink">{item.ticket_code}</p>
                    <p className="text-[13px] text-ink-3">{item.ticket_types?.name}</p>
                    <div className="flex flex-col gap-0.5">
                      <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                        Holder: {item.holder_name ?? "—"} · {item.holder_email ?? "—"}
                      </p>
                      {item.checked_in_at && (
                        <p className="font-mono text-[11px] uppercase tracking-wider text-success">
                          Checked in {fmtDate(item.checked_in_at)}
                        </p>
                      )}
                      {item.revoked_at && (
                        <p className="font-mono text-[11px] uppercase tracking-wider text-danger">
                          Revoked {fmtDate(item.revoked_at)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Chip
                      size="sm"
                      variant={
                        item.status === "issued" || item.status === "checked_in"
                          ? "active"
                          : item.status === "revoked" || item.status === "refunded"
                            ? "muted"
                            : "default"
                      }
                      className="capitalize"
                    >
                      {item.status}
                    </Chip>
                    {canSupport && (
                      <OrderSupportActions
                        orgId={orgId}
                        eventId={eventId}
                        orderId={orderId}
                        orderItemId={item.id}
                        itemStatus={item.status}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Adjustments */}
        {(adjustments ?? []).length > 0 && (
          <Card>
            <CardBody className="px-5 py-4">
              <p className="text-label">Adjustments</p>
            </CardBody>
            <CardDivider />
            <CardBody className="flex flex-col gap-3 p-5">
              {(adjustments ?? []).map((adj: any) => (
                <div key={adj.id} className="flex items-center justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[13px] font-semibold text-ink">{adj.label ?? adj.type}</p>
                    <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                      {fmtDate(adj.created_at)}
                    </p>
                  </div>
                  <p
                    className={[
                      "font-mono text-[14px] font-semibold tabular-nums",
                      adj.amount_cents < 0 ? "text-success" : "text-ink",
                    ].join(" ")}
                  >
                    {adj.amount_cents >= 0 ? "+" : ""}
                    {(adj.amount_cents / 100).toFixed(2)}
                  </p>
                </div>
              ))}
            </CardBody>
          </Card>
        )}

        {/* Refund history */}
        {(refunds ?? []).length > 0 && (
          <Card>
            <CardBody className="px-5 py-4">
              <p className="text-label">Refund history</p>
            </CardBody>
            <CardDivider />
            <CardBody className="flex flex-col gap-3 p-5">
              {(refunds ?? []).map((refund: any) => (
                <div key={refund.id} className="flex items-center justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[13px] font-semibold text-ink capitalize">{refund.type?.replace(/_/g, " ")}</p>
                    <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                      Initiated {fmtDate(refund.created_at)}
                      {refund.processed_at ? ` · Processed ${fmtDate(refund.processed_at)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Chip size="sm" variant={refund.status === "processed" ? "active" : "muted"} className="capitalize">
                      {refund.status}
                    </Chip>
                    <p className="font-mono text-[14px] font-semibold tabular-nums text-ink">
                      {refund.currency} {(refund.amount_cents / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        )}
      </div>
    </main>
  )
}
