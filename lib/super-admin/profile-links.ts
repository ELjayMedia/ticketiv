// Where a support person should land for a row in a table screen.
//
// Orders, events, organizers and people have purpose-built pages that show
// what happened and offer audited fixes. Rows that belong to one of them
// (a ticket, a payment, an event's staff member) open that page instead of the
// raw record editor, which stays available as "Edit record" (?raw=1).
//
// Pure, so it is unit tested. Venues and artists get profiles later: add them
// here when they do.

type Row = Record<string, unknown>

const id = (value: unknown): string | null => (typeof value === "string" && value.length > 0 ? value : null)

const PROFILE_FOR: Record<string, (row: Row) => string | null> = {
  orders: (row) => (id(row.id) ? `/super-admin/order/${row.id}` : null),
  "order-items": (row) => (id(row.order_id) ? `/super-admin/order/${row.order_id}` : null),
  payments: (row) => (id(row.order_id) ? `/super-admin/order/${row.order_id}` : null),
  "payment-attempts": (row) => (id(row.order_id) ? `/super-admin/order/${row.order_id}` : null),
  events: (row) => (id(row.id) ? `/super-admin/event/${row.id}` : null),
  "ticket-types": (row) => (id(row.event_id) ? `/super-admin/event/${row.event_id}` : null),
  "event-dates": (row) => (id(row.event_id) ? `/super-admin/event/${row.event_id}` : null),
  devices: (row) => (id(row.event_id) ? `/super-admin/event/${row.event_id}` : null),
  organizations: (row) => (id(row.id) ? `/super-admin/organizer/${row.id}` : null),
  payouts: (row) => (id(row.org_id) ? `/super-admin/organizer/${row.org_id}` : null),
  "org-members": (row) => (id(row.user_id) ? `/super-admin/people/${row.user_id}` : null),
  "event-staff": (row) => (id(row.user_id) ? `/super-admin/people/${row.user_id}` : null),
  "admin-users": (row) => (id(row.user_id) ? `/super-admin/people/${row.user_id}` : null),
  "device-sessions": (row) => (id(row.user_id) ? `/super-admin/people/${row.user_id}` : null),
}

/** What the "Open" button leads to: the profile page, or null when the row has none. */
export function profileHrefFor(resourceKey: string, row: Row): string | null {
  return PROFILE_FOR[resourceKey]?.(row) ?? null
}

/** The profile name shown on the button ("Open order", "Open person"). */
export function profileLabelFor(resourceKey: string): string | null {
  const href = PROFILE_FOR[resourceKey]?.({ id: "x", order_id: "x", event_id: "x", org_id: "x", user_id: "x" })
  if (!href) return null
  if (href.includes("/order/")) return "Open order"
  if (href.includes("/event/")) return "Open event"
  if (href.includes("/organizer/")) return "Open organizer"
  return "Open person"
}

/**
 * Records whose own detail URL should show the profile, not the raw editor.
 * The editor is still reachable with ?raw=1.
 */
export const DETAIL_REDIRECTS: Record<string, (recordId: string) => string> = {
  orders: (recordId) => `/super-admin/order/${recordId}`,
  events: (recordId) => `/super-admin/event/${recordId}`,
  organizations: (recordId) => `/super-admin/organizer/${recordId}`,
}

/**
 * Records the platform creates itself (checkout, payments, scanning, logs).
 * Adding them by hand would break the books, so the table screen offers no
 * create form for these.
 */
export const NO_HAND_CREATE = new Set([
  "orders",
  "order-items",
  "payments",
  "payment-attempts",
  "refunds",
  "refund-items",
  "ledger-entries",
  "payouts",
  "transfers",
  "resale-listings",
  "seat-holds",
  "scans",
  "device-sessions",
  "price-rule-redemptions",
  "credential-taps",
  "tapband-telemetry-events",
  "webhooks",
  "jobs",
  "audit-log",
  "app-audit-log",
  "admin-users",
])

/** Where an audit entry's record lives, by the table it was written for. */
export function auditRecordHref(tableName: string | null | undefined, recordId: string | null | undefined, changes?: Record<string, unknown> | null): string | null {
  const orderId = id(changes?.order_id)
  const eventId = id(changes?.event_id)
  const record = id(recordId)
  switch (tableName) {
    case "orders":
      return record ? `/super-admin/order/${record}` : null
    case "events":
      return record ? `/super-admin/event/${record}` : null
    case "ticket_types":
    case "event_dates":
    case "devices":
    case "event_staff":
      return eventId ? `/super-admin/event/${eventId}` : null
    case "organizations":
      return record ? `/super-admin/organizer/${record}` : null
    case "auth.users":
    case "admin_users":
    case "profiles":
      return record ? `/super-admin/people/${record}` : null
    default:
      if (orderId) return `/super-admin/order/${orderId}`
      return eventId ? `/super-admin/event/${eventId}` : null
  }
}
