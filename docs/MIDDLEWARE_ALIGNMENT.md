# Middleware Alignment with Server-Side Permissions

## Problem Solved

Previously, middleware tried to enforce detailed event-level access checks by fetching event→org mappings. This diverged from the real permissions rules in layouts/components and created potential sync issues.

## Solution: Option A - Coarse-Grained Middleware

### Middleware Responsibilities (Fast Path)
✓ Authentication check (required for protected routes)
✓ Admin check (/admin/* → isGlobalAdmin only)
✓ Org membership check (/orgs/:orgId/* → fast org_members lookup)
✓ Organizer workspace check (/organizer/* → any org membership required)
✗ Does NOT check event-level access (event_staff + org admin)
✗ Does NOT require event→org context fetching

### Layout/Page Responsibilities (Detailed Checks)
✓ Event-level access: app/(organizer)/events/[eventId]/layout.tsx
  - Checks event_staff OR org admin/organizer
  - Has full event context, no divergence
  - Returns 403 if unauthorized
✓ Permissions hooks (useCanAccess) used for UI gating

## Benefits

1. **No Context Leakage**: Middleware doesn't duplicate detailed permission logic
2. **No Divergence**: Single source of truth in permissions-loader.ts
3. **Fast Path**: Middleware stays lightweight (no multi-table joins)
4. **Testable**: Permission logic lives in predictable places (layouts/hooks/API)
5. **Scalable**: New routes just need appropriate layout checks

## Route Protection Map

```
Public Routes
  /, /login, /register, /auth/verify-email
  → No middleware check

Authenticated Routes (auth required)
  /app/*, /dashboard, etc.
  → Middleware: checks authentication only
  → Layout/Pages: enforce specific access (activeOrgId, etc.)

Org-Scoped Routes (org membership required)
  /orgs/:orgId/*
  → Middleware: checks org membership
  → Layout/Pages: enforce org-specific actions

Admin Routes (global admin required)
  /admin/*
  → Middleware: checks admin_users table

Organizer Workspace (any org required)
  /organizer/*
  → Middleware: checks any org_members entry
  → Layout/Pages: enforce event/org-specific actions
```

## Event Access Example

File: `app/(organizer)/events/[eventId]/layout.tsx`

Checks:
1. User is event_staff for eventId → Allow
2. User is org admin/organizer for event's org → Allow
3. Neither → 403 redirect

No middleware involved; full context available.

## Adding New Routes

1. Route path exists → middleware checks basic auth
2. Need org context? Create layout with org membership check
3. Need event context? Create layout with event_staff + org admin check
4. Need UI gates? Use useCanAccess() hook from permissions context

## Debugging

Enable middleware logging in middleware.ts (already has console.log calls):
```
[v0] Middleware check: /organizer/events/abc-123
[v0] Error checking any org membership: ...
```

Event layout logs:
```
[v0] Event access granted via event_staff: user-123 event-456
[v0] Unauthorized event access: user-123 event-456
```
