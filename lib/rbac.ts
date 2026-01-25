// RBAC: Role-Based Access Control utility module
// Determines permissions based on org_members, event_staff, and admin_users tables

export type OrgRole = "admin" | "organizer" | "finance" | "staff" | "member"
export type EventRole = "admin" | "organizer" | "finance" | "scanner" | "staff"
export type GlobalRole = "admin" | "moderator"

export interface OrgMembership {
  org_id: string
  role: OrgRole
  created_at: string
  name?: string | null
}

export interface EventStaff {
  event_id: string
  org_id: string
  role: EventRole
  created_at: string
}

export interface Permissions {
  isGlobalAdmin: boolean
  orgMemberships: OrgMembership[]
  eventAccessByEventId: Record<string, EventRole>
  activeOrgId: string | null
}

export interface UserAuthzContext {
  userId: string
  profile: {
    id: string
    email: string
    display_name?: string | null
    default_org_id?: string | null
  } | null
  permissions: Permissions
}

// Helper: Check if user has global admin role
export function canAccessGlobalAdmin(perms: Permissions): boolean {
  return perms.isGlobalAdmin
}

// Helper: Check if user can access a specific org
export function canAccessOrg(perms: Permissions, orgId: string): boolean {
  return perms.orgMemberships.some((m) => m.org_id === orgId)
}

// Helper: Get user's role in a specific org
export function getOrgRole(perms: Permissions, orgId: string): OrgRole | null {
  const membership = perms.orgMemberships.find((m) => m.org_id === orgId)
  return membership?.role || null
}

// Helper: Check if user can manage org (admin or organizer)
export function canManageOrg(perms: Permissions, orgId: string): boolean {
  const role = getOrgRole(perms, orgId)
  return role === "admin" || role === "organizer"
}

// Helper: Check if user can view org finances
export function canViewOrgFinance(perms: Permissions, orgId: string): boolean {
  const role = getOrgRole(perms, orgId)
  return role === "admin" || role === "finance" || role === "organizer"
}

// Helper: Check if user can create events in org
export function canCreateEvent(perms: Permissions, orgId: string): boolean {
  const role = getOrgRole(perms, orgId)
  return role === "admin" || role === "organizer"
}

// Helper: Check if user can manage event staff
export function canManageEventStaff(
  perms: Permissions,
  eventId: string,
  eventOrgId: string
): boolean {
  // Global admin can manage any event
  if (perms.isGlobalAdmin) return true

  // Check if user is org admin/organizer for the event's org
  const orgRole = getOrgRole(perms, eventOrgId)
  if (orgRole === "admin" || orgRole === "organizer") return true

  // Check if user is event admin/organizer for this specific event
  const eventRole = perms.eventAccessByEventId[eventId]
  return eventRole === "admin" || eventRole === "organizer"
}

// Helper: Check if user can scan tickets for event
export function canScanEvent(perms: Permissions, eventId: string): boolean {
  if (perms.isGlobalAdmin) return true

  const eventRole = perms.eventAccessByEventId[eventId]
  return eventRole === "scanner" || eventRole === "admin" || eventRole === "organizer"
}

// Helper: Check if user can view event
export function canViewEvent(perms: Permissions, eventId: string): boolean {
  if (perms.isGlobalAdmin) return true
  return !!perms.eventAccessByEventId[eventId]
}

// Helper: Check if user has permission (with fallback to active org)
export function hasPermission(
  perms: Permissions,
  action: string,
  scope?: { orgId?: string; eventId?: string }
): boolean {
  switch (action) {
    case "admin:access":
      return perms.isGlobalAdmin

    case "org:access":
      return scope?.orgId ? canAccessOrg(perms, scope.orgId) : false

    case "org:manage":
      return scope?.orgId ? canManageOrg(perms, scope.orgId) : false

    case "org:finance":
      return scope?.orgId ? canViewOrgFinance(perms, scope.orgId) : false

    case "event:create":
      return scope?.orgId ? canCreateEvent(perms, scope.orgId) : false

    case "event:manage_staff":
      return scope?.eventId && scope?.orgId
        ? canManageEventStaff(perms, scope.eventId, scope.orgId)
        : false

    case "event:scan":
      return scope?.eventId ? canScanEvent(perms, scope.eventId) : false

    case "event:view":
      return scope?.eventId ? canViewEvent(perms, scope.eventId) : true // Public by default

    default:
      return false
  }
}
