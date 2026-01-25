# Ticketiv RBAC Implementation Guide

## Overview

This system implements proper Role-Based Access Control (RBAC) for Ticketiv using four core tables:

- **public.profiles**: User display info + default org
- **public.org_members**: User's organization-scoped roles
- **public.event_staff**: User's event-scoped roles
- **public.admin_users**: Global platform admins

## Architecture

### 1. Permission Loading

**File**: `lib/permissions-loader.ts`

On session load or permission refresh:
1. Fetch user profile (display name, default org)
2. Fetch all org_members rows for user
3. Fetch all event_staff rows for user's orgs
4. Check if user exists in admin_users table

Returns a `Permissions` object with:
- `isGlobalAdmin: boolean`
- `orgMemberships: OrgMembership[]`
- `eventAccessByEventId: Record<string, EventRole>`
- `activeOrgId: string | null` (first org or default)

### 2. Client-Side Context

**File**: `lib/providers/permissions-provider.tsx`

`PermissionsProvider` wraps the app and exposes:
- `usePermissions()`: Get full permissions object
- `useCanAccess(action, scope)`: Check if user can perform action
- `useOrgRole(orgId)`: Get user's role in org

### 3. Route Protection

**File**: `middleware.ts`

Protects routes at the Next.js level:
- `/admin/*` → requires `isGlobalAdmin`
- `/orgs/:orgId/*` → requires `org_members` row for that org
- `/events/:eventId/manage/*` → requires `event_staff` OR org admin role

Returns 403 if unauthorized.

### 4. UI Gating

**Files**: `components/permission-gate.tsx`, `components/org-switcher.tsx`

- `<PermissionGate>`: Conditionally render content
- `<PermissionButton>`: Button that disables if no permission
- `<OrgSwitcher>`: Dropdown to switch active org

## Usage Examples

### Checking Permissions in Components

```tsx
"use client"

import { useCanAccess, usePermissions } from "@/lib/providers/permissions-provider"

export function CreateEventButton({ orgId }: { orgId: string }) {
  const canCreate = useCanAccess("event:create", { orgId })

  if (!canCreate) return null

  return <button>Create Event</button>
}
```

### Gating UI Elements

```tsx
import { PermissionGate } from "@/components/permission-gate"

export function EventDashboard({ eventId, orgId }: Props) {
  return (
    <>
      <h1>Event Dashboard</h1>

      {/* Only show for org admins */}
      <PermissionGate action="org:manage" scope={{ orgId }}>
        <button>Edit Event Settings</button>
      </PermissionGate>

      {/* Only show for event staff */}
      <PermissionGate action="event:scan" scope={{ eventId }}>
        <button>Scan Tickets</button>
      </PermissionGate>
    </>
  )
}
```

### Handling Access Denied

```tsx
import { NoAccessEmptyState } from "@/components/no-access-empty-state"

export function EventDetailPage({ eventId, orgId }: Props) {
  const canAccess = useCanAccess("event:manage", { eventId })

  if (!canAccess) {
    return (
      <NoAccessEmptyState
        title="Event Not Found"
        description="You don't have access to manage this event."
        resource="event"
        showOrgSwitch
      />
    )
  }

  return <EventDetail eventId={eventId} />
}
```

## Permission Actions

### Global
- `admin`: Requires `isGlobalAdmin`

### Organization-Scoped
- `org:access`: User is member of org
- `org:manage`: User is org admin/organizer
- `org:finance`: User is org admin/finance/organizer
- `event:create`: User can create events in org

### Event-Scoped
- `event:manage`: User is event staff or org admin
- `event:scan`: User can scan (scanner/admin/organizer role)

## Data Query Scoping

**Critical**: Always scope queries by `org_id` or `event_id` to respect RLS.

### Organizer Dashboard (org scoped)

```tsx
// ✅ CORRECT: Scoped by org
const { data: events } = await supabase
  .from("events")
  .select("*")
  .eq("org_id", activeOrgId)

// ❌ WRONG: No org scope
const { data } = await supabase.from("events").select("*")
```

### Event Management (event scoped)

```tsx
// ✅ CORRECT: Scoped by event
const { data: staff } = await supabase
  .from("event_staff")
  .select("*")
  .eq("event_id", eventId)

// ❌ WRONG: Fetching all staff
const { data } = await supabase.from("event_staff").select("*")
```

## Active Organization

Users can belong to multiple organizations. The `activeOrgId` is:

1. Set from first org membership on login
2. Can be changed via `OrgSwitcher` component
3. Persisted in localStorage for UX consistency
4. Used to scope all org-level queries

**Example**: In organizer workspace, all data fetches use `activeOrgId`.

## Error Handling

### RLS Failures

When Supabase RLS blocks a query:
- Query returns 401/403 status
- Show `NoAccessEmptyState` to user
- Suggest switching organization if applicable

### Demo Mode

Demo users:
- `demo@ticketiv.com` (attendee): No org memberships
- `organizer@ticketiv.com` (organizer): org_id = "demo-org-1", role = "organizer"
- `admin@ticketiv.com` (admin): isGlobalAdmin = true

## Testing Checklist

- [ ] Global admin can access `/admin/*`
- [ ] Non-admin gets 403 on `/admin/*`
- [ ] Users without org membership get 403 on `/orgs/:orgId/*`
- [ ] OrgSwitcher shows all user's orgs
- [ ] Switching orgs updates `activeOrgId` and UI
- [ ] Event staff can scan but not manage
- [ ] Org admin can manage all org events
- [ ] "Create Event" button hidden for non-organizers
- [ ] NoAccessEmptyState shows on permission failures
- [ ] RLS failures show friendly error, not blank page

## Integration Checklist

- [ ] Add PermissionsProvider to app/layout.tsx ✅
- [ ] Fetch permissions on session load ✅
- [ ] Add OrgSwitcher to app header
- [ ] Update event create/edit pages with permission checks
- [ ] Update dashboard with permission-gated sections
- [ ] Add permission checks to API routes
- [ ] Test with demo mode
- [ ] Test with real Supabase org_members/event_staff data
