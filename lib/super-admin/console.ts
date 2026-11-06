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

export const CONSOLE_ACTION_ROLES: Record<ConsoleAction, AdminRoleTier[]> = {
  resend_tickets: ["super_admin", "support_admin", "event_ops_admin"],
  change_buyer_email: ["super_admin", "support_admin"],
  reissue_ticket: ["super_admin", "support_admin", "event_ops_admin"],
  request_refund: ["super_admin", "support_admin", "finance_admin"],
  send_password_reset: ["super_admin", "support_admin"],
  sign_out_everywhere: ["super_admin", "support_admin"],
  add_note: ["super_admin", "support_admin", "finance_admin", "event_ops_admin"],
  manage_team: ["super_admin"],
}

/** Actions that change something and so must carry a reason in the audit log. */
export const REASON_REQUIRED: ReadonlySet<ConsoleAction> = new Set([
  "resend_tickets",
  "change_buyer_email",
  "reissue_ticket",
  "request_refund",
  "send_password_reset",
  "sign_out_everywhere",
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
