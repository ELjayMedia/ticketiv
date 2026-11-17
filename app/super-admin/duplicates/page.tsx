import Link from "next/link"

import { routeDuplicateRequestAction } from "@/app/super-admin/duplicates/actions"
import { DuplicateRequestForm } from "@/components/super-admin/DuplicateRequestForm"
import { Panel, Pill, when } from "@/components/super-admin/console-ui"
import { listDuplicateRequests, type AdminDuplicateEvent, type DuplicateFilter } from "@/lib/data/admin/duplicates"
import { DUPLICATE_REASONS, autoForwardAt, requestStatusLabel, timeLeftLabel } from "@/lib/events/duplicates-core"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { canDo } from "@/lib/super-admin/console"
import { cn } from "@/lib/cn"

export const metadata = { title: "Duplicate event requests · Admin" }
export const dynamic = "force-dynamic"

const FILTERS: Array<{ key: DuplicateFilter; label: string }> = [
  { key: "support", label: "Waiting for support" },
  { key: "organiser", label: "With the organiser" },
  { key: "closed", label: "Closed" },
]

function EventCard({ label, event }: { label: string; event: AdminDuplicateEvent }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-line bg-bg px-3 py-2.5">
      <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{label}</span>
      <Link href={`/super-admin/event/${event.id}`} className="text-[14px] font-semibold text-ink hover:underline">
        {event.title}
      </Link>
      <span className="text-[13px] text-ink-2">
        <Link href={`/super-admin/organizer/${event.org.id}`} className="text-accent hover:underline">
          {event.org.name}
        </Link>
      </span>
      <span className="font-mono text-[11px] text-ink-3">
        {[when(event.startsAt), event.venueName, event.status].filter(Boolean).join(" · ")}
      </span>
    </div>
  )
}

export default async function DuplicatesPage({ searchParams }: { searchParams: Promise<{ r?: string; f?: string }> }) {
  const { roleTier } = await requireAdminRole(["super_admin", "support_admin", "event_ops_admin", "finance_admin", "read_only_admin"])
  const params = await searchParams
  const filter = FILTERS.find((f) => f.key === params.f)?.key ?? "support"
  const requests = await listDuplicateRequests(filter)
  const selected = requests.find((r) => r.id === params.r) ?? requests[0] ?? null
  const canAct = canDo("route_duplicate_request", roleTier)
  const now = new Date()

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Duplicate event requests</h1>
        <p className="text-[13px] text-ink-3">
          Organisers blocked from publishing an event that matches another organiser&apos;s. Send it to the original organiser, or decide it
          yourself. Anything left here for 3 hours goes to the original organiser automatically.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Filter requests">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/super-admin/duplicates?f=${f.key}`}
            className={cn(
              "min-h-[36px] rounded-full border px-3 py-1.5 text-[13px] font-medium",
              f.key === filter ? "border-ink bg-ink text-surface" : "border-line-2 bg-surface text-ink-2 hover:bg-bg",
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {requests.length === 0 ? (
        <Panel>
          <p className="text-[13px] text-ink-3">Nothing here.</p>
        </Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Panel title={`${requests.length} request${requests.length === 1 ? "" : "s"}`}>
            <ul className="flex flex-col divide-y divide-line">
              {requests.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/super-admin/duplicates?f=${filter}&r=${r.id}`}
                    className={cn("flex flex-col gap-0.5 px-2 py-2.5 hover:bg-bg", selected?.id === r.id && "bg-bg")}
                  >
                    <span className="text-[14px] font-semibold text-ink">
                      {r.event.org.name} → {r.original.org.name}
                    </span>
                    <span className="truncate text-[13px] text-ink-2">
                      &quot;{r.event.title}&quot; vs &quot;{r.original.title}&quot;
                    </span>
                    <span className="font-mono text-[11px] text-ink-3">
                      {r.status === "with_support"
                        ? `Goes to ${r.original.org.name} in ${timeLeftLabel(autoForwardAt(r.createdAt), now)}`
                        : requestStatusLabel(r.status, r.original.org.name)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>

          {selected ? (
            <Panel
              title="Request"
              aside={<Pill tone={selected.status === "with_support" ? "warning" : selected.status === "approved" ? "success" : selected.status === "declined" ? "danger" : "muted"}>{requestStatusLabel(selected.status, selected.original.org.name)}</Pill>}
            >
              <div className="flex flex-col gap-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  <EventCard label="Wants to publish" event={selected.event} />
                  <EventCard label="Matches (published)" event={selected.original} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[13px] font-semibold text-ink">
                    {DUPLICATE_REASONS.find((x) => x.value === selected.reason)?.label ?? "Message"}
                  </span>
                  <p className="whitespace-pre-line rounded-lg bg-bg px-3 py-2 text-[14px] leading-relaxed text-ink">{selected.message}</p>
                  <span className="text-[12px] text-ink-3">Sent {when(selected.createdAt)}</span>
                </div>
                {selected.forwardedAt ? (
                  <p className="text-[13px] text-ink-2">
                    {selected.forwardedBy === "auto" ? "Sent to the organiser automatically" : "Passed to the organiser by support"} {when(selected.forwardedAt)}.
                    {selected.supportNote ? ` Note: "${selected.supportNote}"` : ""}
                  </p>
                ) : null}
                {selected.decidedAt ? (
                  <p className="text-[13px] text-ink-2">
                    {selected.status === "approved" ? "Approved" : "Declined"} by {selected.decidedByRole === "support" ? "support" : selected.original.org.name}{" "}
                    {when(selected.decidedAt)}.{selected.decisionNote ? ` "${selected.decisionNote}"` : ""}
                  </p>
                ) : null}
                {selected.reason === "mine_is_original" && selected.status === "with_support" ? (
                  <p className="rounded-lg bg-danger-soft px-3 py-2 text-[13px] text-ink-2">
                    The requester says the published listing isn&apos;t genuine. Check both organisers before passing this on. If the published
                    event is a fake, approve this request and take the other event down from its event page.
                  </p>
                ) : null}
                {canAct && (selected.status === "with_support" || selected.status === "with_organiser") ? (
                  <DuplicateRequestForm
                    action={routeDuplicateRequestAction}
                    requestId={selected.id}
                    canForward={selected.status === "with_support"}
                    originalOrgName={selected.original.org.name}
                  />
                ) : null}
              </div>
            </Panel>
          ) : null}
        </div>
      )}
    </div>
  )
}
