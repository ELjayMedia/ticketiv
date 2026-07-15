import {
  Activity,
  BadgeDollarSign,
  Building2,
  CalendarDays,
  Flag,
  QrCode,
  RadioTower,
  ReceiptText,
  Settings2,
  Ticket,
} from "lucide-react"

export type AdminWorkspace = {
  key: string
  title: string
  description: string
  href: string
  icon: typeof CalendarDays
  resources: string[]
  operatingQuestions: string[]
  nextBusinessActions: string[]
}

export const ADMIN_WORKSPACES: AdminWorkspace[] = [
  {
    key: "event-operations",
    title: "Event Operations",
    href: "/super-admin/workspaces/event-operations",
    icon: CalendarDays,
    description: "Control the lifecycle of events from draft to published, archived or cancelled.",
    resources: ["events", "venues", "artists", "event-artists", "event-dates"],
    operatingQuestions: [
      "Can this event safely go live?",
      "Does it have a valid organizer, venue, dates and ticket inventory?",
      "Which published events need operational attention?",
    ],
    nextBusinessActions: ["Approve event", "Publish event", "Pause sales", "Archive event", "Feature event"],
  },
  {
    key: "organizer-operations",
    title: "Organizer Operations",
    href: "/super-admin/workspaces/organizer-operations",
    icon: Building2,
    description: "Manage promoters, companies, members, venues and commercial access.",
    resources: ["organizations", "org-members", "venues", "pricing-plans", "feature-flags"],
    operatingQuestions: [
      "Is this organizer approved and ready to sell?",
      "Who has owner/admin/staff access?",
      "What pricing plan and feature access applies to this organizer?",
    ],
    nextBusinessActions: ["Approve organizer", "Assign owner", "Set pricing plan", "Enable features", "Suspend organizer"],
  },
  {
    key: "ticket-inventory",
    title: "Ticket Inventory",
    href: "/super-admin/workspaces/ticket-inventory",
    icon: Ticket,
    description: "Manage ticket tiers, quotas, sales channels, seating and guest allocations.",
    resources: ["ticket-types", "ticket-type-channels", "seat-maps", "seats", "seat-holds", "guestlist-entries"],
    operatingQuestions: [
      "Are ticket tiers priced and limited correctly?",
      "Which tickets are online, POS, reseller or import-only?",
      "Are reserved seating and guest allocations under control?",
    ],
    nextBusinessActions: ["Increase quota", "Pause ticket type", "Reserve allocation", "Create guestlist", "Lock seating"],
  },
  {
    key: "sales-orders",
    title: "Sales & Orders",
    href: "/super-admin/workspaces/sales-orders",
    icon: ReceiptText,
    description: "Track orders, issued tickets, buyer details, transfers and resale behaviour.",
    resources: ["orders", "order-items", "transfers", "resale-listings", "waitlists"],
    operatingQuestions: [
      "Which orders need support intervention?",
      "Were tickets minted and issued correctly?",
      "Are transfers, waitlists and resale activity behaving as expected?",
    ],
    nextBusinessActions: ["Reissue ticket", "Review transfer", "Resolve buyer issue", "Export orders", "Investigate failed mint"],
  },
  {
    key: "payments-finance",
    title: "Payments & Finance",
    href: "/super-admin/workspaces/payments-finance",
    icon: BadgeDollarSign,
    description: "Monitor provider payments, payment attempts, refunds, ledgers and payouts.",
    resources: ["payments", "payment-attempts", "refunds", "refund-items", "ledger-entries", "payouts", "payout-accounts"],
    operatingQuestions: [
      "Which payments failed or need reconciliation?",
      "Which refunds require finance review?",
      "Which organizers are due for payout?",
    ],
    nextBusinessActions: ["Verify payment", "Approve refund", "Process payout", "Export ledger", "Reconcile provider"],
  },
  {
    key: "access-control",
    title: "Access Control",
    href: "/super-admin/workspaces/access-control",
    icon: QrCode,
    description: "Operate scanner devices, staff access, device sessions and venue entry logs.",
    resources: ["event-staff", "devices", "device-sessions", "scans"],
    operatingQuestions: [
      "Which devices are assigned to each event?",
      "Which scans are invalid, duplicated or suspicious?",
      "Are scanner operators correctly authorized?",
    ],
    nextBusinessActions: ["Pair scanner", "Disable device", "Assign gate staff", "Review invalid scan", "Reset session"],
  },
  {
    key: "tapband-operations",
    title: "TapBand Operations",
    href: "/super-admin/workspaces/tapband-operations",
    icon: Activity,
    description: "Monitor and control TapBand telemetry, feature scope, kill switches and credential alerts.",
    resources: ["tapband-feature-configs", "tapband-kill-switches", "tapband-telemetry-events", "tapband-alerts", "devices", "scans", "audit-log"],
    operatingQuestions: [
      "Which TapBand capabilities are enabled for this environment, organizer or event?",
      "Are any emergency kill switches active for a batch, reader, outlet or channel?",
      "Which TapBand readers or devices are producing repeated errors?",
      "Are any credentials showing fraud or replay patterns?",
      "Which open TapBand alerts need event-day or security response?",
    ],
    nextBusinessActions: ["Enable pilot scope", "Activate kill switch", "Review alert", "Inspect reader", "Export telemetry"],
  },
  {
    key: "promotions-controls",
    title: "Promotions & Controls",
    href: "/super-admin/workspaces/promotions-controls",
    icon: Flag,
    description: "Configure feature flags, promo rules, redemptions and campaign controls.",
    resources: ["feature-flags", "price-rules", "price-rule-redemptions"],
    operatingQuestions: [
      "Which organizations have advanced features enabled?",
      "Which promo codes are active and within limits?",
      "How many redemptions has each campaign generated?",
    ],
    nextBusinessActions: ["Enable module", "Pause promo", "Set redemption limit", "Review usage", "Launch campaign"],
  },
  {
    key: "reliability-audit",
    title: "Reliability & Audit",
    href: "/super-admin/workspaces/reliability-audit",
    icon: RadioTower,
    description: "Monitor webhooks, background jobs, audit trails and system reliability signals.",
    resources: ["webhooks", "jobs", "audit-log", "app-audit-log"],
    operatingQuestions: [
      "Which provider webhooks are unprocessed?",
      "Which jobs failed after all retry attempts?",
      "Who changed sensitive business records?",
    ],
    nextBusinessActions: ["Retry job", "Mark webhook reviewed", "Investigate actor", "Export audit trail", "Escalate incident"],
  },
  {
    key: "platform-settings",
    title: "Platform Settings",
    href: "/super-admin/workspaces/platform-settings",
    icon: Settings2,
    description: "Govern pricing plans, feature access and platform-level commercial rules.",
    resources: ["pricing-plans", "feature-flags", "admin-users"],
    operatingQuestions: [
      "What fees apply to each organizer?",
      "Which platform capabilities are enabled?",
      "Who has elevated internal admin access?",
    ],
    nextBusinessActions: ["Change fee plan", "Grant admin", "Rotate feature flag", "Review access", "Lock setting"],
  },
]

export function getAdminWorkspace(key: string) {
  return ADMIN_WORKSPACES.find((workspace) => workspace.key === key)
}
