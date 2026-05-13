import Link from "next/link"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Download,
  Flag,
  LogOut,
  MapPin,
  Menu,
  QrCode,
  RadioTower,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Ticket,
  UserCircle,
  Users,
  WalletCards,
  Webhook,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ADMIN_RESOURCES } from "@/lib/super-admin/resources"
import { requireSuperAdmin } from "@/lib/super-admin/auth"
import {
  formatMoneyFromCents,
  formatNumber,
  getCommandCentreData,
  percentage,
} from "@/lib/super-admin/command-centre"
import { signOutSuperAdminAction } from "./actions"

const RESOURCE_ICONS = [Building2, MapPin, CalendarDays, Ticket, CreditCard, WalletCards, Flag]

const NAV_GROUPS: Array<{
  label: string
  items: Array<{
    label: string
    href: string
    icon: LucideIcon
    active?: boolean
    badge?: string
  }>
}> = [
  {
    label: "Workspace",
    items: [
      { label: "Overview", href: "/super-admin", icon: Activity, active: true },
      { label: "Events", href: "/super-admin/events", icon: CalendarDays },
      { label: "Orders", href: "/super-admin/orders", icon: ReceiptText },
      { label: "Attendees", href: "/super-admin/tickets", icon: Users },
      { label: "Tickets", href: "/super-admin/ticket-types", icon: Ticket },
    ],
  },
  {
    label: "Event Operations",
    items: [
      { label: "Guestlists", href: "/super-admin/guestlists", icon: ClipboardList },
      { label: "Coupons & Vouchers", href: "/super-admin/feature-flags", icon: Flag, badge: "Soon" },
      { label: "Scanning & Devices", href: "/super-admin/devices", icon: QrCode },
      { label: "Staff", href: "/super-admin/staff", icon: UserCircle },
      { label: "Readiness Checklist", href: "/super-admin/readiness", icon: CheckCircle2 },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Payments", href: "/super-admin/payments", icon: CreditCard },
      { label: "Payouts", href: "/super-admin/payouts", icon: BadgeDollarSign },
      { label: "Refunds", href: "/super-admin/refunds", icon: WalletCards },
      { label: "Reports / CSV Exports", href: "/super-admin/exports/orders", icon: Download },
    ],
  },
  {
    label: "Admin / Controls",
    items: [
      { label: "Organizations", href: "/super-admin/organizations", icon: Building2 },
      { label: "Feature Flags", href: "/super-admin/feature-flags", icon: Sparkles },
      { label: "Audit Logs", href: "/super-admin/audit", icon: ShieldCheck },
      { label: "Webhooks / Jobs", href: "/super-admin/webhooks", icon: Webhook },
      { label: "Settings", href: "/super-admin/settings", icon: Settings },
    ],
  },
]

const WORKSPACES = [
  {
    title: "Event Operations",
    description: "Publish, pause, archive and monitor events across the marketplace.",
    href: "/super-admin/events",
    icon: CalendarDays,
  },
  {
    title: "Organizer Operations",
    description: "Manage promoters, companies, venues and organizer access.",
    href: "/super-admin/organizations",
    icon: Building2,
  },
  {
    title: "Ticket Inventory",
    description: "Control ticket tiers, quotas, channels, seating and guest allocation.",
    href: "/super-admin/ticket-types",
    icon: Ticket,
  },
  {
    title: "Sales & Orders",
    description: "Review order state, buyer details, issued tickets and checkout problems.",
    href: "/super-admin/orders",
    icon: ReceiptText,
  },
  {
    title: "Payments & Finance",
    description: "Track settlements, payouts, refunds, provider failures and reconciliation.",
    href: "/super-admin/payouts",
    icon: BadgeDollarSign,
  },
  {
    title: "Promotions & Controls",
    description: "Manage feature flags today; promo codes and voucher controls follow here.",
    href: "/super-admin/feature-flags",
    icon: Flag,
  },
]

export const metadata = { title: "Super Admin Command Centre" }

export default async function SuperAdminPage() {
  const user = await requireSuperAdmin()
  const { metrics, attention, operations } = await getCommandCentreData()

  const checkInRate = percentage(metrics.tickets_checked_in, metrics.tickets_issued)
  const eventPublishRate = percentage(metrics.published_events, metrics.total_events)
  const failedPaymentSignals = metrics.failed_payments + metrics.failed_payment_attempts
  const systemAlerts = metrics.unprocessed_webhooks + metrics.failed_jobs + failedPaymentSignals

  return (
    <div className="min-h-screen bg-muted/30 lg:grid lg:grid-cols-[18rem_1fr]">
      <aside className="hidden border-r bg-background lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="border-b p-3">
          <Link href="/super-admin" className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
              T
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-none">Ticketiv</span>
              <span className="mt-1 block truncate text-xs text-muted-foreground">Super Admin Workspace</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto p-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-2 pb-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink key={`${group.label}-${item.label}`} {...item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t p-3">
          <div className="rounded-2xl border bg-card p-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                <UserCircle className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">Super Admin</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <form action={signOutSuperAdminAction} className="mt-3">
              <Button variant="outline" className="h-9 w-full rounded-full text-xs">
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Button variant="outline" size="icon" className="rounded-full lg:hidden" aria-label="Open dashboard navigation">
              <Menu className="h-4 w-4" />
            </Button>

            <div className="hidden items-center gap-1 text-sm text-muted-foreground md:flex">
              <Link href="/super-admin" className="font-medium text-foreground">
                Super Admin
              </Link>
              <ChevronRight className="h-4 w-4" />
              <span>Command Centre</span>
            </div>

            <div className="ml-auto hidden max-w-sm items-center gap-2 rounded-full border bg-muted/40 px-3 py-2 text-sm text-muted-foreground md:flex">
              <Search className="h-4 w-4" />
              <span>Search events, orders, payouts...</span>
            </div>

            <Button asChild variant="outline" className="ml-auto rounded-full md:ml-0">
              <Link href="/super-admin/readiness">Readiness</Link>
            </Button>

            <Button asChild className="rounded-full">
              <Link href="/events/create">Create event</Link>
            </Button>
          </div>

          <div className="flex gap-2 overflow-x-auto px-4 pb-3 sm:px-6 lg:hidden">
            {NAV_GROUPS.flatMap((group) => group.items)
              .slice(0, 9)
              .map((item) => {
                const Icon = item.icon

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={
                      item.active
                        ? "inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                        : "inline-flex shrink-0 items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-xs font-medium"
                    }
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </Link>
                )
              })}
          </div>
        </header>

        <main className="px-4 py-5 sm:px-6 lg:px-8">
          <section className="rounded-2xl border bg-card p-5 shadow-sm md:flex md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Ticketiv internal</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">Command Centre</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Operate the platform from business signals first: sales, tickets, events, payouts, access control and
                reliability.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 md:mt-0">
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/super-admin/audit">Audit</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/super-admin/exports/orders">Exports</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/super-admin/payouts">Review payouts</Link>
              </Button>
            </div>
          </section>

          <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Gross sales"
              value={formatMoneyFromCents(metrics.gross_revenue_cents)}
              detail={`${formatNumber(metrics.paid_orders)} paid orders`}
              icon={BadgeDollarSign}
            />
            <MetricCard
              title="Platform fees"
              value={formatMoneyFromCents(metrics.platform_fee_cents)}
              detail="Tracked from paid orders"
              icon={WalletCards}
            />
            <MetricCard
              title="Tickets issued"
              value={formatNumber(metrics.tickets_issued)}
              detail={`${checkInRate}% checked in`}
              icon={QrCode}
            />
            <MetricCard
              title="System alerts"
              value={formatNumber(systemAlerts)}
              detail="Payments, jobs and webhooks"
              icon={AlertTriangle}
              tone={systemAlerts ? "warning" : "normal"}
            />
          </section>

          <section className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <CompactStat title="Organizations" value={metrics.total_organizations} icon={Building2} />
            <CompactStat title="Events" value={metrics.total_events} helper={`${eventPublishRate}% published`} icon={CalendarDays} />
            <CompactStat title="Upcoming events" value={metrics.upcoming_events} helper={`${metrics.draft_events} drafts`} icon={Activity} />
            <CompactStat
              title="Pending payouts"
              value={metrics.pending_payouts}
              helper={formatMoneyFromCents(metrics.pending_payout_cents)}
              icon={CreditCard}
            />
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="rounded-2xl">
              <CardHeader className="border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardList className="h-4 w-4" />
                  Operational workspaces
                </CardTitle>
              </CardHeader>

              <CardContent className="grid gap-3 p-3 md:grid-cols-2">
                {WORKSPACES.map((workspace) => {
                  const Icon = workspace.icon

                  return (
                    <Link
                      key={workspace.title}
                      href={workspace.href}
                      className="group rounded-2xl border p-4 transition hover:bg-muted/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="rounded-xl border bg-background p-2">
                          <Icon className="h-4 w-4" />
                        </span>
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
                <CardHeader className="border-b pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-4 w-4" />
                    Attention queue
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3 p-3">
                  {attention.length ? (
                    attention.map((item) => (
                      <Link
                        key={`${item.kind}-${item.record_id}`}
                        href={item.href}
                        className="block rounded-2xl border p-3 text-sm transition hover:bg-muted/40"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{item.title}</p>
                            <p className="mt-1 line-clamp-2 text-muted-foreground">{item.detail}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                      <CheckCircle2 className="mb-2 h-5 w-5" />
                      No urgent operational items right now.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader className="border-b pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <RadioTower className="h-4 w-4" />
                    Recent audit activity
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3 p-3">
                  {operations.length ? (
                    operations.map((operation) => (
                      <div key={`${operation.source}-${operation.record_id}`} className="rounded-2xl border p-3 text-sm">
                        <p className="font-medium">
                          {operation.action} · {operation.entity}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(operation.occurred_at).toLocaleString("en-SZ")}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                      No audit activity yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {ADMIN_RESOURCES.map((resource, index) => {
              const Icon = RESOURCE_ICONS[index] ?? Activity

              return (
                <Link
                  key={resource.key}
                  href={`/super-admin/${resource.key}`}
                  className="group block rounded-2xl border bg-card p-4 shadow-sm transition hover:bg-muted/40 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-xl border bg-background p-2">
                      <Icon className="h-4 w-4" />
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1" />
                  </div>

                  <p className="mt-4 font-semibold">{resource.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Raw admin table access</p>
                </Link>
              )
            })}
          </section>
        </main>
      </div>
    </div>
  )
}

function NavLink({
  label,
  href,
  icon: Icon,
  active,
  badge,
}: {
  label: string
  href: string
  icon: LucideIcon
  active?: boolean
  badge?: string
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "flex items-center gap-3 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm"
          : "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge ? (
        <span className="rounded-full border bg-background/80 px-1.5 py-0.5 text-[0.65rem] text-muted-foreground">
          {badge}
        </span>
      ) : null}
    </Link>
  )
}

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  tone = "normal",
}: {
  title: string
  value: string
  detail: string
  icon: LucideIcon
  tone?: "normal" | "warning"
}) {
  return (
    <Card className={tone === "warning" ? "rounded-2xl border-amber-300" : "rounded-2xl"}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          {title}
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}

function CompactStat({
  title,
  value,
  helper,
  icon: Icon,
}: {
  title: string
  value: number
  helper?: string
  icon: LucideIcon
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold">{formatNumber(value)}</p>
          {helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}
        </div>
        <span className="rounded-xl border bg-background p-2">
          <Icon className="h-4 w-4" />
        </span>
      </CardContent>
    </Card>
  )
}
