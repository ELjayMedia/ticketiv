# Server-Side Layout Protection (Defense-in-Depth)

## Problem

Users can access protected pages through:
- **Deep links**: Shared URLs or bookmarks
- **Browser prefetch**: Next.js router prefetching before user completes navigation
- **Middleware bypass**: Edge cases or middleware divergence from real permissions

Relying only on middleware leaves gaps. **Layouts are always executed** for any route access, making them the perfect place for hard permission checks.

## Solution: Multi-Layer Protection

\`\`\`
Middleware (fast, coarse checks)
    ↓
    ├─ Authenticated? → redirect /login
    ├─ Admin route? → check admin_users (fast single-table)
    ├─ Org route? → check org_members for orgId (fast, specific)
    └─ Pass through to layout
    
Layout (detailed, with entity context)
    ↓
    ├─ Verify user session
    ├─ Fetch entity (org, event) to get necessary context
    ├─ Check detailed permissions (org staff, event staff, org admin)
    └─ Hard redirect /403 or render no-access state
    
Component (UI gates)
    ↓
    └─ usePermissions() + PermissionGate for optional features
\`\`\`

## Layout Protection Map

### `/admin/*` Routes
**Middleware**: Checks `admin_users` table  
**Layout** (`app/admin/layout.tsx`): **Redundant check** of `admin_users.user_id`  
**Benefit**: Even if middleware is bypassed, admin routes are protected

\`\`\`tsx
// app/admin/layout.tsx
if (!adminUser) return redirect("/403")
\`\`\`

### `/orgs/[orgId]/*` Routes
**Middleware**: Checks `org_members.org_id` for specific org  
**Layout** (`app/orgs/[orgId]/layout.tsx`): **Redundant check** of `org_members` for exact orgId  
**Benefit**: Org membership mutations won't grant unexpected access

\`\`\`tsx
// app/orgs/[orgId]/layout.tsx
if (!membership) return redirect("/403")
\`\`\`

### `/organizer/*` Routes
**Middleware**: Checks "any org membership"  
**Layout** (`app/(organizer)/layout.tsx`): **Redundant check** of "at least one org membership"  
**Benefit**: Non-organizers can't access organizer workspace

\`\`\`tsx
// app/(organizer)/layout.tsx
if (!orgMemberships?.length) return redirect("/403")
\`\`\`

### `/events/[eventId]/manage/*` Routes (if added)
**Middleware**: Only checks "authenticated" (no event context)  
**Layout** (`app/(organizer)/events/[eventId]/layout.tsx`): **Detailed check** of:
  - Event exists (404 if not)
  - User is `event_staff` for this event, OR
  - User is `org_admin`/`organizer` for the event's org

**Benefit**: Detailed permission logic with full event context

\`\`\`tsx
// app/(organizer)/events/[eventId]/layout.tsx
if (!eventStaff && !orgMember) return redirect("/403")
\`\`\`

## Implementation Details

### Event Layout (Already Implemented)
- Fetches event to get `org_id`
- Checks `event_staff` OR org admin role
- Hard-blocks with 403 if unauthorized
- Uses 404 for non-existent events

### Org Layout (New)
- Checks `org_members` for specific orgId
- Prevents lateral movement to orgs user isn't part of
- Returns 403 if no membership

### Admin Layout (New)
- Checks `admin_users` table
- Simple, single-source-of-truth check
- Returns 403 if not admin

### Organizer Layout (Enhanced)
- Checks for "any org membership"
- Prevents non-organizers from accessing organizer workspace
- Returns 403 if no orgs

## Cache Invalidation

When org membership or event staff changes:
1. **Backend**: Update `org_members` or `event_staff` table
2. **Revalidation**: Use `revalidateTag()` to clear layout cache
3. **Next.js**: Will re-evaluate layout on next request

\`\`\`tsx
// In API route that modifies org_members:
import { revalidateTag } from "next/cache"

export async function POST(req: Request) {
  // ... modify org_members
  revalidateTag("org-members")
  revalidateTag("user-permissions")
}
\`\`\`

## Testing & Verification

1. **Test 403 redirect**: Try accessing `/admin` as non-admin user → should see 403
2. **Test 404**: Try accessing `/orgs/[invalid-id]` → should 404
3. **Test deep links**: Share event management URL to non-staff user → should redirect to 403
4. **Test prefetch bypass**: Rapidly click links before fetch completes → layout still checks

## Debugging

Look for logs like:
\`\`\`
[v0] User is not a member of org: userId orgId
[v0] Unauthorized event access: userId eventId
[v0] Admin layout access granted: userId
\`\`\`

These indicate layout permission checks are working.

## Future: More Routes

For any new protected route, apply the pattern:

\`\`\`tsx
// app/protected/[id]/layout.tsx
import { redirect, notFound } from "next/navigation"

export default async function ProtectedLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  const session = await getSession()
  if (!session) return redirect("/login")

  // 1. Fetch entity (or get context from DB)
  const entity = await db.query(params.id)
  if (!entity) notFound()

  // 2. Check permission for this entity
  const canAccess = await checkPermission(session.user.id, entity.id)
  if (!canAccess) return redirect("/403")

  // 3. Allow access
  return <>{children}</>
}
\`\`\`

---

**Key Insight**: Middleware is the security perimeter, but layouts are the access control guards. Both must be in sync and both must check independently.
