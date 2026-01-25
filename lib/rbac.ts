// RBAC: Role-Based Access Control utility module
// Unified permission actions prevent UI gate and route guard divergence

/**
 * Unified permission actions
 * These are the ONLY actions used throughout the app
 * Maps to org_members.role and event_staff.role via the helper functions below
 */
export const PERMISSION_ACTIONS = {
  // Admin
  ADMIN_ACCESS: "admin:access",

  // Org-level
  ORG_VIEW: "org:view",
  ORG_MANAGE: "org:manage",
  ORG_VIEW_PAYOUTS: "org:view_payouts",
  ORG_MANAGE_STAFF: "org:manage_staff",

  // Event-level
  EVENT_CREATE: "event:create",
  EVENT_MANAGE: "event:manage",
  EVENT_SCAN: "event:scan",
} as const

export type PermissionAction = (typeof PERMISSION_ACTIONS)[keyof typeof PERMISSION_ACTIONS]

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

// ============================================================================
// INTERNAL HELPERS - Role to Action Mapping
// ============================================================================

// Helper: Check if org role can manage org
function orgRoleCanManage(role: OrgRole | null): boolean {
  return role === "admin" || role === "organizer"
}

// Helper: Check if org role can view payouts
function orgRoleCanViewPayouts(role: OrgRole | null): boolean {
  return role === "admin" || role === "finance" || role === "organizer"
}

// Helper: Check if org role can manage staff
function orgRoleCanManageStaff(role: OrgRole | null): boolean {
  return role === "admin" || role === "organizer"
}

// Helper: Check if org role can create events
function orgRoleCanCreateEvents(role: OrgRole | null): boolean {
  return role === "admin" || role === "organizer"
}

// Helper: Check if event role can scan tickets
function eventRoleCanScan(role: EventRole | null): boolean {
  return role === "scanner" || role === "admin" || role === "organizer"
}

// Helper: Check if event role can manage event
function eventRoleCanManage(role: EventRole | null): boolean {
  return role === "admin" || role === "organizer"
}

// ============================================================================
// PUBLIC API - Use these everywhere instead of role comparisons
// ============================================================================

export function hasPermission(
  perms: Permissions,
  action: PermissionAction,
  scope?: { orgId?: string; eventId?: string }
): boolean {
  switch (action) {
    case PERMISSION_ACTIONS.ADMIN_ACCESS:
      return perms.isGlobalAdmin

    case PERMISSION_ACTIONS.ORG_VIEW:
      return scope?.orgId
        ? perms.orgMemberships.some((m) => m.org_id === scope.orgId)
        : false

    case PERMISSION_ACTIONS.ORG_MANAGE:
      return scope?.orgId
        ? perms.orgMemberships.some(
            (m) => m.org_id === scope.orgId && orgRoleCanManage(m.role)
          )
        : false

    case PERMISSION_ACTIONS.ORG_VIEW_PAYOUTS:
      return scope?.orgId
        ? perms.orgMemberships.some(
            (m) => m.org_id === scope.orgId && orgRoleCanViewPayouts(m.role)
          )
        : false

    case PERMISSION_ACTIONS.ORG_MANAGE_STAFF:
      return scope?.orgId
        ? perms.orgMemberships.some(
            (m) => m.org_id === scope.orgId && orgRoleCanManageStaff(m.role)
          )
        : false

    case PERMISSION_ACTIONS.EVENT_CREATE:
      return scope?.orgId
        ? perms.orgMemberships.some(
            (m) => m.org_id === scope.orgId && orgRoleCanCreateEvents(m.role)
          )
        : false

    case PERMISSION_ACTIONS.EVENT_MANAGE:
      if (perms.isGlobalAdmin) return true
      if (!scope?.eventId) return false

      const eventRole = perms.eventAccessByEventId[scope.eventId]
      return eventRoleCanManage(eventRole)

    case PERMISSION_ACTIONS.EVENT_SCAN:
      if (perms.isGlobalAdmin) return true
      if (!scope?.eventId) return false

      const scanRole = perms.eventAccessByEventId[scope.eventId]
      return eventRoleCanScan(scanRole)

    default:
      const _exhaustive: never = action
      return _exhaustive
  }
}

// Convenience helpers (use these in server code, useCanAccess hook in client)

export function canAccessGlobalAdmin(perms: Permissions): boolean {
  return hasPermission(perms, PERMISSION_ACTIONS.ADMIN_ACCESS)
}

export function canAccessOrg(perms: Permissions, orgId: string): boolean {
  return hasPermission(perms, PERMISSION_ACTIONS.ORG_VIEW, { orgId })
}

export function canManageOrg(perms: Permissions, orgId: string): boolean {
  return hasPermission(perms, PERMISSION_ACTIONS.ORG_MANAGE, { orgId })
}

export function canViewOrgPayouts(perms: Permissions, orgId: string): boolean {
  return hasPermission(perms, PERMISSION_ACTIONS.ORG_VIEW_PAYOUTS, { orgId })
}

export function canManageOrgStaff(perms: Permissions, orgId: string): boolean {
  return hasPermission(perms, PERMISSION_ACTIONS.ORG_MANAGE_STAFF, { orgId })
}

export function canCreateEvent(perms: Permissions, orgId: string): boolean {
  return hasPermission(perms, PERMISSION_ACTIONS.EVENT_CREATE, { orgId })
}

export function canManageEvent(perms: Permissions, eventId: string): boolean {
  return hasPermission(perms, PERMISSION_ACTIONS.EVENT_MANAGE, { eventId })
}

export function canScanEvent(perms: Permissions, eventId: string): boolean {
  return hasPermission(perms, PERMISSION_ACTIONS.EVENT_SCAN, { eventId })
}

export function getOrgRole(perms: Permissions, orgId: string): OrgRole | null {
  const membership = perms.orgMemberships.find((m) => m.org_id === orgId)
  return membership?.role || null
}

export function canViewEvent(perms: Permissions, eventId: string): boolean {
  if (perms.isGlobalAdmin) return true
  return !!perms.eventAccessByEventId[eventId]
}
