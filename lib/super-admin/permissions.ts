import "server-only"

export type AdminRoleTier = "super_admin" | "finance_admin" | "support_admin" | "event_ops_admin" | "read_only_admin"

export const ADMIN_ROLE_TIERS: AdminRoleTier[] = [
  "super_admin",
  "finance_admin",
  "support_admin",
  "event_ops_admin",
  "read_only_admin",
]

export const FINANCE_RESOURCE_KEYS = new Set([
  "payments",
  "payment-attempts",
  "payouts",
  "payout-accounts",
  "refunds",
  "refund-items",
  "ledger-entries",
  "pricing-plans",
  "price-rules",
  "price-rule-redemptions",
])

export const EVENT_OPS_RESOURCE_KEYS = new Set([
  "venues",
  "artists",
  "events",
  "event-dates",
  "event-artists",
  "ticket-types",
  "ticket-type-channels",
  "seat-maps",
  "seats",
  "seat-holds",
  "guestlist-entries",
  "event-staff",
  "devices",
  "device-sessions",
  "scans",
])

export const SUPPORT_RESOURCE_KEYS = new Set([
  "orders",
  "order-items",
  "transfers",
  "resale-listings",
  "waitlists",
])

export function allowedGenericMutationRolesForResource(resourceKey: string): AdminRoleTier[] {
  if (FINANCE_RESOURCE_KEYS.has(resourceKey)) return ["super_admin"]
  if (EVENT_OPS_RESOURCE_KEYS.has(resourceKey)) return ["super_admin", "event_ops_admin"]
  if (SUPPORT_RESOURCE_KEYS.has(resourceKey)) return ["super_admin", "support_admin"]

  return ["super_admin"]
}

export function canMutateResource(resourceKey: string, roleTier: string) {
  return allowedGenericMutationRolesForResource(resourceKey).includes(roleTier as AdminRoleTier)
}
