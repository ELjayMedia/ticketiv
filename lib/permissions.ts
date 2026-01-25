/**
 * Convenience exports for permission actions
 * Import this instead of reaching into lib/rbac.ts
 */

export {
  PERMISSION_ACTIONS,
  hasPermission,
  canAccessGlobalAdmin,
  canAccessOrg,
  canManageOrg,
  canViewOrgPayouts,
  canManageOrgStaff,
  canCreateEvent,
  canManageEvent,
  canScanEvent,
  getOrgRole,
  canViewEvent,
  type PermissionAction,
  type OrgRole,
  type EventRole,
  type Permissions,
  type OrgMembership,
  type EventStaff,
} from "@/lib/rbac"

export { useCanAccess, usePermissions, useOrgRole } from "@/lib/providers/permissions-provider"
