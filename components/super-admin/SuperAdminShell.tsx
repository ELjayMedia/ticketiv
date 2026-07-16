import Link from "next/link"
import {
  Activity,
  BadgeDollarSign,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Download,
  Flag,
  KeyRound,
  LogOut,
  Menu,
  QrCode,
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
import { signOutSuperAdminAction } from "@/app/super-admin/actions"

const NAV_GROUPS: Array<{
  label: string
  items: Array<{ label: string; href: string; icon: LucideIcon; active?: boolean }>
}> = [
  {
    label: "Workspace",
    items: [
      { label: "Overview", href: "/super-admin", icon: Activity },
      { label: "Events", href: "/super-admin/events", icon: CalendarDays },
      { label: "Orders", href: "/super-admin/orders", icon: ReceiptText },
      { label: "Issued Tickets", href: "/super-admin/order-items", icon: Users },
      { label: "Ticket Types", href: "/super-admin/ticket-types", icon: Ticket },
    ],
  },
  {
    label: "Event Operations",
    items: [
      { label: "Event Categories", href: "/super-admin/event-categories", icon: Flag },
      { label: "Guestlists", href: "/super-admin/guestlist-entries", icon: ClipboardList },
      { label: "Coupons & Vouchers", href: "/super-admin/price-rules", icon: Flag },
      { label: "Scanning & Devices", href: "/super-admin/devices", icon: QrCode },
      { label: "Staff", href: "/super-admin/event-staff", icon: UserCircle },
      { label: "Readiness Checklist", href: "/super-admin/readiness", icon: CheckCircle2 },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Payments", href: "/super-admin/payments", icon: CreditCard },
      { label: "Payment Attempts", href: "/super-admin/payment-attempts", icon: Activity },
      { label: "Payouts", href: "/super-admin/payouts", icon: BadgeDollarSign },
      { label: "Refunds", href: "/super-admin/refunds", icon: WalletCards },
      { label: "Ledger", href: "/super-admin/ledger-entries", icon: ReceiptText },
      { label: "CSV Exports", href: "/super-admin/exports/orders", icon: Download },
    ],
  },
  {
    label: "Admin / Controls",
    items: [
      { label: "Organizations", href: "/super-admin/organizations", icon: Building2 },
      { label: "Org Members", href: "/super-admin/org-members", icon: Users },
      { label: "Feature Flags", href: "/super-admin/feature-flags", icon: Sparkles },
      { label: "Audit Logs", href: "/super-admin/audit", icon: ShieldCheck },
      { label: "Webhooks", href: "/super-admin/webhooks", icon: Webhook },
      { label: "Env Vars", href: "/super-admin/env-vars", icon: KeyRound },
      { label: "Jobs", href: "/super-admin/jobs", icon: Settings },
      { label: "Realtime Health", href: "/super-admin/realtime-health", icon: Activity },
    ],
  },
]

export function SuperAdminShell({ children, userEmail }: { children: React.ReactNode; userEmail?: string | null }) {
  return (
    <div className="min-h-screen bg-muted/30 lg:grid lg:grid-cols-[18rem_1fr]">
      <aside className="hidden border-r bg-background lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="border-b p-3">
          <Link href="/super-admin" className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">T</span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-none">Ticketiv</span>
              <span className="mt-1 block truncate text-xs text-muted-foreground">Super Admin Workspace</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto p-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-2 pb-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{group.label}</p>
              <div className="space-y-1">
                {group.items.map((item) => <ShellNavLink key={`${group.label}-${item.label}`} {...item} />)}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t p-3">
          <div className="rounded-2xl border bg-card p-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted"><UserCircle className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">Super Admin</p>
                <p className="truncate text-xs text-muted-foreground">{userEmail ?? "Ticketiv control room"}</p>
              </div>
            </div>
            <form action={signOutSuperAdminAction} className="mt-3">
              <Button variant="outline" className="h-9 w-full rounded-full text-xs"><LogOut className="mr-2 h-3.5 w-3.5" /> Sign out</Button>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <details className="group relative lg:hidden">
              <summary
                className="inline-flex size-9 cursor-pointer list-none items-center justify-center rounded-full border bg-background shadow-xs transition hover:bg-accent hover:text-accent-foreground [&::-webkit-details-marker]:hidden"
                aria-label="Open dashboard navigation"
              >
                <Menu className="h-4 w-4" />
              </summary>
              <div className="fixed inset-x-0 top-16 z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b bg-background p-4 shadow-lg">
                <div className="grid gap-4">
                  {NAV_GROUPS.map((group) => (
                    <div key={`mobile-${group.label}`} className="space-y-2">
                      <p className="px-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{group.label}</p>
                      <div className="grid gap-2">
                        {group.items.map((item) => {
                          const Icon = item.icon
                          return (
                            <Link
                              key={`mobile-menu-${group.label}-${item.label}`}
                              href={item.href}
                              className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-sm font-medium text-foreground shadow-xs transition hover:bg-muted"
                            >
                              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <span className="min-w-0 flex-1 truncate">{item.label}</span>
                              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </details>
            <div className="hidden items-center gap-1 text-sm text-muted-foreground md:flex">
              <Link href="/super-admin" className="font-medium text-foreground">Super Admin</Link>
              <ChevronRight className="h-4 w-4" />
              <span>Command Centre</span>
            </div>
            <div className="ml-auto hidden max-w-sm items-center gap-2 rounded-full border bg-muted/40 px-3 py-2 text-sm text-muted-foreground md:flex">
              <Search className="h-4 w-4" />
              <span>Search events, orders, payouts...</span>
            </div>
            <Button asChild variant="outline" className="ml-auto rounded-full md:ml-0"><Link href="/super-admin/readiness">Readiness</Link></Button>
            <Button asChild className="rounded-full"><Link href="/events/create">Create event</Link></Button>
          </div>
          <div className="flex gap-2 overflow-x-auto px-4 pb-3 sm:px-6 lg:hidden">
            {NAV_GROUPS.flatMap((group) => group.items).map((item) => {
              const Icon = item.icon
              return <Link key={item.label} href={item.href} className={item.active ? "inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground" : "inline-flex shrink-0 items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-xs font-medium"}><Icon className="h-3.5 w-3.5" />{item.label}</Link>
            })}
          </div>
        </header>
        <main className="px-4 py-5 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}

function ShellNavLink({ label, href, icon: Icon, active }: { label: string; href: string; icon: LucideIcon; active?: boolean }) {
  return (
    <Link href={href} className={active ? "flex items-center gap-3 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm" : "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </Link>
  )
}
