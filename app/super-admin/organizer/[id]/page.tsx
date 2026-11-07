import Link from "next/link"
import { notFound } from "next/navigation"

import { addNoteAction } from "@/app/super-admin/console-actions"
import { Crumbs, Facts, NotesList, Panel, Pill, when, type Tone } from "@/components/super-admin/console-ui"
import { NoteForm } from "@/components/super-admin/GuardedAction"
import { getOrganizer360 } from "@/lib/data/admin/console-ops"
import { getAdminContext, requireSuperAdmin } from "@/lib/super-admin/auth"
import { canDo, formatMoney } from "@/lib/super-admin/console"

export const metadata = { title: "Organizer · Admin" }

const EVENT_TONE: Record<string, Tone> = { published: "success", draft: "muted", paused: "warning", archived: "muted" }
const PAYOUT_TONE: Record<string, Tone> = { paid: "success", requested: "warning", processing: "warning", failed: "danger", cancelled: "muted" }

export default async function AdminOrganizerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin()
  const { id } = await params
  const [org, context] = await Promise.all([getOrganizer360(id), getAdminContext()])
  if (!org) notFound()
  const role = context?.role ?? null
  const owners = org.members.filter((m) => m.role.includes("owner"))
  const primaryAccount = org.payoutAccounts.find((a) => a.isPrimary) ?? org.payoutAccounts[0]

  return (
    <div className="flex flex-col gap-5">
      <Crumbs items={[{ label: "Search", href: "/super-admin/search" }, { label: org.name }]} />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{org.name}</h1>
          <div className="flex flex-wrap gap-2">
            {org.payoutAccounts.length ? <Pill tone="success">Payout account set</Pill> : <Pill tone="warning">No payout account</Pill>}
            {org.openIssues.length ? <Pill tone="danger">{org.openIssues.length} money issue{org.openIssues.length === 1 ? "" : "s"}</Pill> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-[13px]">
          <Link href={`/organisers/${org.id}`} className="text-accent hover:underline">
            Public page
          </Link>
          <Link href={`/super-admin/organizations/${org.id}?raw=1`} className="text-accent hover:underline">
            Raw record
          </Link>
        </div>
      </header>

      <Facts
        items={[
          { label: "Owner", value: owners[0]?.email ?? "No owner", sub: owners.length > 1 ? `+${owners.length - 1} more` : undefined },
          { label: "Team", value: `${org.members.length} member${org.members.length === 1 ? "" : "s"}` },
          { label: "Events", value: org.events.length.toLocaleString("en-SZ"), sub: `${org.events.filter((e) => e.status === "published").length} published` },
          { label: "Payouts to", value: primaryAccount ? primaryAccount.provider : "Not set up", sub: `Joined ${when(org.createdAt)}` },
        ]}
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="Events">
            {org.events.length ? (
              <ul className="flex flex-col">
                {org.events.map((event) => (
                  <li key={event.id}>
                    <Link href={`/super-admin/event/${event.id}`} className="flex flex-wrap items-center gap-3 border-t border-line py-2.5 hover:text-accent">
                      <span className="min-w-0 flex-1 basis-48 text-sm font-semibold">{event.title}</span>
                      <span className="text-[13px] text-ink-3">{when(event.startsAt)}</span>
                      <Pill tone={EVENT_TONE[event.status] ?? "muted"}>{event.status}</Pill>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-ink-3">No events yet.</p>
            )}
          </Panel>

          <Panel title="Payouts" aside={<Link href="/super-admin/payouts" className="text-accent hover:underline">All payouts</Link>}>
            {org.payouts.length ? (
              <ul className="flex flex-col gap-2 text-[13px]">
                {org.payouts.map((payout) => (
                  <li key={payout.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      {formatMoney(payout.amountCents, payout.currency)} · {when(payout.createdAt)}
                      {payout.failureReason ? <span className="block text-danger">{payout.failureReason}</span> : null}
                    </span>
                    <Pill tone={PAYOUT_TONE[payout.status] ?? "muted"}>{payout.status}</Pill>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-ink-3">No payouts yet.</p>
            )}
          </Panel>

          {org.openIssues.length ? (
            <Panel title="Open money issues" aside={<Link href="/super-admin/reconciliation" className="text-accent hover:underline">Reconciliation</Link>}>
              <ul className="flex flex-col gap-2 text-[13px]">
                {org.openIssues.map((issue) => (
                  <li key={issue.id} className="flex justify-between gap-2">
                    <span>{issue.title}</span>
                    <Pill tone={issue.severity === "critical" || issue.severity === "high" ? "danger" : "warning"}>{issue.severity}</Pill>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>

        <aside className="flex min-w-0 flex-col gap-5">
          <Panel title="Team">
            <ul className="flex flex-col gap-2 text-[13px]">
              {org.members.map((member) => (
                <li key={member.userId} className="flex items-center justify-between gap-2">
                  <Link href={`/super-admin/people/${member.userId}`} className="min-w-0 truncate text-accent hover:underline">
                    {member.email ?? "Account"}
                  </Link>
                  <span className="shrink-0 text-ink-3">{member.role.replace(/_/g, " ")}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Internal notes">
            <div className="flex flex-col gap-3">
              <NotesList notes={org.notes} />
              {canDo("add_note", role) ? <NoteForm action={addNoteAction} subjectType="organization" subjectId={org.id} /> : null}
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  )
}
