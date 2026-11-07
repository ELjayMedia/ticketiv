import Link from "next/link"
import { notFound } from "next/navigation"

import { addNoteAction, sendPasswordResetAction, signOutEverywhereAction } from "@/app/super-admin/console-actions"
import { Crumbs, Facts, NotesList, Panel, Pill, when, type Tone } from "@/components/super-admin/console-ui"
import { GuardedAction, NoteForm } from "@/components/super-admin/GuardedAction"
import { getPerson360 } from "@/lib/data/admin/console"
import { getAdminContext, requireSuperAdmin } from "@/lib/super-admin/auth"
import { ADMIN_ROLE_LABELS, canDo, formatMoney, type AdminRoleTier } from "@/lib/super-admin/console"

export const metadata = { title: "Person · Admin" }

const STATUS_TONE: Record<string, Tone> = { paid: "success", pending: "warning", failed: "danger", refunded: "muted" }
const LOCKED = "Your role can't do this"

export default async function AdminPersonPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin()
  const { id } = await params
  const [person, context] = await Promise.all([getPerson360(id), getAdminContext()])
  if (!person) notFound()
  const role = context?.role ?? null
  const lock = (action: Parameters<typeof canDo>[0]) => (canDo(action, role) ? undefined : LOCKED)
  const isSelf = context?.user.id === person.id

  return (
    <div className="flex flex-col gap-5">
      <Crumbs items={[{ label: "Search", href: "/super-admin/search" }, { label: person.name }]} />

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{person.name}</h1>
          {canDo("view_as", role) && !isSelf ? (
            <Link
              href={`/super-admin/people/${person.id}/view-as`}
              className="inline-flex min-h-[40px] items-center rounded-[var(--radius)] border border-line-2 bg-surface px-4 text-sm font-semibold text-ink hover:bg-bg"
            >
              View as this person
            </Link>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {person.orders.length ? <Pill>Attendee</Pill> : null}
          {person.memberships.map((m) => (
            <Link key={m.orgId} href={`/super-admin/organizer/${m.orgId}`} className="hover:opacity-80">
              <Pill>
                {m.role.replace(/_/g, " ")} at {m.orgName}
              </Pill>
            </Link>
          ))}
          {person.eventRoles.some((r) => r.active) ? <Pill>Event staff</Pill> : null}
          {person.adminRole ? <Pill tone="accent">Admin: {ADMIN_ROLE_LABELS[person.adminRole as AdminRoleTier] ?? person.adminRole}</Pill> : null}
          {!person.emailConfirmed ? <Pill tone="warning">Email not confirmed</Pill> : null}
          {person.deliveryProblems.length ? <Pill tone="danger">Ticket delivery failed</Pill> : null}
        </div>
      </header>

      <Facts
        items={[
          { label: "Email", value: person.email ?? "None", sub: person.emailConfirmed ? "Confirmed" : "Not confirmed" },
          { label: "Phone", value: person.phone ?? "None", sub: "Private, admins only" },
          { label: "Signs in with", value: person.signInMethods.join(", ") || "Email", sub: `Joined ${when(person.createdAt)}` },
          { label: "Last sign-in", value: when(person.lastSignInAt) },
        ]}
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="Orders" aside={`${person.orders.length} shown`}>
            {person.orders.length ? (
              <ul className="flex flex-col">
                {person.orders.map((order) => (
                  <li key={order.id}>
                    <Link href={`/super-admin/order/${order.id}`} className="flex flex-wrap items-center gap-3 border-t border-line py-2.5 hover:text-accent">
                      <span className="min-w-0 flex-1 basis-48 text-sm font-semibold">
                        Order {order.ref}
                        {order.guest ? <span className="ml-2 text-xs font-normal text-ink-3">guest checkout, same email</span> : null}
                      </span>
                      <span className="text-[13px] text-ink-3">
                        {formatMoney(order.totalCents, order.currency)} · {when(order.createdAt)}
                      </span>
                      <Pill tone={STATUS_TONE[order.status] ?? "muted"}>{order.status}</Pill>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-ink-3">No orders.</p>
            )}
          </Panel>

          {person.deliveryProblems.length ? (
            <Panel title="Messages that failed">
              <ul className="flex flex-col gap-2 text-[13px]">
                {person.deliveryProblems.map((problem, index) => (
                  <li key={index} className="rounded-lg border border-danger/30 bg-danger-soft/50 px-3 py-2">
                    {problem.channel} · {when(problem.createdAt)}
                    {problem.error ? <span className="block text-ink-3">{problem.error}</span> : null}
                    {problem.orderId ? (
                      <Link href={`/super-admin/order/${problem.orderId}`} className="text-accent hover:underline">
                        Open the order
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          {person.memberships.length || person.eventRoles.length ? (
            <Panel title="Organizer and event work" aside="Where they help run events">
              <ul className="flex flex-col text-[13px]">
                {person.memberships.map((m) => (
                  <li key={`org-${m.orgId}`} className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-2.5 first:border-t-0">
                    <Link href={`/super-admin/organizer/${m.orgId}`} className="font-semibold text-ink hover:text-accent hover:underline">
                      {m.orgName}
                    </Link>
                    <Pill>Organizer team · {m.role.replace(/_/g, " ")}</Pill>
                  </li>
                ))}
                {person.eventRoles.map((r) => (
                  <li key={`event-${r.eventId}`} className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-2.5 first:border-t-0">
                    <span className="flex min-w-0 flex-col">
                      <Link href={`/super-admin/event/${r.eventId}`} className="font-semibold text-ink hover:text-accent hover:underline">
                        {r.eventTitle}
                      </Link>
                      {r.startsAt ? <span className="text-xs text-ink-3">{when(r.startsAt)}</span> : null}
                    </span>
                    <Pill tone={r.active ? "muted" : "warning"}>
                      Door staff · {r.role.replace(/_/g, " ")}
                      {r.active ? "" : " · removed"}
                    </Pill>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          <Panel title="History">
            <ol className="flex flex-col">
              {person.history.map((entry, index) => (
                <li key={`${entry.at}-${index}`} className="flex justify-between gap-3 border-t border-line py-2 text-[13px] first:border-t-0">
                  <span>
                    <span className="font-semibold text-ink">{entry.title}</span>
                    {entry.detail ? <span className="block text-ink-3">{entry.detail}</span> : null}
                  </span>
                  <span className="shrink-0 text-ink-3">{when(entry.at)}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <aside className="flex min-w-0 flex-col gap-5">
          <Panel title="Help with their account">
            <div className="flex flex-col gap-2">
              <GuardedAction
                label="Send password reset link"
                hint="Emails a one-time link"
                action={sendPasswordResetAction}
                hidden={{ userId: person.id }}
                lockedReason={person.email ? lock("send_password_reset") : "This account has no email"}
                explain="They choose a new password themselves. Support never sees or sets it."
              />
              <GuardedAction
                label="Sign out of all devices"
                hint="For a lost or shared phone"
                action={signOutEverywhereAction}
                hidden={{ userId: person.id }}
                lockedReason={isSelf ? "Use Sign out for yourself" : lock("sign_out_everywhere")}
                explain="Ends every session. Pages already open stop working within the hour."
              />
            </div>
          </Panel>

          <Panel title="Internal notes">
            <div className="flex flex-col gap-3">
              <NotesList notes={person.notes} />
              {canDo("add_note", role) ? <NoteForm action={addNoteAction} subjectType="person" subjectId={person.id} /> : null}
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  )
}
