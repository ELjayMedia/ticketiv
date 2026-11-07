// Admin console, phase 1: the rules every support action follows.
//
// Pure (no server-only imports) so the role gates and query parsing are unit
// tested. Server actions in app/super-admin/console-actions.ts enforce these.

export type AdminRoleTier = "super_admin" | "finance_admin" | "support_admin" | "event_ops_admin" | "read_only_admin"

export const ADMIN_ROLE_LABELS: Record<AdminRoleTier, string> = {
  super_admin: "Owner",
  support_admin: "Support",
  finance_admin: "Finance",
  event_ops_admin: "Event ops",
  read_only_admin: "Read only",
}

export const ADMIN_ROLE_DESCRIPTIONS: Record<AdminRoleTier, string> = {
  super_admin: "Everything, including settings, fees and who has access.",
  support_admin: "Search, people and orders. Resend and reissue tickets, fix emails, request refunds.",
  finance_admin: "Payouts, refunds and reconciliation. Can request refunds.",
  event_ops_admin: "Events, ticket sales, scanners and devices. Can resend and reissue tickets.",
  read_only_admin: "Sees everything, changes nothing.",
}

/** Roles an owner can hand out from Team & access (the owner role itself is not invitable). */
export const INVITABLE_ROLES: AdminRoleTier[] = ["support_admin", "finance_admin", "event_ops_admin", "read_only_admin"]

export type ConsoleAction =
  | "resend_tickets"
  | "change_buyer_email"
  | "reissue_ticket"
  | "request_refund"
  | "send_password_reset"
  | "sign_out_everywhere"
  | "add_note"
  | "manage_team"
  | "approve_refund"
  | "pause_sales"
  | "take_queue_item"
  | "view_as"
  | "work_cases"
  | "manage_replies"
  | "restore_setting"

export const CONSOLE_ACTION_ROLES: Record<ConsoleAction, AdminRoleTier[]> = {
  resend_tickets: ["super_admin", "support_admin", "event_ops_admin"],
  change_buyer_email: ["super_admin", "support_admin"],
  reissue_ticket: ["super_admin", "support_admin", "event_ops_admin"],
  request_refund: ["super_admin", "support_admin", "finance_admin"],
  send_password_reset: ["super_admin", "support_admin"],
  sign_out_everywhere: ["super_admin", "support_admin"],
  add_note: ["super_admin", "support_admin", "finance_admin", "event_ops_admin"],
  manage_team: ["super_admin"],
  // Money leaves the wallet: only the owner approves, whoever asked.
  approve_refund: ["super_admin"],
  pause_sales: ["super_admin", "event_ops_admin"],
  take_queue_item: ["super_admin", "support_admin", "finance_admin", "event_ops_admin"],
  view_as: ["super_admin", "support_admin"],
  // Phase 3
  work_cases: ["super_admin", "support_admin"],
  manage_replies: ["super_admin", "support_admin"],
  restore_setting: ["super_admin"],
}

/** Actions that change something and so must carry a reason in the audit log. */
export const REASON_REQUIRED: ReadonlySet<ConsoleAction> = new Set([
  "resend_tickets",
  "change_buyer_email",
  "reissue_ticket",
  "request_refund",
  "send_password_reset",
  "sign_out_everywhere",
  "approve_refund",
  "pause_sales",
  "restore_setting",
])

export const MIN_REASON_LENGTH = 10
export const MAX_REASON_LENGTH = 500

export function canDo(action: ConsoleAction, role: string | null | undefined): boolean {
  return Boolean(role) && CONSOLE_ACTION_ROLES[action].includes(role as AdminRoleTier)
}

/** Returns an error message, or null when the reason is acceptable. */
export function reasonProblem(reason: unknown): string | null {
  const text = typeof reason === "string" ? reason.trim() : ""
  if (text.length < MIN_REASON_LENGTH) {
    return `Add a reason of at least ${MIN_REASON_LENGTH} characters, so the next person understands why.`
  }
  if (text.length > MAX_REASON_LENGTH) return `Keep the reason under ${MAX_REASON_LENGTH} characters.`
  return null
}

export function normalizeEmail(value: unknown): string | null {
  const text = typeof value === "string" ? value.trim().toLowerCase() : ""
  if (text.length > 254) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? text : null
}

export type SearchKind = "payment_reference" | "ticket_code" | "order_id" | "email" | "phone" | "text" | "empty"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** What the support person most likely typed, so search can lead with the right result. */
export function classifySearch(raw: unknown): { kind: SearchKind; query: string } {
  const query = typeof raw === "string" ? raw.trim().slice(0, 120) : ""
  if (query.length < 2) return { kind: "empty", query }
  if (/^pay-[0-9a-f]{8}$/i.test(query)) return { kind: "payment_reference", query: query.toUpperCase() }
  if (/^[A-Z2-7]{4}-[A-Z2-7]{4}(-[A-Z2-7]{0,4})?$/i.test(query)) return { kind: "ticket_code", query: query.toUpperCase() }
  if (UUID.test(query) || /^[0-9a-f]{8}$/i.test(query)) return { kind: "order_id", query: query.toLowerCase() }
  if (query.includes("@")) return { kind: "email", query: query.toLowerCase() }
  if (query.replace(/[^0-9]/g, "").length >= 6 && /^[+0-9 ()-]+$/.test(query)) return { kind: "phone", query }
  return { kind: "text", query }
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value)
}

/** Short, human order reference used across the console. */
export function orderRef(orderId: string): string {
  return orderId.slice(0, 8).toUpperCase()
}

export function formatMoney(cents: number | null | undefined, currency: string | null | undefined): string {
  const amount = (cents ?? 0) / 100
  return `${currency ?? "SZL"} ${amount.toLocaleString("en-SZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export type ConsoleActionResult = { status: "idle" } | { status: "done"; message: string } | { status: "error"; message: string }

export const IDLE_RESULT: ConsoleActionResult = { status: "idle" }

// ---------------------------------------------------------------------------
// Work queues (phase 2)

export type QueueKey = "payments" | "delivery" | "refunds" | "payouts" | "reconciliation" | "scanners"

export const QUEUES: Array<{ key: QueueKey; label: string; team: "Support" | "Money" | "Events" }> = [
  { key: "payments", label: "Payment errors", team: "Support" },
  { key: "delivery", label: "Tickets not delivered", team: "Support" },
  { key: "refunds", label: "Refunds to approve", team: "Money" },
  { key: "payouts", label: "Payouts to send", team: "Money" },
  { key: "reconciliation", label: "Reconciliation issues", team: "Money" },
  { key: "scanners", label: "Scanners offline", team: "Events" },
]

/** Stable key for a queue item, also the primary key of admin_queue_claims. */
export function queueItemKey(queue: QueueKey, recordId: string): string {
  return `${queue}:${recordId}`
}

export function parseQueueItemKey(value: unknown): { queue: QueueKey; recordId: string } | null {
  if (typeof value !== "string") return null
  const [queue, ...rest] = value.split(":")
  const recordId = rest.join(":")
  if (!QUEUES.some((q) => q.key === queue) || !recordId || recordId.length > 180) return null
  return { queue: queue as QueueKey, recordId }
}

/** A scanner is offline when it hasn't checked in for this long while its event is close or running. */
export const SCANNER_OFFLINE_MINUTES = 15

export function scannerIsOffline(lastSeenAt: string | null, now: Date, minutes = SCANNER_OFFLINE_MINUTES): boolean {
  if (!lastSeenAt) return true
  return now.getTime() - new Date(lastSeenAt).getTime() > minutes * 60 * 1000
}

/**
 * Ticket emails that failed and were never delivered later on any channel.
 * Input rows are notifications for ticket_issued; returns order ids still undelivered.
 */
export function undeliveredOrders(rows: Array<{ order_id: string | null; status: string; created_at: string }>): Array<{ orderId: string; lastFailureAt: string }> {
  const byOrder = new Map<string, { sent: boolean; lastFailureAt: string | null }>()
  for (const row of rows) {
    if (!row.order_id) continue
    const entry = byOrder.get(row.order_id) ?? { sent: false, lastFailureAt: null }
    if (row.status === "sent") entry.sent = true
    if (row.status === "failed" && (!entry.lastFailureAt || row.created_at > entry.lastFailureAt)) entry.lastFailureAt = row.created_at
    byOrder.set(row.order_id, entry)
  }
  return [...byOrder.entries()]
    .filter(([, entry]) => !entry.sent && entry.lastFailureAt)
    .map(([orderId, entry]) => ({ orderId, lastFailureAt: entry.lastFailureAt! }))
    .sort((a, b) => b.lastFailureAt.localeCompare(a.lastFailureAt))
}

// ---------------------------------------------------------------------------
// Settings history (phase 3)

export const SETTINGS_TABLES: Record<string, string> = {
  feature_flags: "Feature flags",
  payment_routing_rules: "Payment routing",
  platform_fee_settings: "Platform fee",
  pricing_plans: "Pricing plans",
  tapband_feature_configs: "TapBand config",
  payment_provider_settings: "Payment providers",
}

/** Fields that change on every save and say nothing about what was changed. */
const NOISE_FIELDS = new Set(["updated_at", "last_changed_at", "last_changed_by", "updated_by"])

export type FieldChange = { field: string; before: string; after: string }

function show(value: unknown): string {
  if (value === undefined || value === null) return "empty"
  if (typeof value === "string") return value
  return JSON.stringify(value)
}

/** The readable before/after list for one history row. */
export function describeChange(
  operation: "insert" | "update" | "delete",
  oldRow: Record<string, unknown> | null,
  newRow: Record<string, unknown> | null,
): FieldChange[] {
  const keys = new Set([...Object.keys(oldRow ?? {}), ...Object.keys(newRow ?? {})])
  const changes: FieldChange[] = []
  for (const key of [...keys].sort()) {
    if (NOISE_FIELDS.has(key)) continue
    const before = oldRow?.[key]
    const after = newRow?.[key]
    if (operation === "update" && JSON.stringify(before) === JSON.stringify(after)) continue
    if (operation !== "update" && (before ?? after) === null) continue
    changes.push({ field: key, before: operation === "insert" ? "" : show(before), after: operation === "delete" ? "" : show(after) })
  }
  return changes
}

/** A short name for the setting a history row is about. */
export function settingLabel(row: Record<string, unknown> | null): string {
  if (!row) return "Setting"
  for (const key of ["key", "provider", "name", "code"]) {
    if (typeof row[key] === "string" && row[key]) return String(row[key])
  }
  if (typeof row.currency === "string") return `${row.currency}${row.country_code ? ` · ${row.country_code}` : ""}`
  return "Setting"
}
