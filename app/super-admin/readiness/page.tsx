import Link from "next/link"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireSuperAdmin } from "@/lib/super-admin/auth"

type ReadinessRow = {
  event_id: string
  org_id: string | null
  title: string | null
  status: string | null
  visibility: string | null
  starts_at: string | null
  ends_at: string | null
  on_sale_ticket_types: number | null
  has_active_pricing_plan: boolean | null
  has_payout_account: boolean | null
  checks: Record<string, boolean>
}

type CheckDefinition = {
  key: string
  label: string
  actionLabel: string
  href: (event: ReadinessRow) => string
}

const CHECKS: CheckDefinition[] = [
  { key: "has_organization", label: "Organization assigned", actionLabel: "Open orgs", href: () => "/super-admin/organizations" },
  { key: "has_venue", label: "Venue assigned", actionLabel: "Open venues", href: () => "/super-admin/venues" },
  { key: "has_title", label: "Title added", actionLabel: "Open event", href: (event) => `/super-admin/events/${event.event_id}` },
  { key: "has_slug", label: "Slug added", actionLabel: "Open event", href: (event) => `/super-admin/events/${event.event_id}` },
  { key: "has_start_date", label: "Start date added", actionLabel: "Open event", href: (event) => `/super-admin/events/${event.event_id}` },
  { key: "has_valid_date_range", label: "Date range valid", actionLabel: "Open event", href: (event) => `/super-admin/events/${event.event_id}` },
  { key: "has_cover_image", label: "Cover image added", actionLabel: "Open event", href: (event) => `/super-admin/events/${event.event_id}` },
  { key: "has_description", label: "Description added", actionLabel: "Open event", href: (event) => `/super-admin/events/${event.event_id}` },
  { key: "has_on_sale_ticket_type", label: "On-sale ticket tier available", actionLabel: "Ticket tiers", href: () => "/super-admin/ticket-types" },
  { key: "has_online_sales_channel", label: "Online sales channel enabled", actionLabel: "Ticket tiers", href: () => "/super-admin/ticket-types" },
  { key: "has_refund_or_support", label: "Refund or support policy set", actionLabel: "Open event", href: (event) => `/super-admin/events/${event.event_id}` },
  { key: "has_active_staff", label: "Check-in staff assigned", actionLabel: "Event staff", href: () => "/super-admin/event-staff" },
  { key: "has_live_stats_row", label: "Live stats initialized", actionLabel: "Open event", href: (event) => `/super-admin/events/${event.event_id}` },
  { key: "has_active_pricing_plan", label: "Active pricing plan", actionLabel: "Pricing", href: () => "/super-admin/pricing-plans" },
  { key: "has_payout_account", label: "Payout account present", actionLabel: "Payout accounts", href: () => "/super-admin/payout-accounts" },
]

function readinessScore(checks: Record<string, boolean>) {
  const passed = CHECKS.filter((check) => checks?.[check.key]).length
  return { passed, total: CHECKS.length }
}

function missingChecks(event: ReadinessRow) {
  return CHECKS.filter((check) => !event.checks?.[check.key])
}

function missingCount(rows: ReadinessRow[], key: string) {
  return rows.filter((row) => !row.checks?.[key]).length
}

function primaryMissingActions(event: ReadinessRow, missing: CheckDefinition[]) {
  const eventHref = `/super-admin/events/${event.event_id}`
  const skippedHrefs = new Set([eventHref, "/super-admin/ticket-types"])
  const seen = new Set<string>()

  return missing.filter((check) => {
    const href = check.href(event)
    const key = `${href}:${check.actionLabel}`
    if (skippedHrefs.has(href) || seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 2)
}

export default async function SuperAdminReadinessPage() {
  await requireSuperAdmin()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("admin_event_readiness")
    .select("event_id, org_id, title, status, visibility, starts_at, ends_at, on_sale_ticket_types, has_active_pricing_plan, has_payout_account, checks")
    .order("starts_at", { ascending: true, nullsFirst: false })
    .limit(100)

  if (error) throw new Error(error.message)

  const rows = ((data ?? []) as ReadinessRow[]).map((event) => {
    const score = readinessScore(event.checks ?? {})
    return { event, score, ready: score.passed === score.total, missing: missingChecks(event) }
  })
  const readyCount = rows.filter((row) => row.ready).length
  const totalEvents = rows.length
  const sourceRows = rows.map((row) => row.event)

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <Link
            href="/super-admin"
            className="inline-flex w-fit items-center gap-1.5 text-[13px] text-ink-3 underline-offset-4 hover:underline"
          >
            <Icon name="chevL" size={14} />
            Back to Command Centre
          </Link>
          <h1 className="text-h1">Event readiness</h1>
          <p className="text-[13px] text-ink-3">
            Checklist view for events before publishing or campaign launch.
          </p>
        </div>
        <Link
          href="/super-admin/payout-accounts"
          className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-transparent px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-bg"
        >
          <Icon name="wallet" size={14} />
          Review payout accounts
        </Link>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryTile label="Ready" value={`${readyCount}/${totalEvents}`} />
        <SummaryTile label="Missing payouts" value={missingCount(sourceRows, "has_payout_account")} />
        <SummaryTile label="Missing staff" value={missingCount(sourceRows, "has_active_staff")} />
        <SummaryTile label="Missing support" value={missingCount(sourceRows, "has_refund_or_support")} />
        <SummaryTile label="Missing pricing" value={missingCount(sourceRows, "has_active_pricing_plan")} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {rows.length === 0 ? (
          <Card>
            <CardBody className="p-8 text-center text-[13px] text-ink-3">
              No event readiness rows are available.
            </CardBody>
          </Card>
        ) : rows.map(({ event, score, ready, missing }) => {
          const primaryActions = primaryMissingActions(event, missing)
          return (
            <Card key={event.event_id}>
              <CardBody className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <p className="text-[16px] font-semibold text-ink">{event.title ?? "Untitled event"}</p>
                    <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                      {event.status} · {event.visibility} · {score.passed}/{score.total} checks passed
                    </p>
                  </div>
                  <Icon
                    name={ready ? "check" : "close"}
                    size={20}
                    className={ready ? "text-success" : "text-ink-3"}
                  />
                </div>

                <div className="grid gap-2 text-[13px]">
                  {CHECKS.map((check) => {
                    const passed = Boolean(event.checks?.[check.key])
                    return (
                      <div
                        key={check.key}
                        className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-line px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="text-ink">{check.label}</span>
                        <div className="flex items-center gap-2">
                          <span className={passed ? "font-mono text-[11px] uppercase tracking-wider text-success" : "font-mono text-[11px] uppercase tracking-wider text-ink-3"}>
                            {passed ? "Pass" : "Missing"}
                          </span>
                          {!passed && (
                            <Link
                              href={check.href(event)}
                              className="inline-flex items-center gap-1 rounded-[var(--radius)] border border-line-2 px-2 py-1 text-[11px] font-semibold text-ink transition-colors hover:bg-bg"
                            >
                              {check.actionLabel}
                              <Icon name="chevR" size={12} />
                            </Link>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Link
                    href={`/super-admin/events/${event.event_id}`}
                    className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-ink bg-ink px-3 py-1.5 text-[13px] font-semibold text-surface transition-colors hover:bg-ink-2"
                  >
                    Open event
                  </Link>
                  <Link
                    href="/super-admin/ticket-types"
                    className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-transparent px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:bg-bg"
                  >
                    Ticket tiers
                  </Link>
                  {primaryActions.map((check) => (
                    <Link
                      key={`primary-${event.event_id}-${check.key}`}
                      href={check.href(event)}
                      className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-transparent px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:bg-bg"
                    >
                      {check.actionLabel}
                    </Link>
                  ))}
                </div>
              </CardBody>
            </Card>
          )
        })}
      </div>
    </main>
  )
}

function SummaryTile({ label, value }: { label: string; value: number | string }) {
  return (
    <Card flat>
      <CardBody className="flex flex-col gap-1 p-4">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{label}</span>
        <span className="font-mono text-[24px] font-semibold tabular-nums text-ink">{value}</span>
      </CardBody>
    </Card>
  )
}
