import Link from "next/link"

import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon, type IconName } from "@/components/quiet/ui/icon"
import { cn } from "@/lib/cn"
import { getPostEventReconciliationOverview, type PostEventReconciliationRow } from "@/lib/data/admin/reconciliation"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { logReconciliationReviewAction } from "./actions"

export const dynamic = "force-dynamic"
export const metadata = { title: "Post-event reconciliation | Super Admin" }

type SearchParams = Promise<{ status?: string }>

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

export default async function SuperAdminReconciliationPage({ searchParams }: { searchParams?: SearchParams }) {
  const { roleTier } = await requireAdminRole(["super_admin", "finance_admin", "read_only_admin"])
  const query = searchParams ? await searchParams : {}
  const overview = await getPostEventReconciliationOverview()
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
