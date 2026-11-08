import "server-only"

export type AdminRoleTier = "super_admin" | "finance_admin" | "support_admin" | "event_ops_admin" | "read_only_admin"

export const ADMIN_ROLE_TIERS: AdminRoleTier[] = [
  "super_admin",
  "finance_admin",
  "support_admin",
  "event_ops_admin",
  "read_only_admin",
]

/** Roles that may change platform state. Read-only admins retain visibility only. */
export const ADMIN_MUTATION_ROLE_TIERS: AdminRoleTier[] = ADMIN_ROLE_TIERS.filter(
  (role): role is Exclude<AdminRoleTier, "read_only_admin"> => role !== "read_only_admin",
)

export function canPlatformAdminMutate(roleTier: string | null | undefined): boolean {
  return ADMIN_MUTATION_ROLE_TIERS.includes(roleTier as AdminRoleTier)
}

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
  "tapband-alerts",
  "tapband-kill-switches",
])

export const SUPPORT_RESOURCE_KEYS = new Set([
  "orders",
  "order-items",
  "transfers",
  "resale-listings",
  "waitlists",
])

export const READ_ONLY_RESOURCE_KEYS = new Set([
  "payout-accounts",
  "physical-credentials",
  "credential-entitlements",
  "credential-taps",
  "tapband-telemetry-events",
])

export function allowedGenericMutationRolesForResource(resourceKey: string): AdminRoleTier[] {
  if (READ_ONLY_RESOURCE_KEYS.has(resourceKey)) return []
  if (FINANCE_RESOURCE_KEYS.has(resourceKey)) return ["super_admin"]
  if (EVENT_OPS_RESOURCE_KEYS.has(resourceKey)) return ["super_admin", "event_ops_admin"]
  if (SUPPORT_RESOURCE_KEYS.has(resourceKey)) return ["super_admin", "support_admin"]

  return ["super_admin"]
}

export function canMutateResource(resourceKey: string, roleTier: string) {
  return allowedGenericMutationRolesForResource(resourceKey).includes(roleTier as AdminRoleTier)
}
