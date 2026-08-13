import Link from "next/link"

import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon, type IconName } from "@/components/quiet/ui/icon"
import { cn } from "@/lib/cn"
import {
  getFinanceReconciliationQueue,
  getPostEventReconciliationOverview,
  type FinanceReconciliationIssueRow,
  type FinanceReconciliationIssueSeverity,
  type FinanceReconciliationIssueStatus,
  type PostEventReconciliationRow,
} from "@/lib/data/admin/reconciliation"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { logReconciliationReviewAction, updateReconciliationIssueAction } from "./actions"

export const dynamic = "force-dynamic"
export const metadata = { title: "Post-event reconciliation | Super Admin" }

type QueueStatusFilter = FinanceReconciliationIssueStatus | "active" | "all"
type QueueSeverityFilter = FinanceReconciliationIssueSeverity | "all"
type SearchParams = Promise<{ status?: string; queue?: string; severity?: string }>

const QUEUE_STATUS_FILTERS: Array<{ value: QueueStatusFilter; label: string }> = [
  { value: "active", label: "Active" },
  { value: "open", label: "Open" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "resolved", label: "Resolved" },
  { value: "ignored", label: "Ignored" },
  { value: "all", label: "All" },
]

const QUEUE_SEVERITY_FILTERS: Array<{ value: QueueSeverityFilter; label: string }> = [
  { value: "all", label: "All severity" },
  { value: "critical", label: "Critical" },
  { value: "warning", label: "Warning" },
]

function isQueueStatus(value: string | undefined): value is QueueStatusFilter {
  return QUEUE_STATUS_FILTERS.some((filter) => filter.value === value)
}

function isQueueSeverity(value: string | undefined): value is QueueSeverityFilter {
  return QUEUE_SEVERITY_FILTERS.some((filter) => filter.value === value)
}

function queueHref(status: QueueStatusFilter, severity: QueueSeverityFilter) {
  const params = new URLSearchParams()
  if (status !== "active") params.set("queue", status)
  if (severity !== "all") params.set("severity", severity)
  const query = params.toString()
  return `/super-admin/reconciliation${query ? `?${query}` : ""}`
}

function money(cents: number, currency = "SZL") {
  return `${currency} ${(cents / 100).toLocaleString("en-SZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function signedMoney(cents: number, currency = "SZL") {
  const sign = cents < 0 ? "-" : ""
  return `${sign}${money(Math.abs(cents), currency)}`
}

function fmtDate(iso: string | null) {
  if (!iso) return "No date"
  return new Intl.DateTimeFormat("en-SZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso))
}

function shortId(value: string | null) {
  if (!value) return "Unassigned"
  return `${value.slice(0, 8)}…${value.slice(-4)}`
}

function formatAge(seconds: number) {
  if (seconds < 60) return "Just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

function detailLabel(value: string) {
  return value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase())
}

function detailValue(value: unknown) {
  if (value === null || value === undefined) return "—"
  if (Array.isArray(value)) return value.map((item) => String(item)).join(", ")
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

function statusMeta(status: PostEventReconciliationRow["status"]): {
  label: string
  chip: "active" | "accent" | "muted"
  border: string
  icon: IconName
} {
  if (status === "ok") {
    return { label: "Ready", chip: "accent", border: "border-accent/40", icon: "check" }
  }
  if (status === "warning") {
    return { label: "Review", chip: "muted", border: "border-warning/50", icon: "bell" }
  }
  return { label: "Blocked", chip: "muted", border: "border-danger/50", icon: "close" }
}

function MetricTile({ label, value, detail, icon }: { label: string; value: string; detail?: string; icon: IconName }) {
  return (
    <Card>
      <CardBody className="flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-label">{label}</span>
          <Icon name={icon} size={15} className="text-ink-3" />
        </div>
        <p className="font-mono text-[22px] font-semibold tabular-nums text-ink">{value}</p>
        {detail && <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{detail}</p>}
      </CardBody>
    </Card>
  )
}

function CompareCell({ label, expected, actual, currency }: { label: string; expected: number; actual: number; currency: string }) {
  const ok = expected === actual
  return (
    <div className={cn("rounded-[var(--radius-md)] border p-3", ok ? "border-line bg-bg" : "border-danger/40 bg-danger/5")}>
      <p className="text-label">{label}</p>
      <div className="mt-2 grid grid-cols-2 gap-3 font-mono text-[12px] tabular-nums">
        <div>
          <p className="uppercase tracking-wider text-ink-3">Expected</p>
          <p className="mt-1 font-semibold text-ink">{label === "Fees" ? signedMoney(-expected, currency) : money(expected, currency)}</p>
        </div>
        <div>
          <p className="uppercase tracking-wider text-ink-3">Ledger</p>
          <p className={cn("mt-1 font-semibold", ok ? "text-ink" : "text-danger")}>
            {label === "Fees" ? signedMoney(actual, currency) : money(actual, currency)}
          </p>
        </div>
      </div>
    </div>
  )
}

function CheckRow({ check }: { check: PostEventReconciliationRow["checks"][number] }) {
  const icon = check.status === "ok" ? "check" : check.status === "warning" ? "bell" : "close"
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-line p-3">
      <span
        className={cn(
          "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
          check.status === "ok" ? "bg-accent-soft text-accent" : "bg-danger/10 text-danger",
        )}
      >
        <Icon name={icon} size={13} />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-ink">{check.label}</p>
        <p className="mt-0.5 text-[12px] leading-5 text-ink-3">{check.detail}</p>
      </div>
    </div>
  )
}

function EventCard({ event, canLogReview }: { event: PostEventReconciliationRow; canLogReview: boolean }) {
  const meta = statusMeta(event.status)
  return (
    <Card className={cn("border", meta.border)}>
      <CardBody className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Chip size="sm" variant={meta.chip}>
                <Icon name={meta.icon} size={12} />
                {meta.label}
              </Chip>
              <Chip size="sm" variant="muted">{event.eventStatus}</Chip>
              {event.openPayoutCount > 0 && (
                <Chip size="sm" variant="default">
                  {event.openPayoutCount} open payout{event.openPayoutCount === 1 ? "" : "s"}
                </Chip>
              )}
            </div>
            <h2 className="text-[17px] font-semibold text-ink">{event.title}</h2>
            <p className="mt-1 text-[13px] text-ink-3">
              {event.orgName} · ended {fmtDate(event.endsAt ?? event.startsAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/super-admin/events/${event.eventId}`}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 px-3 py-2 text-[12px] font-semibold text-ink transition hover:bg-bg"
            >
              Event <Icon name="arrowR" size={12} />
            </Link>
            <Link
              href="/super-admin/payouts"
              className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 px-3 py-2 text-[12px] font-semibold text-ink transition hover:bg-bg"
            >
              Payouts <Icon name="wallet" size={12} />
            </Link>
            {canLogReview && (
              <form action={logReconciliationReviewAction.bind(null, event.eventId)}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-accent bg-accent px-3 py-2 text-[12px] font-semibold text-white transition hover:opacity-90"
                >
                  Log review <Icon name="fileText" size={12} />
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <CompareCell label="Gross" expected={event.expectedGrossCents} actual={event.ledgerGrossCents} currency={event.currency} />
          <CompareCell label="Fees" expected={event.expectedFeeCents} actual={event.ledgerFeeSignedCents} currency={event.currency} />
          <CompareCell label="Net" expected={event.expectedNetCents} actual={event.ledgerNetCents} currency={event.currency} />
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <MiniStat label="Paid orders" value={event.paidOrderCount.toLocaleString("en-SZ")} />
          <MiniStat
            label="Tickets sold"
            value={`${event.paidTicketCount.toLocaleString("en-SZ")} / ${(event.statsTicketsSold ?? 0).toLocaleString("en-SZ")}`}
            detail="issued vs live stats"
          />
          <MiniStat label="Succeeded payments" value={money(event.succeededPaymentCents, event.currency)} />
          <MiniStat
            label="Attempt issues"
            value={(event.stuckPaymentAttemptCount + event.orphanedPaymentAttemptCount).toLocaleString("en-SZ")}
            detail={`${event.stuckPaymentAttemptCount} stuck, ${event.orphanedPaymentAttemptCount} orphaned`}
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-5">
          {event.checks.map((check) => (
            <CheckRow key={check.key} check={check} />
          ))}
        </div>
      </CardBody>
    </Card>
  )
}

function MiniStat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-line bg-bg p-3">
      <p className="text-label">{label}</p>
      <p className="mt-1 font-mono text-[14px] font-semibold tabular-nums text-ink">{value}</p>
      {detail && <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-3">{detail}</p>}
    </div>
  )
}

function EvidenceLink({ href, label, value }: { href: string; label: string; value: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-w-0 items-center gap-1.5 rounded-[var(--radius)] border border-line-2 px-2.5 py-1.5 text-[11px] font-semibold text-ink transition hover:bg-bg"
    >
      <span>{label}</span>
      <span className="max-w-28 truncate font-mono text-ink-3">{shortId(value)}</span>
      <Icon name="arrowR" size={11} />
    </Link>
  )
}

function DiscrepancyCard({ issue, canAct }: { issue: FinanceReconciliationIssueRow; canAct: boolean }) {
  const details = Object.entries(issue.details).slice(0, 8)
  const active = issue.status === "open" || issue.status === "acknowledged"

  return (
    <Card className={cn("border", active && issue.severity === "critical" ? "border-danger/50" : "border-line")}>
      <CardBody className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Chip
                size="sm"
                variant={issue.severity === "critical" ? "muted" : "default"}
                className={issue.severity === "critical" ? "border border-danger/30 bg-danger/10 text-danger" : undefined}
              >
                <Icon name={issue.severity === "critical" ? "bell" : "clock"} size={11} />
                {detailLabel(issue.severity)}
              </Chip>
              <Chip size="sm" variant={issue.status === "acknowledged" ? "active" : issue.status === "resolved" ? "accent" : "muted"}>
                {detailLabel(issue.status)}
              </Chip>
              <span className="font-mono text-[10px] uppercase text-ink-3">Age {formatAge(issue.ageSeconds)}</span>
            </div>
            <h3 className="text-[15px] font-semibold text-ink">{issue.title}</h3>
            <p className="mt-1 break-all font-mono text-[10px] uppercase text-ink-3">{issue.detectorKey}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {issue.orderId && <EvidenceLink href={`/super-admin/orders/${issue.orderId}`} label="Order" value={issue.orderId} />}
            {issue.paymentId && <EvidenceLink href={`/super-admin/payments/${issue.paymentId}`} label="Payment" value={issue.paymentId} />}
            {issue.refundId && <EvidenceLink href={`/super-admin/refunds/${issue.refundId}`} label="Refund" value={issue.refundId} />}
          </div>
        </div>

        {details.length > 0 && (
          <dl className="grid gap-x-4 gap-y-3 rounded-[var(--radius-md)] border border-line bg-bg p-3 sm:grid-cols-2 xl:grid-cols-4">
            {details.map(([key, value]) => (
              <div key={key} className="min-w-0">
                <dt className="font-mono text-[9px] uppercase text-ink-3">{detailLabel(key)}</dt>
                <dd className="mt-1 break-all font-mono text-[11px] text-ink">{detailValue(value)}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="grid gap-3 text-[11px] text-ink-3 sm:grid-cols-2 lg:grid-cols-4">
          <p><span className="font-semibold text-ink-2">Owner:</span> <span className="font-mono">{shortId(issue.ownerUserId)}</span></p>
          <p><span className="font-semibold text-ink-2">First seen:</span> {fmtDate(issue.firstDetectedAt)}</p>
          <p><span className="font-semibold text-ink-2">Last seen:</span> {fmtDate(issue.lastDetectedAt)}</p>
          <p className="break-all"><span className="font-semibold text-ink-2">Runbook:</span> {issue.runbookKey}</p>
        </div>

        {issue.resolutionNote && (
          <div className="rounded-[var(--radius-md)] border border-line bg-bg p-3">
            <p className="text-label">Resolution note</p>
            <p className="mt-1 whitespace-pre-wrap text-[12px] leading-5 text-ink-2">{issue.resolutionNote}</p>
          </div>
        )}

        {canAct && issue.status === "open" && (
          <form action={updateReconciliationIssueAction.bind(null, issue.id, "acknowledged")}>
            <button
              type="submit"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-[var(--radius)] border border-accent bg-accent px-3 py-2 text-[12px] font-semibold text-white transition hover:opacity-90"
            >
              <Icon name="check" size={13} /> Acknowledge
            </button>
          </form>
        )}

        {canAct && issue.status === "acknowledged" && (
          <form action={updateReconciliationIssueAction.bind(null, issue.id, "resolved")} className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-line p-3">
            <label htmlFor={`resolution-note-${issue.id}`} className="text-label">Resolution note</label>
            <textarea
              id={`resolution-note-${issue.id}`}
              name="resolution_note"
              required
              maxLength={1000}
              rows={3}
              className="min-h-20 w-full resize-y rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-2 text-[13px] text-ink outline-none transition focus:border-accent"
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="submit"
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[var(--radius)] border border-accent bg-accent px-3 py-2 text-[12px] font-semibold text-white transition hover:opacity-90"
              >
                <Icon name="check" size={13} /> Resolve
              </button>
              <button
                type="submit"
                formAction={updateReconciliationIssueAction.bind(null, issue.id, "ignored")}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[var(--radius)] border border-line-2 px-3 py-2 text-[12px] font-semibold text-ink transition hover:bg-bg"
              >
                <Icon name="close" size={13} /> Ignore
              </button>
            </div>
          </form>
        )}

        {canAct && (issue.status === "resolved" || issue.status === "ignored") && (
          <form action={updateReconciliationIssueAction.bind(null, issue.id, "open")}>
            <button
              type="submit"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-[var(--radius)] border border-line-2 px-3 py-2 text-[12px] font-semibold text-ink transition hover:bg-bg"
            >
              <Icon name="clock" size={13} /> Reopen
            </button>
          </form>
        )}
      </CardBody>
    </Card>
  )
}

export default async function SuperAdminReconciliationPage({ searchParams }: { searchParams?: SearchParams }) {
  const { roleTier } = await requireAdminRole(["super_admin", "finance_admin", "read_only_admin"])
  const query = searchParams ? await searchParams : {}
  const queueStatus = isQueueStatus(query.queue) ? query.queue : "active"
  const queueSeverity = isQueueSeverity(query.severity) ? query.severity : "all"
  const [overview, queue] = await Promise.all([
    getPostEventReconciliationOverview(),
    getFinanceReconciliationQueue({ status: queueStatus, severity: queueSeverity }),
  ])
  const canLogReview = roleTier !== "read_only_admin"

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Link
            href="/super-admin"
            className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 underline-offset-4 hover:underline"
          >
            <Icon name="chevL" size={14} />
            Command centre
          </Link>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-ink-3">MONEY / RECONCILIATION</p>
          <h1 className="text-h1 mt-1">Post-event reconciliation</h1>
          <p className="mt-1 max-w-3xl text-[13px] leading-6 text-ink-3">
            Finance admin review for ended events before payouts are released. Checks compare paid orders, issued tickets,
            event_live_stats, payment attempts and ledger gross/fee/net rows.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/super-admin/payouts"
            className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 px-3 py-2 text-[12px] font-semibold text-ink transition hover:bg-bg"
          >
            Payout queue <Icon name="wallet" size={13} />
          </Link>
          <Link
            href="/super-admin/ledger-entries"
            className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 px-3 py-2 text-[12px] font-semibold text-ink transition hover:bg-bg"
          >
            Ledger <Icon name="fileText" size={13} />
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Events reviewed" value={overview.totals.events.toLocaleString("en-SZ")} icon="cal" />
        <MetricTile label="Ready" value={overview.totals.ready.toLocaleString("en-SZ")} detail="Clear for payout review" icon="check" />
        <MetricTile label="Needs action" value={overview.totals.blocked.toLocaleString("en-SZ")} detail="Resolve before release" icon="bell" />
        <MetricTile
          label="Open payouts"
          value={overview.totals.openPayouts.toLocaleString("en-SZ")}
          detail={money(overview.totals.openPayoutCents)}
          icon="wallet"
        />
      </div>

      <Card>
        <CardBody className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[13px] font-semibold text-ink">Owner: finance admin</p>
            <p className="mt-0.5 text-[12px] text-ink-3">
              Discrepancies shown here should be resolved or explicitly noted in the payout audit trail before settlement.
            </p>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
            Refreshed {fmtDate(overview.generatedAt)}
          </p>
        </CardBody>
      </Card>

      {query.status === "review_logged" && (
        <Card className="border-accent/40 bg-accent-soft/40">
          <CardBody className="flex items-center gap-3 p-4">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Icon name="check" size={15} />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-ink">Reconciliation review logged</p>
              <p className="mt-0.5 text-[12px] text-ink-3">The current event checks were written to the audit log.</p>
            </div>
          </CardBody>
        </Card>
      )}

      {query.status === "issue_updated" && (
        <Card className="border-accent/40 bg-accent-soft/40">
          <CardBody className="flex items-center gap-3 p-4">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Icon name="check" size={15} />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-ink">Discrepancy updated</p>
              <p className="mt-0.5 text-[12px] text-ink-3">Ownership, status and audit history are current.</p>
            </div>
          </CardBody>
        </Card>
      )}

      <section aria-labelledby="discrepancy-queue-heading" className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-ink-3">FINANCE OPERATIONS</p>
            <h2 id="discrepancy-queue-heading" className="mt-1 text-[20px] font-semibold text-ink">Discrepancy queue</h2>
          </div>
          <div className="flex flex-wrap gap-2 font-mono text-[10px] uppercase text-ink-3">
            <span>{queue.totals.active} active</span>
            <span>·</span>
            <span className={queue.totals.critical > 0 ? "text-danger" : undefined}>{queue.totals.critical} critical</span>
            <span>·</span>
            <span>{queue.totals.acknowledged} owned</span>
          </div>
        </div>

        <Card>
          <CardBody className="flex flex-col gap-3 p-4">
            <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Queue status filter">
              {QUEUE_STATUS_FILTERS.map((filter) => (
                <Link
                  key={filter.value}
                  href={queueHref(filter.value, queueSeverity)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
                    queueStatus === filter.value ? "border-ink bg-ink text-surface" : "border-line-2 text-ink hover:bg-bg",
                  )}
                >
                  {filter.label}
                </Link>
              ))}
            </div>
            <CardDivider />
            <div className="flex gap-2 overflow-x-auto pt-1" aria-label="Queue severity filter">
              {QUEUE_SEVERITY_FILTERS.map((filter) => (
                <Link
                  key={filter.value}
                  href={queueHref(queueStatus, filter.value)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
                    queueSeverity === filter.value ? "border-accent bg-accent text-white" : "border-line-2 text-ink hover:bg-bg",
                  )}
                >
                  {filter.label}
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>

        {queue.issues.length === 0 ? (
          <Card className="border-accent/30">
            <CardBody className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <Icon name="check" size={20} className="text-accent" />
              <p className="text-[14px] font-semibold text-ink">No matching discrepancies</p>
              <p className="text-[12px] text-ink-3">The selected queue is clear.</p>
            </CardBody>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {queue.issues.map((issue) => <DiscrepancyCard key={issue.id} issue={issue} canAct={canLogReview} />)}
          </div>
        )}
      </section>

      {overview.events.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <Icon name="check" size={20} className="text-accent" />
            <p className="text-[14px] font-semibold">No ended events to reconcile</p>
            <p className="text-[12px] text-ink-3">Past event checks will appear here once events have started and ticket activity exists.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {overview.events.map((event) => (
            <EventCard key={event.eventId} event={event} canLogReview={canLogReview} />
          ))}
        </div>
      )}
    </main>
  )
}
