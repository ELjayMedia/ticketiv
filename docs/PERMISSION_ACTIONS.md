# Unified Permission Actions Reference

This document defines the complete set of permission actions used throughout Ticketiv to prevent permission logic divergence.

## The 7 Unified Actions

All permission checks must use these actions instead of comparing role strings directly.

### Admin Actions
- **`PERMISSION_ACTIONS.ADMIN_ACCESS`** = `"admin:access"`
  - User is a global admin (in admin_users table)
  - Required for: /admin/* routes

### Organization Actions
- **`PERMISSION_ACTIONS.ORG_VIEW`** = `"org:view"`
  - User is a member of the org (any role)
  - Roles: admin, organizer, finance, staff, member

- **`PERMISSION_ACTIONS.ORG_MANAGE`** = `"org:manage"`
  - User can manage org settings, create events, modify permissions
  - Roles: admin, organizer
  - Scope: { orgId: string }

- **`PERMISSION_ACTIONS.ORG_VIEW_PAYOUTS`** = `"org:view_payouts"`
  - User can view org financial reports and payouts
  - Roles: admin, finance, organizer
  - Scope: { orgId: string }

- **`PERMISSION_ACTIONS.ORG_MANAGE_STAFF`** = `"org:manage_staff"`
  - User can invite, remove, or change roles of org members
  - Roles: admin, organizer
  - Scope: { orgId: string }

### Event Actions
- **`PERMISSION_ACTIONS.EVENT_CREATE`** = `"event:create"`
  - User can create new events in an org
  - Roles: admin, organizer (org-level)
  - Scope: { orgId: string }

- **`PERMISSION_ACTIONS.EVENT_MANAGE`** = `"event:manage"`
  - User can edit event, manage tickets, view orders
  - Roles: admin, organizer (event-level) OR admin, organizer (org-level)
  - Scope: { eventId: string }

- **`PERMISSION_ACTIONS.EVENT_SCAN`** = `"event:scan"`
  - User can scan tickets at the door
  - Roles: scanner, admin, organizer (event-level)
  - Scope: { eventId: string }

## Usage Examples

### Client Component (React)
\`\`\`tsx
import { PERMISSION_ACTIONS } from "@/lib/rbac"
import { useCanAccess } from "@/lib/providers/permissions-provider"
import { PermissionButton } from "@/components/permission-gate"

export function EventActions({ eventId, orgId }) {
  const canManage = useCanAccess(PERMISSION_ACTIONS.EVENT_MANAGE, { eventId })
  const canScan = useCanAccess(PERMISSION_ACTIONS.EVENT_SCAN, { eventId })

  return (
    <>
      <PermissionButton action={PERMISSION_ACTIONS.EVENT_MANAGE} scope={{ eventId }}>
        Manage Event
      </PermissionButton>
      {canScan && <button>Start Scanning</button>}
    </>
  )
}
\`\`\`

### Server Component (Layout Check)
\`\`\`tsx
import { PERMISSION_ACTIONS, hasPermission } from "@/lib/rbac"
import { loadPermissions } from "@/lib/permissions-loader"

export async function EventLayout({ params, children }) {
  const perms = await loadPermissions()
  
  if (!hasPermission(perms, PERMISSION_ACTIONS.EVENT_MANAGE, { eventId: params.eventId })) {
    redirect("/403")
  }
  
  return children
}
\`\`\`

### Server API Route
\`\`\`tsx
import { PERMISSION_ACTIONS, hasPermission } from "@/lib/rbac"

export async function PATCH(req: Request, { params }) {
  const perms = await loadPermissions()
  
  if (!hasPermission(perms, PERMISSION_ACTIONS.ORG_MANAGE, { orgId: params.orgId })) {
    return new Response("Unauthorized", { status: 403 })
  }
  
  // Update org...
}
\`\`\`

## Migration Guide

### OLD ❌
\`\`\`tsx
if (orgMember?.role === "admin" || orgMember?.role === "organizer") {
  // Show manage button
}
\`\`\`

### NEW ✅
\`\`\`tsx
import { PERMISSION_ACTIONS, hasPermission } from "@/lib/rbac"
import { useCanAccess } from "@/lib/providers/permissions-provider"

// In component
const canManage = useCanAccess(PERMISSION_ACTIONS.ORG_MANAGE, { orgId })

// Or server-side
if (hasPermission(perms, PERMISSION_ACTIONS.ORG_MANAGE, { orgId })) {
  // Show manage button
}
\`\`\`

## Role ↔ Action Mapping

| Action | Org Roles | Event Roles |
|--------|-----------|-------------|
| ADMIN_ACCESS | (n/a - global admin) | (n/a - global admin) |
| ORG_VIEW | admin, organizer, finance, staff, member | - |
| ORG_MANAGE | admin, organizer | - |
| ORG_VIEW_PAYOUTS | admin, finance, organizer | - |
| ORG_MANAGE_STAFF | admin, organizer | - |
| EVENT_CREATE | admin, organizer (via org) | - |
| EVENT_MANAGE | - | admin, organizer |
| EVENT_SCAN | - | scanner, admin, organizer |

## Why Unified Actions?

1. **Prevents Divergence**: Single source of truth for permission logic
2. **Type-Safe**: TypeScript ensures you use valid actions
3. **Centralized Changes**: Modify role requirements in one place (lib/rbac.ts)
4. **Self-Documenting**: Action names are clear intent, not implementation
5. **Consistent UI/Routes**: Same check in components, middleware, and layouts
