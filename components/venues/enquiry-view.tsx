import Link from "next/link"
import type { ReactNode } from "react"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { cn } from "@/lib/cn"
import { enquiryStatusLabel, formatMoney, formatVenueRange } from "@/lib/venues/marketplace"
import type { EnquiryDetail, EnquirySummary } from "@/lib/venues/marketplace-data"

function statusVariant(status: string) {
  return status === "accepted" ? "active" : status === "open" ? "accent" : "muted"
}

export function EnquiryList({ enquiries, hrefFor, counterpart, empty }: {
  enquiries: EnquirySummary[]
  hrefFor: (e: EnquirySummary) => string
  counterpart: (e: EnquirySummary) => string
  empty: string
}) {
  if (enquiries.length === 0) {
    return (
      <Card flat className="border-dashed">
        <CardBody className="p-5 text-[13px] text-ink-3">{empty}</CardBody>
      </Card>
    )
  }
  return (
    <Card>
      <ul className="divide-y divide-line">
        {enquiries.map((e) => (
          <li key={e.id}>
            <Link href={hrefFor(e)} className="flex flex-col gap-1 px-5 py-3 hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[14px] font-semibold text-ink">{counterpart(e)}</span>
                <span className="font-mono text-[12px] text-ink-3">
                  {formatVenueRange(e.startsAt, e.endsAt)}
                  {e.spaceName ? ` · ${e.spaceName}` : " · Whole venue"}
                </span>
              </div>
              <Chip size="sm" variant={statusVariant(e.status) as any}>
                {enquiryStatusLabel(e.status)}
              </Chip>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/** Enquiry details and its conversation. `actions` holds the side-specific controls. */
export function EnquiryDetailView({ enquiry, side, actions, reply }: {
  enquiry: EnquiryDetail
  side: "venue" | "organizer"
  actions?: ReactNode
  reply?: ReactNode
}) {
  const facts = [
    ["When", formatVenueRange(enquiry.startsAt, enquiry.endsAt)],
    ["Space", enquiry.spaceName ?? "Whole venue"],
    ["Expected attendance", enquiry.expectedAttendance ? enquiry.expectedAttendance.toLocaleString("en-GB") : "Not given"],
    ["Budget", enquiry.budgetCents != null ? formatMoney(enquiry.budgetCents, enquiry.currency) : "Not given"],
  ]
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardBody className="flex flex-col gap-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-h1">{side === "venue" ? enquiry.orgName ?? "Organiser" : enquiry.venueName ?? "Venue"}</h1>
            <Chip size="sm" variant={statusVariant(enquiry.status) as any}>
              {enquiryStatusLabel(enquiry.status)}
            </Chip>
          </div>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            {facts.map(([k, v]) => (
              <div key={k} className="flex flex-col">
                <dt className="text-label">{k}</dt>
                <dd className="text-[14px] text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          {enquiry.decisionNote ? <p className="text-[13px] text-ink-2">Venue note: {enquiry.decisionNote}</p> : null}
          {side === "organizer" && enquiry.venueSlug ? (
            <Link href={`/venues/${enquiry.venueSlug}`} className="text-[13px] font-semibold text-accent hover:underline">
              Venue page
            </Link>
          ) : null}
          {actions}
        </CardBody>
      </Card>

      <section aria-labelledby="thread" className="flex flex-col gap-3">
        <h2 id="thread" className="text-h2">
          Conversation
        </h2>
        <ol className="flex flex-col gap-2">
          {enquiry.messages.map((m) => {
            const fromMySide = m.side === side
            return (
              <li key={m.id} className={cn("flex flex-col gap-1 rounded-[var(--radius-md)] border p-3", fromMySide ? "border-accent/30 bg-accent-soft/40 sm:ml-10" : "border-line bg-surface sm:mr-10")}>
                <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                  {m.side === "venue" ? enquiry.venueName ?? "Venue" : enquiry.orgName ?? "Organiser"}
                  {m.mine ? " · you" : ""} ·{" "}
                  {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Mbabane" }).format(new Date(m.createdAt))}
                </span>
                <p className="whitespace-pre-line text-[14px] text-ink">{m.body}</p>
              </li>
            )
          })}
        </ol>
        {reply}
      </section>
    </div>
  )
}
