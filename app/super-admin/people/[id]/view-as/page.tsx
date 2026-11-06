import Link from "next/link"
import { notFound } from "next/navigation"

import { startViewAsAction } from "@/app/super-admin/console-actions"
import { Crumbs, Panel, Pill, when, type Tone } from "@/components/super-admin/console-ui"
import { GuardedAction } from "@/components/super-admin/GuardedAction"
import { getViewAs, validViewAsSession, VIEW_AS_MINUTES, type AttendeeTicketState, type ViewAs } from "@/lib/data/admin/console-ops"
import { requireAdminRole } from "@/lib/super-admin/auth"

export const metadata = { title: "View as · Admin" }

// What the person sees in the app, rebuilt from their data. Read only: nothing
// on this page can buy, change or message as them, and nothing here signs in as
// them. Opening it requires a reason and is logged.

const STATE: Record<AttendeeTicketState, { label: string; tone: Tone; explain: string }> = {
  valid: { label: "Valid", tone: "success", explain: "Shows a QR code that will scan at the door." },
  used: { label: "Used", tone: "muted", explain: "Already scanned in. Shows as used, the QR won't scan again." },
  transferred: { label: "Sent to someone else", tone: "muted", explain: "They passed it on. It's in the other person's account now." },
  refunded: { label: "Refunded", tone: "muted", explain: "No QR. Shows as refunded." },
  cancelled: { label: "Cancelled", tone: "danger", explain: "No QR. Shows as cancelled." },
  pending: { label: "Waiting for payment", tone: "warning", explain: "Payment didn't finish, so there's no ticket yet." },
}

export default async function ViewAsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ session?: string }> }) {
  const { user } = await requireAdminRole(["super_admin", "support_admin"])
  const { id } = await params
  const { session } = await searchParams
  const reason = session ? await validViewAsSession(session, user.id, id) : null
  const view = await getViewAs(id)
  if (!view) notFound()

  const crumbs = (
    <Crumbs items={[{ label: "Search", href: "/super-admin/search" }, { label: view.name, href: `/super-admin/people/${id}` }, { label: "View as" }]} />
  )

  if (reason === null) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-5">
        {crumbs}
        <h1 className="text-2xl font-semibold tracking-tight text-ink">View as {view.name}</h1>
        <p className="text-sm leading-relaxed text-ink-3">
          See their tickets and organizer workspaces the way they see them, so you can talk them through it. It&apos;s read only and
          lasts {VIEW_AS_MINUTES} minutes. Opening it is logged on their account with your reason.
        </p>
        {session ? <p className="rounded-md bg-warning-soft px-3 py-2 text-[13px] text-warning">That View as has ended. Start a new one.</p> : null}
        <GuardedAction
          label="Start View as"
          hint={`Read only, ${VIEW_AS_MINUTES} minutes, logged`}
          action={startViewAsAction}
          hidden={{ userId: id }}
          explain="Nothing you do here acts as them. You can't buy, transfer or message from their account."
        />
      </div>
    )
  }

  const upcoming = view.tickets.filter((t) => t.upcoming)
  const past = view.tickets.filter((t) => !t.upcoming)

  return (
    <div className="flex flex-col gap-5">
      {crumbs}
      <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ink px-4 py-3 text-sm text-surface">
        <span>
          <strong>Viewing as {view.name}.</strong> Read only, logged. Reason: {reason || "none given"}
        </span>
        <Link href={`/super-admin/people/${id}`} className="rounded-md bg-surface px-3 py-1.5 text-[13px] font-semibold text-ink">
          Stop viewing
        </Link>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="My tickets: upcoming" aside={`${upcoming.length}`}>
            <TicketList tickets={upcoming} empty="No upcoming tickets. If they say they bought one, search for the order by their email or phone: it may be a guest order under a different address." />
          </Panel>
          {past.length ? (
            <Panel title="My tickets: past" aside={`${past.length}`}>
              <TicketList tickets={past} empty="" />
            </Panel>
          ) : null}
        </div>
        <aside className="flex min-w-0 flex-col gap-5">
          <Panel title="Organizer workspaces they can open">
            {view.workspaces.length ? (
              <ul className="flex flex-col gap-2 text-[13px]">
                {view.workspaces.map((w) => (
                  <li key={w.orgId} className="flex justify-between gap-2">
                    <Link href={`/super-admin/organizer/${w.orgId}`} className="text-accent hover:underline">
                      {w.orgName}
                    </Link>
                    <span className="text-ink-3">{w.role.replace(/_/g, " ")}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-ink-3">None. They only see the attendee app.</p>
            )}
          </Panel>
          <Panel title="Messages we sent them">
            {view.messages.length ? (
              <ul className="flex flex-col gap-2 text-[13px]">
                {view.messages.map((m, index) => (
                  <li key={index} className="flex justify-between gap-2">
                    <span>
                      {m.type.replace(/_/g, " ")} · {m.channel}
                    </span>
                    <Pill tone={m.status === "sent" ? "success" : m.status === "failed" ? "danger" : "muted"}>{m.status}</Pill>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-ink-3">No messages on record.</p>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  )
}

function TicketList({ tickets, empty }: { tickets: ViewAs["tickets"]; empty: string }) {
  if (!tickets.length) return <p className="text-[13px] text-ink-3">{empty}</p>
  return (
    <ul className="flex flex-col">
      {tickets.map((ticket) => {
        const state = ticket.heldByThem ? STATE[ticket.state] : STATE.transferred
        return (
          <li key={ticket.id} className="flex flex-wrap items-start gap-3 border-t border-line py-3 first:border-t-0">
            <div className="flex min-w-0 flex-1 basis-56 flex-col gap-0.5">
              <span className="text-sm font-semibold text-ink">{ticket.eventTitle}</span>
              <span className="text-[13px] text-ink-3">
                {ticket.typeName} · {when(ticket.startsAt)}
                {ticket.holder ? ` · for ${ticket.holder}` : ""}
              </span>
              <span className="text-xs text-ink-3">{state.explain}</span>
            </div>
            <Pill tone={state.tone}>{state.label}</Pill>
          </li>
        )
      })}
    </ul>
  )
}
