import Link from "next/link"

import { decideDuplicateRequestAction } from "@/app/orgs/[orgId]/permission-requests/actions"
import { DuplicateDecisionForm } from "@/components/organizer/duplicate-decision-form"
import { Card, CardBody } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { DUPLICATE_REASONS, requestStatusLabel, type DuplicateRequestReason, type DuplicateRequestStatus } from "@/lib/events/duplicates-core"
import { requireOrgManager } from "@/lib/organizer/access"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export const metadata = { title: "Permission requests" }
export const dynamic = "force-dynamic"

interface OrgRequest {
  id: string
  direction: "incoming" | "outgoing"
  status: DuplicateRequestStatus
  reason: DuplicateRequestReason
  message: string
  supportNote: string | null
  forwardedBy: "support" | "auto" | null
  decisionNote: string | null
  createdAt: string
  event: { id: string; title: string; startsAt: string | null; tz: string | null }
  requestingOrg: { id: string; name: string }
  originalEvent: { id: string; title: string; startsAt: string | null; tz: string | null }
  originalOrg: { id: string; name: string }
}

function day(iso: string | null, tz: string | null) {
  if (!iso) return "No date"
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: tz || "Africa/Mbabane" }).format(new Date(iso))
}

/**
 * Requests from other organisers who want to publish an event that matches
 * one of ours (passed on by support, or automatically after 3 hours), and the
 * status of requests we sent.
 */
export default async function PermissionRequestsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params
  await requireOrgManager(orgId)
  const supabase = await createServerSupabaseClient()
  const { data } = supabase ? await (supabase.rpc as any)("fn_org_duplicate_requests", { p_org_id: orgId }) : { data: [] }
  const requests = (data ?? []) as OrgRequest[]
  const incoming = requests.filter((r) => r.direction === "incoming")
  const outgoing = requests.filter((r) => r.direction === "outgoing")

  return (
    <main className="flex-1 overflow-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-h1">Permission requests</h1>
          <p className="text-[13px] text-ink-3">
            Ticketiv stops other organisers publishing an event that matches one of yours. When they have a reason, like co-hosting or
            selling for you, they can ask. You decide.
          </p>
        </div>

        <section className="flex flex-col gap-2.5">
          <h2 className="text-[18px] font-semibold tracking-[-0.01em]">Asking you</h2>
          {incoming.length === 0 ? (
            <Card>
              <CardBody className="p-4 text-[13px] text-ink-3">No one has asked to list an event like yours.</CardBody>
            </Card>
          ) : (
            incoming.map((r) => (
              <Card key={r.id}>
                <CardBody className="flex flex-col gap-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[15px] font-semibold">
                        {r.requestingOrg.name} wants to publish &quot;{r.event.title}&quot;
                      </span>
                      <span className="font-mono text-[11px] text-ink-3">
                        {day(r.event.startsAt, r.event.tz)} · matches your{" "}
                        <Link href={`/orgs/${orgId}/events/${r.originalEvent.id}`} className="text-accent hover:underline">
                          {r.originalEvent.title}
                        </Link>
                      </span>
                    </div>
                    <Chip size="sm" variant={r.status === "with_organiser" ? "accent" : "muted"}>
                      {r.status === "with_organiser" ? "Needs your answer" : requestStatusLabel(r.status, "you")}
                    </Chip>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[12px] font-semibold text-ink-3">
                      {DUPLICATE_REASONS.find((x) => x.value === r.reason)?.label}
                    </span>
                    <p className="whitespace-pre-line rounded-[var(--radius)] bg-bg px-3 py-2 text-[14px] leading-relaxed">{r.message}</p>
                    {r.supportNote ? <p className="text-[12px] text-ink-3">Note from Ticketiv support: {r.supportNote}</p> : null}
                    {r.forwardedBy === "auto" ? (
                      <p className="text-[12px] text-ink-3">Sent to you directly because Ticketiv support hadn&apos;t replied within 3 hours.</p>
                    ) : null}
                  </div>
                  {r.status === "with_organiser" ? (
                    <DuplicateDecisionForm action={decideDuplicateRequestAction} orgId={orgId} requestId={r.id} requesterName={r.requestingOrg.name} />
                  ) : r.decisionNote ? (
                    <p className="text-[12px] text-ink-3">Your note: {r.decisionNote}</p>
                  ) : null}
                </CardBody>
              </Card>
            ))
          )}
        </section>

        {outgoing.length > 0 ? (
          <section className="flex flex-col gap-2.5">
            <h2 className="text-[18px] font-semibold tracking-[-0.01em]">Sent by you</h2>
            <Card className="overflow-hidden">
              <ul className="flex flex-col divide-y divide-line">
                {outgoing.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <span className="flex min-w-0 flex-col">
                      <Link href={`/orgs/${orgId}/events/${r.event.id}/edit`} className="truncate text-[14px] font-semibold hover:underline">
                        {r.event.title}
                      </Link>
                      <span className="text-[12px] text-ink-3">
                        Matches &quot;{r.originalEvent.title}&quot; by {r.originalOrg.name}
                        {r.decisionNote ? ` · "${r.decisionNote}"` : ""}
                      </span>
                    </span>
                    <Chip size="sm" variant={r.status === "approved" ? "accent" : "muted"}>
                      {requestStatusLabel(r.status, r.originalOrg.name)}
                    </Chip>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        ) : null}
      </div>
    </main>
  )
}
