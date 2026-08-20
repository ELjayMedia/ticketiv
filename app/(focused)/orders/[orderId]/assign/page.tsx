import Link from "next/link"
import { notFound } from "next/navigation"

import { Card } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
import {
  getOrderTicketAssignment,
  type TicketAssignmentItem,
} from "@/lib/data/attendee/ticket-assignment"

export const metadata = { title: "Assign tickets" }
export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"

function stateCopy(item: TicketAssignmentItem): { label: string; detail: string; className: string } {
  switch (item.state) {
    case "me":
      return {
        label: "Me",
        detail: "This ticket stays in your account",
        className: "bg-accent-soft text-accent",
      }
    case "pending":
      return {
        label: "Pending",
        detail: item.recipientName
          ? `Waiting for ${item.recipientName} to accept`
          : "Waiting for the recipient to accept",
        className: "bg-warning/10 text-warning",
      }
    case "assigned":
      return {
        label: "Assigned",
        detail: item.recipientName
          ? `Accepted by ${item.recipientName}`
          : "This ticket now belongs to another account",
        className: "bg-line/40 text-ink-3",
      }
    case "unavailable":
      return {
        label: "Unavailable",
        detail: item.reason ?? "This ticket cannot be assigned",
        className: "bg-line/40 text-ink-3",
      }
  }
}

export default async function AssignTicketsPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const { orderId } = await params
  const assignment = await getOrderTicketAssignment(orderId)
  if (!assignment) notFound()

  const returnTo = `/orders/${assignment.orderId}/assign`
  const assignableCount = assignment.items.filter((item) => item.canAssign).length
  const pendingCount = assignment.items.filter((item) => item.state === "pending").length

  return (
    <div className="min-h-dvh bg-bg pb-24">
      <div className="mx-auto w-full max-w-[480px]">
        <header className="flex items-center gap-2.5 px-5 pb-4 pt-14">
          <Link
            href={`/orders/${assignment.orderId}/confirmation`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60"
            aria-label="Back to order confirmation"
          >
            <Icon name="chevL" size={22} />
          </Link>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-label">Order tickets</span>
            <h1 className="truncate text-h2">Assign tickets</h1>
          </div>
        </header>

        <section className="px-5 pb-5">
          <Card className="p-4" flat>
            <div className="flex items-start gap-3">
              <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Icon name="users" size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold">{assignment.eventTitle}</div>
                <p className="mt-1 text-[12px] leading-5 text-ink-3">
                  Every ticket starts with you. Assign only the tickets someone else will use; they move after that person accepts the transfer.
                </p>
                <div className="mt-2 font-mono text-[10px] uppercase text-ink-3">
                  {assignment.ticketCount} ticket{assignment.ticketCount === 1 ? "" : "s"}
                  {pendingCount > 0 ? ` · ${pendingCount} pending` : ""}
                </div>
              </div>
            </div>
          </Card>
        </section>

        <section className="px-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-label">Who is using each ticket?</span>
            <span className="font-mono text-[10px] text-ink-3">
              {assignableCount} ready to assign
            </span>
          </div>

          <ul className="flex flex-col gap-2">
            {assignment.items.map((item, index) => {
              const state = stateCopy(item)
              const transferHref = `/tickets/${item.id}/transfer?returnTo=${encodeURIComponent(returnTo)}`

              return (
                <li key={item.id}>
                  <Card className="p-3.5" flat>
                    <div className="flex items-start gap-3">
                      <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg font-mono text-[11px] font-semibold text-ink-3">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-semibold">
                            Ticket {index + 1} of {assignment.ticketCount}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${state.className}`}>
                            {state.label}
                          </span>
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] text-ink-3">
                          {item.ticketTypeName}
                        </div>
                        <p className="mt-1 text-[12px] text-ink-3">{state.detail}</p>
                      </div>
                    </div>

                    <div className="mt-3 border-t border-line pt-3">
                      {item.canAssign ? (
                        <Link
                          href={transferHref}
                          className="flex w-full items-center justify-between rounded-[var(--radius)] px-1 py-1 text-[12px] font-semibold text-accent"
                        >
                          <span>Assign to a friend</span>
                          <Icon name="arrowR" size={14} />
                        </Link>
                      ) : item.state === "pending" ? (
                        <Link
                          href="/transfers"
                          className="flex w-full items-center justify-between rounded-[var(--radius)] px-1 py-1 text-[12px] font-semibold text-ink-2"
                        >
                          <span>View transfer request</span>
                          <Icon name="chevR" size={14} />
                        </Link>
                      ) : (
                        <div className="px-1 py-1 font-mono text-[10px] uppercase text-ink-3">
                          No action needed
                        </div>
                      )}
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="px-5 pt-5">
          <Card className="p-3.5" flat>
            <div className="flex items-start gap-2.5">
              <Icon name="ticket" size={15} className="mt-0.5 text-ink-3" />
              <p className="text-[11px] leading-5 text-ink-3">
                The purchase stays under your order for receipts and audit history. Only the selected individual ticket changes holder after acceptance.
              </p>
            </div>
          </Card>
        </section>

        <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface px-5 py-3.5 pb-7">
          <div className="mx-auto flex max-w-[440px] gap-2">
            <Link
              href="/tickets"
              className="flex flex-1 items-center justify-center rounded-[var(--radius-md)] border border-line-2 bg-surface px-4 py-3 text-[14px] font-semibold hover:bg-bg"
            >
              My tickets
            </Link>
            <Link
              href={`/orders/${assignment.orderId}/confirmation`}
              className="flex flex-1 items-center justify-center rounded-[var(--radius-md)] bg-accent px-4 py-3 text-[14px] font-semibold text-white hover:opacity-90"
            >
              Done
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
