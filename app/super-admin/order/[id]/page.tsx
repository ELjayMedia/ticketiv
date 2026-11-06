import Link from "next/link"
import { notFound } from "next/navigation"

import {
  addNoteAction,
  approveRefundAction,
  changeBuyerEmailAction,
  declineRefundAction,
  reissueTicketAction,
  requestRefundAction,
  resendTicketsAction,
} from "@/app/super-admin/console-actions"
import { Crumbs, Dot, Facts, NotesList, Panel, Pill, when, type Tone } from "@/components/super-admin/console-ui"
import { GuardedAction, NoteForm } from "@/components/super-admin/GuardedAction"
import { getOrder360, humanFailureReason } from "@/lib/data/admin/console"
import { getAdminContext, requireSuperAdmin } from "@/lib/super-admin/auth"
import { canDo, formatMoney } from "@/lib/super-admin/console"

export const metadata = { title: "Order · Admin" }

const STATUS_TONE: Record<string, Tone> = { paid: "success", pending: "warning", failed: "danger", refunded: "muted" }
const ITEM_TONE: Record<string, Tone> = { issued: "success", checked_in: "accent", transferred: "muted", revoked: "danger", refunded: "muted", pending: "warning" }
const LOCKED = "Your role can't do this"

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin()
  const { id } = await params
  const [order, context] = await Promise.all([getOrder360(id), getAdminContext()])
  if (!order) notFound()
  const role = context?.role ?? null
  const lock = (action: Parameters<typeof canDo>[0]) => (canDo(action, role) ? undefined : LOCKED)
  const reissuable = order.items.filter((item) => item.status === "issued" && !item.checkedInAt && item.code)
  const hidden = { orderId: order.id }

  return (
    <div className="flex flex-col gap-5">
      <Crumbs items={[{ label: "Search", href: "/super-admin/search" }, { label: `Order ${order.ref}` }]} />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Order {order.ref}</h1>
          <div className="flex flex-wrap gap-2">
            <Pill tone={STATUS_TONE[order.status] ?? "muted"}>{order.status}</Pill>
            {order.flags.map((flag) => (
              <Pill key={flag} tone="warning">
                {flag}
              </Pill>
            ))}
          </div>
        </div>
        <Link href={`/super-admin/orders/${order.id}`} className="text-[13px] text-accent hover:underline">
          Raw record
        </Link>
      </header>

      <Facts
        items={[
          {
            label: "Buyer",
            value: order.buyerId ? (
              <Link href={`/super-admin/people/${order.buyerId}`} className="text-accent hover:underline">
                {order.buyerName ?? order.buyerEmail ?? "Account"}
              </Link>
            ) : (
              "Guest checkout"
            ),
            sub: [order.buyerEmail, order.buyerPhone].filter(Boolean).join(" · ") || undefined,
          },
          {
            label: "Event",
            value: order.event ? (
              <Link href={`/super-admin/event/${order.event.id}`} className="text-accent hover:underline">
                {order.event.title}
              </Link>
            ) : (
              "Unknown event"
            ),
            sub: [order.event?.orgName, order.event?.startsAt ? when(order.event.startsAt) : null].filter(Boolean).join(" · ") || undefined,
          },
          { label: "Total", value: formatMoney(order.totalCents, order.currency), sub: `${order.items.length} ticket${order.items.length === 1 ? "" : "s"}` },
          {
            label: "Paid with",
            value: order.payments.find((p) => p.status === "succeeded")?.provider ?? "Not paid",
            sub: `Created ${when(order.createdAt)}`,
          },
        ]}
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="What happened" aside="Newest first">
            <ol className="flex flex-col">
              {order.timeline.map((entry, index) => (
                <li key={`${entry.at}-${index}`} className="flex gap-3 border-t border-line py-2.5 first:border-t-0">
                  <Dot tone={entry.tone} />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm font-semibold text-ink">{entry.title}</span>
                    {entry.detail ? <span className="break-words text-[13px] text-ink-3">{entry.detail}</span> : null}
                  </div>
                  <span className="shrink-0 text-xs text-ink-3">{when(entry.at)}</span>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Tickets">
            <ul className="flex flex-col">
              {order.items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-3 border-t border-line py-2.5 first:border-t-0">
                  <span className="min-w-0 flex-1 basis-48 text-sm font-semibold text-ink">
                    {item.typeName} <span className="font-mono text-[13px] font-normal text-ink-3">{item.code ?? "no code"}</span>
                  </span>
                  <span className="text-[13px] text-ink-3">{item.holderName ? `Holder: ${item.holderName}` : "Holder not set"}</span>
                  <Pill tone={ITEM_TONE[item.status] ?? "muted"}>{item.checkedInAt ? `scanned ${when(item.checkedInAt)}` : item.status}</Pill>
                </li>
              ))}
            </ul>
          </Panel>

          {order.supportRefs.length || order.attempts.length ? (
            <Panel title="Payment attempts">
              <ul className="flex flex-col gap-2">
                {order.supportRefs.map((ref) => (
                  <li key={ref.ref} className="rounded-lg border border-danger/30 bg-danger-soft/50 px-3 py-2 text-[13px] text-ink">
                    <strong>{ref.ref}</strong> · {humanFailureReason(ref.reason)}
                    {typeof ref.diagnostic?.providerMessage === "string" ? (
                      <span className="block text-ink-3">Provider said: {String(ref.diagnostic.providerMessage)}</span>
                    ) : null}
                    {typeof ref.diagnostic?.httpStatus === "number" ? (
                      <span className="block text-ink-3">HTTP {String(ref.diagnostic.httpStatus)}</span>
                    ) : null}
                    <span className="block text-ink-3">{when(ref.created_at)} · nothing was charged</span>
                  </li>
                ))}
                {order.attempts.map((attempt) => (
                  <li key={attempt.id} className="rounded-lg border border-line px-3 py-2 text-[13px] text-ink">
                    Attempt {attempt.attemptNo} · {attempt.provider} · <strong>{attempt.status}</strong>
                    <span className="block text-ink-3">{when(attempt.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>

        <aside className="flex min-w-0 flex-col gap-5">
          <Panel title="Fix it" aside="Each asks why and is logged">
            <div className="flex flex-col gap-2">
              <GuardedAction
                label="Resend tickets"
                hint="Email the tickets again"
                action={resendTicketsAction}
                hidden={hidden}
                lockedReason={lock("resend_tickets")}
                explain="Sends the tickets again on every channel the buyer has. The ticket codes stay the same."
                fields={[
                  {
                    name: "toEmail",
                    label: "Send to a different address (optional)",
                    type: "email",
                    placeholder: order.buyerEmail ?? "buyer@example.com",
                    hint: "Leave empty to use the address on the order.",
                  },
                ]}
              />
              <GuardedAction
                label="Change buyer email"
                hint="Fix a typo from checkout"
                action={changeBuyerEmailAction}
                hidden={hidden}
                lockedReason={lock("change_buyer_email")}
                explain="Updates the order and resends the tickets to the new address. The old address stays in the audit log."
                fields={[{ name: "email", label: "New email", type: "email", required: true, defaultValue: order.buyerEmail ?? "" }]}
              />
              {reissuable.length ? (
                <GuardedAction
                  label="Reissue a ticket"
                  hint="New code, the old one stops scanning"
                  action={reissueTicketAction}
                  hidden={hidden}
                  lockedReason={lock("reissue_ticket")}
                  explain="Use this when a ticket was shared or leaked. Scanners refuse the old code once they sync."
                  fields={[
                    {
                      name: "orderItemId",
                      label: "Ticket",
                      type: "select",
                      defaultValue: reissuable[0].id,
                      options: reissuable.map((item) => ({ value: item.id, label: `${item.typeName} · ${item.code}` })),
                    },
                  ]}
                />
              ) : null}
              {order.status === "paid" ? (
                <GuardedAction
                  label="Request a refund"
                  hint="Full refund of what's left"
                  tag="Approved later"
                  action={requestRefundAction}
                  hidden={hidden}
                  lockedReason={lock("request_refund")}
                  explain="Creates a refund request for the remaining amount. It is approved and sent through the usual refund flow, so no money moves yet."
                />
              ) : null}
            </div>
          </Panel>

          {order.refunds.length ? (
            <Panel title="Refunds" className="scroll-mt-24">
              <ul id="refunds" className="flex flex-col gap-3 text-[13px]">
                {order.refunds.map((refund) => (
                  <li key={refund.id} className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        {formatMoney(refund.amountCents, order.currency)} · {when(refund.createdAt)}
                        {refund.reason ? <span className="block text-ink-3">{refund.reason}</span> : null}
                      </span>
                      <Pill tone={refund.status === "processed" ? "success" : refund.status === "failed" ? "danger" : "warning"}>
                        {refund.status === "requested" ? "waiting for approval" : refund.status}
                      </Pill>
                    </div>
                    {refund.status === "requested" ? (
                      <>
                        <GuardedAction
                          label="Approve and refund"
                          hint="Sends the money back to the buyer"
                          tag="Money"
                          action={approveRefundAction}
                          hidden={{ refundId: refund.id }}
                          lockedReason={canDo("approve_refund", role) ? undefined : "Only the owner approves refunds"}
                          explain="Paystack and MoMo refunds go to the provider straight away. Other providers are marked for you to refund by hand."
                        />
                        <GuardedAction
                          label="Decline"
                          hint="No money moves"
                          action={declineRefundAction}
                          hidden={{ refundId: refund.id }}
                          lockedReason={canDo("approve_refund", role) ? undefined : "Only the owner approves refunds"}
                          explain="Cancels the request. The tickets stay valid."
                        />
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          <Panel title="Internal notes">
            <div className="flex flex-col gap-3">
              <NotesList notes={order.notes} />
              {canDo("add_note", role) ? <NoteForm action={addNoteAction} subjectType="order" subjectId={order.id} /> : null}
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  )
}
