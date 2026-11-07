import type { IconName } from "@/components/quiet/ui/icon"
import type { AdminRoleTier } from "@/lib/super-admin/console"

// The admin console's navigation, grouped by job (find it, see it, fix it)
// rather than by database table. The table-by-table screens are still one
// click away under "Data explorer".

export interface AdminNavItem {
  label: string
  href: string
  icon: IconName
  /** Only these roles see the link. Omitted: every admin. */
  roles?: AdminRoleTier[]
}

export interface AdminNavGroup {
  label: string | null
  items: AdminNavItem[]
  /** Rendered collapsed, for the raw table screens. */
  collapsed?: boolean
}

const OWNER: AdminRoleTier[] = ["super_admin"]
const SUPPORT: AdminRoleTier[] = ["super_admin", "support_admin"]

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: null,
    items: [
      { label: "Home", href: "/super-admin", icon: "activity" },
      { label: "Search", href: "/super-admin/search", icon: "search" },
      { label: "Cases", href: "/super-admin/cases", icon: "bell", roles: SUPPORT },
      { label: "Saved replies", href: "/super-admin/replies", icon: "copy", roles: SUPPORT },
    ],
  },
  {
    label: "Records",
    items: [
      { label: "Orders", href: "/super-admin/orders", icon: "receipt" },
      { label: "Events", href: "/super-admin/events", icon: "cal" },
      { label: "Organizers", href: "/super-admin/organizations", icon: "building" },
      { label: "Issued tickets", href: "/super-admin/order-items", icon: "ticket" },
    ],
  },
  {
    label: "Money",
    items: [
      { label: "Payouts", href: "/super-admin/payouts", icon: "wallet" },
      { label: "Refunds", href: "/super-admin/refunds", icon: "receipt" },
      { label: "Payments", href: "/super-admin/payments", icon: "card" },
      { label: "Reconciliation", href: "/super-admin/reconciliation", icon: "clipboard" },
    ],
  },
  {
    label: "Platform",
    items: [
      { label: "Settings history", href: "/super-admin/settings-history", icon: "clock" },
      { label: "Feature flags", href: "/super-admin/feature-flags", icon: "spark" },
      { label: "Payment routing", href: "/super-admin/routing", icon: "share" },
      { label: "Integrations", href: "/super-admin/integrations", icon: "settings", roles: OWNER },
      { label: "Team & access", href: "/super-admin/team", icon: "key", roles: OWNER },
      { label: "Audit log", href: "/super-admin/audit", icon: "shield" },
      { label: "System health", href: "/super-admin/realtime-health", icon: "activity" },
    ],
  },
  {
    label: "Data explorer",
    collapsed: true,
    items: [
      { label: "Ticket types", href: "/super-admin/ticket-types", icon: "ticket" },
      { label: "Event categories", href: "/super-admin/event-categories", icon: "flag" },
      { label: "Guestlists", href: "/super-admin/guestlist-entries", icon: "clipboard" },
      { label: "Coupons & vouchers", href: "/super-admin/price-rules", icon: "flag" },
      { label: "Scanning & devices", href: "/super-admin/devices", icon: "qr" },
      { label: "Event staff", href: "/super-admin/event-staff", icon: "user" },
      { label: "Readiness checklist", href: "/super-admin/readiness", icon: "checkCircle" },
      { label: "Org members", href: "/super-admin/org-members", icon: "users" },
      { label: "Payment attempts", href: "/super-admin/payment-attempts", icon: "activity" },
      { label: "Ledger", href: "/super-admin/ledger-entries", icon: "receipt" },
      { label: "CSV exports", href: "/super-admin/exports/orders", icon: "download" },
      { label: "TapBand operations", href: "/super-admin/workspaces/tapband-operations", icon: "nfc" },
      { label: "TapBand batches", href: "/super-admin/credential-batches", icon: "clipboard" },
      { label: "TapBand inventory", href: "/super-admin/credential-inventory", icon: "ticket" },
      { label: "TapBand credentials", href: "/super-admin/physical-credentials", icon: "shield" },
      { label: "TapBand entitlements", href: "/super-admin/credential-entitlements", icon: "users" },
      { label: "TapBand taps", href: "/super-admin/credential-taps", icon: "qr" },
      { label: "TapBand config", href: "/super-admin/tapband-feature-configs", icon: "settings" },
      { label: "TapBand kill switches", href: "/super-admin/tapband-kill-switches", icon: "flag" },
      { label: "Webhooks", href: "/super-admin/webhooks", icon: "share" },
      { label: "Jobs", href: "/super-admin/jobs", icon: "settings" },
      { label: "Env vars", href: "/super-admin/env-vars", icon: "key", roles: OWNER },
    ],
  },
]

export function navForRole(role: AdminRoleTier | null | undefined): AdminNavGroup[] {
  return ADMIN_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.roles || (role ? item.roles.includes(role) : false)),
  })).filter((group) => group.items.length > 0)
}

// Profile pages live outside their list's path; keep their section lit.
const ALSO_ACTIVE: Record<string, string[]> = {
  "/super-admin/orders": ["/super-admin/order/"],
  "/super-admin/events": ["/super-admin/event/"],
  "/super-admin/organizations": ["/super-admin/organizer/"],
  "/super-admin/search": ["/super-admin/people/"],
}

/** Home matches only itself; every other link also matches its sub-pages. */
export function isActiveHref(href: string, pathname: string): boolean {
  if (href === "/super-admin") return pathname === "/super-admin"
  if (pathname === href || pathname.startsWith(`${href}/`)) return true
  return (ALSO_ACTIVE[href] ?? []).some((prefix) => pathname.startsWith(prefix))
}
