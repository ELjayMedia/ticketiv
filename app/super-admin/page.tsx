import Link from "next/link"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Flag,
  FolderTree,
  MapPin,
  QrCode,
  RadioTower,
  ReceiptText,
  Ticket,
  WalletCards,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ADMIN_RESOURCES } from "@/lib/super-admin/resources"
import { formatMoneyFromCents, formatNumber, getCommandCentreData, percentage } from "@/lib/super-admin/command-centre"

const RESOURCE_ICONS = [Building2, MapPin, CalendarDays, Ticket, CreditCard, WalletCards, Flag]

const WORKSPACES = [
  { title: "Event Operations", description: "Publish, pause, archive and monitor events across the marketplace.", href: "/super-admin/events", icon: CalendarDays },
  { title: "Organizer Operations", description: "Manage promoters, companies, venues and organizer access.", href: "/super-admin/organizations", icon: Building2 },
  { title: "Ticket Inventory", description: "Control ticket tiers, quotas, channels, seating and guest allocation.", href: "/super-admin/ticket-types", icon: Ticket },
  { title: "Sales & Orders", description: "Review order state, buyer details, issued tickets and checkout problems.", href: "/super-admin/orders", icon: ReceiptText },
  { title: "Payments & Finance", description: "Track settlements, payouts, refunds, provider failures and reconciliation.", href: "/super-admin/payouts", icon: BadgeDollarSign },
  { title: "Promotions & Controls", description: "Manage feature flags, promo codes, vouchers, fees and discounts.", href: "/super-admin/price-rules", icon: Flag },
]

export const metadata = { title: "Super Admin Command Centre" }

export default async function SuperAdminPage() {
  const { metrics, attention, operations, categories } = await getCommandCentreData()

  const checkInRate = percentage(metrics.tickets_checked_in, metrics.tickets_issued)
  const eventPublishRate = percentage(metrics.published_events, metrics.total_events)
  const failedPaymentSignals = metrics.failed_payments + metrics.failed_payment_attempts
  const systemAlerts = metrics.unprocessed_webhooks + metrics.failed_jobs + failedPaymentSignals

  return (
    <div className="mx-auto max-w-7xl">
      <section className="rounded-2xl border bg-card p-5 shadow-sm md:flex md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Ticketiv internal</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Command Centre</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Operate the platform from business signals first: sales, tickets, events, payouts, access control and reliability.</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 md:mt-0">
          <Button asChild variant="outline" className="rounded-full"><Link href="/super-admin/audit">Audit</Link></Button>
          <Button asChild variant="outline" className="rounded-full"><Link href="/super-admin/exports/orders">Exports</Link></Button>
          <Button asChild variant="outline" className="rounded-full"><Link href="/super-admin/payouts">Review payouts</Link></Button>
        </div>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Gross sales" value={formatMoneyFromCents(metrics.gross_revenue_cents)} detail={`${formatNumber(metrics.paid_orders)} paid orders`} icon={BadgeDollarSign} />
        <MetricCard title="Platform fees" value={formatMoneyFromCents(metrics.platform_fee_cents)} detail="Tracked from paid orders" icon={WalletCards} />
        <MetricCard title="Tickets issued" value={formatNumber(metrics.tickets_issued)} detail={`${checkInRate}% checked in`} icon={QrCode} />
        <MetricCard title="System alerts" value={formatNumber(systemAlerts)} detail="Payments, jobs and webhooks" icon={AlertTriangle} tone={systemAlerts ? "warning" : "normal"} />
      </section>

      <section className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CompactStat title="Organizations" value={metrics.total_organizations} icon={Building2} />
        <CompactStat title="Events" value={metrics.total_events} helper={`${eventPublishRate}% published`} icon={CalendarDays} />
        <CompactStat title="Upcoming events" value={metrics.upcoming_events} helper={`${metrics.draft_events} drafts`} icon={Activity} />
        <CompactStat title="Pending payouts" value={metrics.pending_payouts} helper={formatMoneyFromCents(metrics.pending_payout_cents)} icon={CreditCard} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-2xl">
          <CardHeader className="border-b pb-3"><CardTitle className="flex items-center gap-2 text-base"><ClipboardList className="h-4 w-4" /> Operational workspaces</CardTitle></CardHeader>
          <CardContent className="grid gap-3 p-3 md:grid-cols-2">
            {WORKSPACES.map((workspace) => {
              const Icon = workspace.icon
              return (
                <Link key={workspace.title} href={workspace.href} className="group rounded-2xl border p-4 transition hover:bg-muted/40">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-xl border bg-background p-2"><Icon className="h-4 w-4" /></span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1" />
                  </div>
                  <h2 className="mt-4 font-semibold">{workspace.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{workspace.description}</p>
                </Link>
              )
            })}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="rounded-2xl">
            <CardHeader className="border-b pb-3"><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4" /> Attention queue</CardTitle></CardHeader>
            <CardContent className="space-y-3 p-3">
              {attention.length ? attention.map((item) => (
                <Link key={`${item.kind}-${item.record_id}`} href={item.href} className="block rounded-2xl border p-3 text-sm transition hover:bg-muted/40">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="font-medium">{item.title}</p><p className="mt-1 line-clamp-2 text-muted-foreground">{item.detail}</p></div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                </Link>
              )) : <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground"><CheckCircle2 className="mb-2 h-5 w-5" /> No urgent operational items right now.</div>}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="border-b pb-3"><CardTitle className="flex items-center gap-2 text-base"><RadioTower className="h-4 w-4" /> Recent audit activity</CardTitle></CardHeader>
            <CardContent className="space-y-3 p-3">
              {operations.length ? operations.map((operation) => (
                <div key={`${operation.source}-${operation.record_id}`} className="rounded-2xl border p-3 text-sm">
                  <p className="font-medium">{operation.action} · {operation.entity}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(operation.occurred_at).toLocaleString("en-SZ")}</p>
                </div>
              )) : <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No audit activity yet.</div>}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="rounded-2xl">
          <CardHeader className="border-b pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base"><FolderTree className="h-4 w-4" /> Event categories</CardTitle>
              <Button asChild size="sm" variant="outline" className="rounded-full"><Link href="/super-admin/event-categories">Manage</Link></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <CompactCategoryStat label="Total categories" value={categories.total} />
              <CompactCategoryStat label="Active" value={categories.active} />
              <CompactCategoryStat label="Unused" value={categories.unused} />
              <CompactCategoryStat label="Most used" value={categories.most_used?.name ?? "—"} helper={categories.most_used ? `${categories.most_used.total_events} events` : undefined} />
            </div>

            <div className="space-y-2">
              {categories.usage.slice(0, 6).map((category) => (
                <div key={category.slug} className="rounded-2xl border p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{category.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{category.total_events} events • {category.published_events} published • {category.draft_events} drafts</p>
                    </div>
                    <Badge variant={category.is_active ? "default" : "outline"}>{category.is_active ? "Active" : "Inactive"}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="border-b pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4" /> Category audit activity</CardTitle>
              <Button asChild size="sm" variant="outline" className="rounded-full"><Link href="/super-admin/audit">Open audit</Link></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {categories.recent_activity.length ? categories.recent_activity.map((activity) => (
              <div key={activity.id} className="rounded-2xl border p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{activity.action}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{new Date(activity.created_at).toLocaleString("en-SZ")}</p>
                  </div>
                  <Badge variant="outline">event_categories</Badge>
                </div>
                {activity.changes ? <pre className="mt-3 overflow-x-auto rounded-xl bg-muted p-2 text-[11px] text-muted-foreground">{JSON.stringify(activity.changes, null, 2)}</pre> : null}
              </div>
            )) : <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No category audit activity yet.</div>}
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {ADMIN_RESOURCES.map((resource, index) => {
          const Icon = RESOURCE_ICONS[index] ?? Activity
          return (
            <Link key={resource.key} href={`/super-admin/${resource.key}`} className="group block rounded-2xl border bg-card p-4 shadow-sm transition hover:bg-muted/40 hover:shadow-md">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-xl border bg-background p-2"><Icon className="h-4 w-4" /></span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1" />
              </div>
              <p className="mt-4 font-semibold">{resource.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">Admin workspace</p>
            </Link>
          )
        })}
      </section>
    </div>
  )
}

function MetricCard({ title, value, detail, icon: Icon, tone = "normal" }: { title: string; value: string; detail: string; icon: LucideIcon; tone?: "normal" | "warning" }) {
  return (
    <Card className={tone === "warning" ? "rounded-2xl border-amber-300" : "rounded-2xl"}>
      <CardHeader className="pb-2"><CardTitle className="flex items-center justify-between text-sm font-medium">{title}<Icon className="h-4 w-4 text-muted-foreground" /></CardTitle></CardHeader>
      <CardContent><p className="text-2xl font-bold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></CardContent>
    </Card>
  )
}

function CompactStat({ title, value, helper, icon: Icon }: { title: string; value: number; helper?: string; icon: LucideIcon }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div><p className="text-xs text-muted-foreground">{title}</p><p className="mt-1 text-2xl font-bold">{formatNumber(value)}</p>{helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}</div>
        <span className="rounded-xl border bg-background p-2"><Icon className="h-4 w-4" /></span>
      </CardContent>
    </Card>
  )
}

function CompactCategoryStat({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return (
    <div className="rounded-2xl border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
      {helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  )
}
