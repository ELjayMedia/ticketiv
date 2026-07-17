import Link from "next/link"

import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon, type IconName } from "@/components/quiet/ui/icon"
import { cn } from "@/lib/cn"
import { ADMIN_RESOURCES } from "@/lib/super-admin/resources"
import {
  formatMoneyFromCents,
  formatNumber,
  getCommandCentreData,
  percentage,
} from "@/lib/super-admin/command-centre"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { ADMIN_ROLE_TIERS } from "@/lib/super-admin/permissions"

// TICK-50 — Command centre overview with role-tier awareness

const RESOURCE_ICONS: IconName[] = ["users", "pin", "cal", "ticket", "wallet", "wallet", "spark"]

const WORKSPACES: Array<{ title: string; description: string; href: string; icon: IconName }> = [
  { title: "Event Operations", description: "Publish, pause, archive and monitor events across the marketplace.", href: "/super-admin/events", icon: "cal" },
  { title: "Organizer Operations", description: "Manage promoters, companies, venues and organizer access.", href: "/super-admin/organizations", icon: "users" },
  { title: "Ticket Inventory", description: "Control ticket tiers, quotas, channels, seating and guest allocation.", href: "/super-admin/ticket-types", icon: "ticket" },
  { title: "Sales & Orders", description: "Review order state, buyer details, issued tickets and checkout problems.", href: "/super-admin/orders", icon: "fileText" },
  { title: "Payments & Finance", description: "Track settlements, payouts, refunds, provider failures and reconciliation.", href: "/super-admin/reconciliation", icon: "wallet" },
  { title: "TapBand Operations", description: "Reconcile batches, stock, credentials, entitlements and tap audit signals.", href: "/super-admin/workspaces/tapband-operations", icon: "nfc" },
  { title: "Promotions & Controls", description: "Manage feature flags, promo codes, vouchers, fees and discounts.", href: "/super-admin/price-rules", icon: "spark" },
]

export const metadata = { title: "Super Admin Command Centre" }

export default async function SuperAdminPage() {
  const { roleTier } = await requireAdminRole(ADMIN_ROLE_TIERS)
  const canAct = roleTier !== "read_only_admin"
  const { metrics, attention, operations, categories } = await getCommandCentreData()

  const checkInRate = percentage(metrics.tickets_checked_in, metrics.tickets_issued)
  const eventPublishRate = percentage(metrics.published_events, metrics.total_events)
  const failedPaymentSignals = metrics.failed_payments + metrics.failed_payment_attempts
  const systemAlerts = metrics.unprocessed_webhooks + metrics.failed_jobs + failedPaymentSignals

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-[var(--radius-xl)] border border-line bg-surface p-5 shadow-[var(--shadow-card)] md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Ticketiv internal</p>
          <h1 className="text-h1">Command centre</h1>
          <p className="max-w-2xl text-[13px] text-ink-3">
            Operate the platform from business signals first: sales, tickets, events, payouts, access control and reliability.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!canAct && (
            <Chip size="sm" variant="muted">Read only</Chip>
          )}
          <Link href="/super-admin/audit" className={navButtonClass}>Audit</Link>
          <Link href="/super-admin/exports" className={navButtonClass}>Exports</Link>
          {canAct && (
            <Link href="/super-admin/payouts" className={navButtonClass}>Review payouts</Link>
          )}
          <Link href="/super-admin/reconciliation" className={navButtonClass}>Reconciliation</Link>
          <Link href="/super-admin/payments" className={navButtonClass}>Payment failures</Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Gross sales" value={formatMoneyFromCents(metrics.gross_revenue_cents)} detail={`${formatNumber(metrics.paid_orders)} paid orders`} icon="wallet" href="/super-admin/orders" />
        <MetricCard title="Platform fees" value={formatMoneyFromCents(metrics.platform_fee_cents)} detail="Tracked from paid orders" icon="wallet" href="/super-admin/ledger-entries" />
        <MetricCard title="Tickets issued" value={formatNumber(metrics.tickets_issued)} detail={`${checkInRate}% checked in`} icon="qr" href="/super-admin/order-items" />
        <MetricCard title="System alerts" value={formatNumber(systemAlerts)} detail="Payments, jobs and webhooks" icon="bell" tone={systemAlerts ? "warning" : "normal"} href="/super-admin/payments" />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CompactStat title="Organizations" value={metrics.total_organizations} icon="users" />
        <CompactStat title="Events" value={metrics.total_events} helper={`${eventPublishRate}% published`} icon="cal" />
        <CompactStat title="Upcoming events" value={metrics.upcoming_events} helper={`${metrics.draft_events} drafts`} icon="trending" />
        <CompactStat title="Pending payouts" value={metrics.pending_payouts} helper={formatMoneyFromCents(metrics.pending_payout_cents)} icon="wallet" href="/super-admin/payouts" />
      </section>

      {/* Operational signals — each links to its detail view; failed/pending
          states turn the card border to warning when non-zero. */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <CompactStat title="Failed payments" value={failedPaymentSignals} helper="Payments + attempts" icon="wallet" href="/super-admin/payments" tone="warning" />
        <CompactStat title="Open refunds" value={metrics.open_refunds} helper={formatMoneyFromCents(metrics.open_refund_cents)} icon="fileText" href="/super-admin/refunds" tone="warning" />
        <CompactStat title="Unprocessed webhooks" value={metrics.unprocessed_webhooks} helper="Awaiting delivery" icon="globe" href="/super-admin/webhooks" tone="warning" />
        <CompactStat title="Failed jobs" value={metrics.failed_jobs} helper="Background queue" icon="settings" href="/super-admin/jobs" tone="warning" />
        <CompactStat title="Scans · 24h" value={metrics.scans_last_24h} helper={`${formatNumber(metrics.tickets_checked_in)} checked in`} icon="qr" href="/super-admin/scans" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardBody className="px-5 py-4">
            <p className="inline-flex items-center gap-2 text-h3">
              <Icon name="fileText" size={16} className="text-ink-3" />
              Operational workspaces
            </p>
          </CardBody>
          <CardDivider />
          <CardBody className="grid gap-3 p-3 md:grid-cols-2">
            {WORKSPACES.map((workspace) => (
              <Link
                key={workspace.title}
                href={workspace.href}
                className="group rounded-[var(--radius-md)] border border-line p-4 transition hover:bg-bg"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-[var(--radius-md)] border border-line bg-bg p-2 text-ink">
                    <Icon name={workspace.icon} size={16} />
                  </span>
                  <Icon name="arrowR" size={14} className="text-ink-3 transition group-hover:translate-x-1" />
                </div>
                <h2 className="mt-4 text-[14px] font-semibold text-ink">{workspace.title}</h2>
                <p className="mt-2 text-[13px] leading-6 text-ink-3">{workspace.description}</p>
              </Link>
            ))}
          </CardBody>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardBody className="px-5 py-4">
              <p className="inline-flex items-center gap-2 text-h3">
                <Icon name="bell" size={16} className="text-ink-3" />
                Attention queue
              </p>
            </CardBody>
            <CardDivider />
            <CardBody className="flex flex-col gap-3 p-3">
              {attention.length ? (
                attention.map((item) => (
                  <Link
                    key={`${item.kind}-${item.record_id}`}
                    href={item.href}
                    className="block rounded-[var(--radius-md)] border border-line p-3 text-[13px] transition hover:bg-bg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <p className="font-semibold text-ink">{item.title}</p>
                        <p className="line-clamp-2 text-ink-3">{item.detail}</p>
                      </div>
                      <Icon name="arrowR" size={14} className="shrink-0 text-ink-3" />
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-[var(--radius-md)] border border-dashed border-line-2 p-4 text-[13px] text-ink-3">
                  <Icon name="check" size={18} className="mb-2 text-accent" />
                  No urgent operational items right now.
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="px-5 py-4">
              <p className="inline-flex items-center gap-2 text-h3">
                <Icon name="globe" size={16} className="text-ink-3" />
                Recent audit activity
              </p>
            </CardBody>
            <CardDivider />
            <CardBody className="flex flex-col gap-3 p-3">
              {operations.length ? (
                operations.map((operation) => (
                  <div
                    key={`${operation.source}-${operation.record_id}`}
                    className="rounded-[var(--radius-md)] border border-line p-3 text-[13px]"
                  >
                    <p className="font-semibold text-ink">
                      {operation.action} · {operation.entity}
                    </p>
                    <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-ink-3">
                      {new Date(operation.occurred_at).toLocaleString("en-SZ")}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-[var(--radius-md)] border border-dashed border-line-2 p-4 text-[13px] text-ink-3">
                  No audit activity yet.
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardBody className="flex items-center justify-between gap-3 px-5 py-4">
            <p className="inline-flex items-center gap-2 text-h3">
              <Icon name="fileText" size={16} className="text-ink-3" />
              Event categories
            </p>
            <Link href="/super-admin/event-categories" className={navButtonClass}>
              Manage
            </Link>
          </CardBody>
          <CardDivider />
          <CardBody className="flex flex-col gap-4 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <CompactCategoryStat label="Total categories" value={categories.total} />
              <CompactCategoryStat label="Active" value={categories.active} />
              <CompactCategoryStat label="Unused" value={categories.unused} />
              <CompactCategoryStat
                label="Most used"
                value={categories.most_used?.name ?? "—"}
                helper={categories.most_used ? `${categories.most_used.total_events} events` : undefined}
              />
            </div>

            <div className="flex flex-col gap-2">
              {categories.usage.slice(0, 6).map((category) => (
                <div key={category.slug} className="rounded-[var(--radius-md)] border border-line p-3 text-[13px]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <p className="font-semibold text-ink">{category.name}</p>
                      <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                        {category.total_events} events · {category.published_events} published · {category.draft_events} drafts
                      </p>
                    </div>
                    <Chip size="sm" variant={category.is_active ? "active" : "default"}>
                      {category.is_active ? "Active" : "Inactive"}
                    </Chip>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex items-center justify-between gap-3 px-5 py-4">
            <p className="inline-flex items-center gap-2 text-h3">
              <Icon name="trending" size={16} className="text-ink-3" />
              Category audit activity
            </p>
            <Link href="/super-admin/audit" className={navButtonClass}>
              Open audit
            </Link>
          </CardBody>
          <CardDivider />
          <CardBody className="flex flex-col gap-3 p-4">
            {categories.recent_activity.length ? (
              categories.recent_activity.map((activity) => (
                <div key={activity.id} className="rounded-[var(--radius-md)] border border-line p-3 text-[13px]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <p className="font-semibold text-ink">{activity.action}</p>
                      <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                        {new Date(activity.created_at).toLocaleString("en-SZ")}
                      </p>
                    </div>
                    <Chip size="sm" variant="default">event_categories</Chip>
                  </div>
                  {activity.changes ? (
                    <pre className="mt-3 overflow-x-auto rounded-[var(--radius-sm)] bg-bg p-2 font-mono text-[11px] text-ink-3">
                      {JSON.stringify(activity.changes, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-[var(--radius-md)] border border-dashed border-line-2 p-4 text-[13px] text-ink-3">
                No category audit activity yet.
              </div>
            )}
          </CardBody>
        </Card>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {ADMIN_RESOURCES.map((resource, index) => {
          const icon = RESOURCE_ICONS[index] ?? "trending"
          return (
            <Link
              key={resource.key}
              href={`/super-admin/${resource.key}`}
              className="group block rounded-[var(--radius-md)] border border-line bg-surface p-4 shadow-[var(--shadow-card)] transition hover:bg-bg"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-[var(--radius-md)] border border-line bg-bg p-2 text-ink">
                  <Icon name={icon} size={16} />
                </span>
                <Icon name="arrowR" size={14} className="text-ink-3 transition group-hover:translate-x-1" />
              </div>
              <p className="mt-4 text-[14px] font-semibold text-ink">{resource.label}</p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-ink-3">
                Admin workspace
              </p>
            </Link>
          )
        })}
      </section>
    </div>
  )
}

const navButtonClass =
  "inline-flex items-center gap-1.5 rounded-full border border-line-2 bg-surface px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:bg-bg"

function MetricCard({
  title,
  value,
  detail,
  icon,
  tone = "normal",
  href,
}: {
  title: string
  value: string
  detail: string
  icon: IconName
  tone?: "normal" | "warning"
  href?: string
}) {
  const inner = (
    <CardBody className="flex flex-col gap-1 p-5">
      <div className="flex items-center justify-between">
        <span className="text-label">{title}</span>
        <Icon name={icon} size={14} className="text-ink-3" />
      </div>
      <p className="font-mono text-[22px] font-semibold tabular-nums text-ink">{value}</p>
      <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{detail}</p>
    </CardBody>
  )
  const className = cn("h-full", tone === "warning" && "border-warning/50", href && "transition hover:bg-bg")
  if (href) {
    return (
      <Link href={href} className="block">
        <Card className={className}>{inner}</Card>
      </Link>
    )
  }
  return <Card className={className}>{inner}</Card>
}

function CompactStat({
  title,
  value,
  helper,
  icon,
  href,
  tone = "normal",
}: {
  title: string
  value: number
  helper?: string
  icon: IconName
  href?: string
  tone?: "normal" | "warning"
}) {
  const inner = (
    <CardBody className="flex items-center justify-between gap-3 p-4">
      <div className="flex flex-col gap-1">
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{title}</p>
        <p className="font-mono text-[22px] font-semibold tabular-nums text-ink">
          {formatNumber(value)}
        </p>
        {helper ? <p className="font-mono text-[11px] text-ink-3">{helper}</p> : null}
      </div>
      <span className="rounded-[var(--radius-md)] border border-line bg-bg p-2 text-ink">
        <Icon name={icon} size={16} />
      </span>
    </CardBody>
  )
  const className = cn("h-full", tone === "warning" && value > 0 && "border-warning/50", href && "transition hover:bg-bg")
  if (href) {
    return (
      <Link href={href} className="block">
        <Card className={className}>{inner}</Card>
      </Link>
    )
  }
  return <Card className={className}>{inner}</Card>
}

function CompactCategoryStat({
  label,
  value,
  helper,
}: {
  label: string
  value: string | number
  helper?: string
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-line bg-bg p-3">
      <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{label}</p>
      <p className="mt-1 font-mono text-[18px] font-semibold tabular-nums text-ink">{value}</p>
      {helper ? <p className="mt-1 font-mono text-[11px] text-ink-3">{helper}</p> : null}
    </div>
  )
}
