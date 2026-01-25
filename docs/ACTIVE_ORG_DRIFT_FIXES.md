# Active Org Drift Prevention Guide

## Problem Statement
When using localStorage to persist `activeOrgId`, the following issues can occur:
1. User loses access to an org (removed by admin)
2. User switches accounts
3. Org is deleted
4. Stale data is served from org-scoped caches

The activeOrgId can become "out of sync" with reality, leading to 404s, permission errors, or stale data.

## Solution Overview

### 1. ActiveOrgId Validation (`validateAndNormalizeActiveOrgId`)
When permissions load, the system validates the stored activeOrgId:
- If activeOrgId exists in `orgMemberships`, keep it ✓
- Fallback to `profile.default_org_id` if valid ✓
- Fallback to first org in memberships ✓
- Return null if user has no orgs ✓

```typescript
// Automatically happens in PermissionsProvider.loadPermissions()
const normalizedOrgId = validateAndNormalizeActiveOrgId(
  storedOrgId,           // from localStorage
  permissions,            // newly loaded
  profile                 // newly loaded
)
```

### 2. Permission Context Validation
The `usePermissions()` hook now provides `isActiveOrgValid` flag:
```typescript
const { activeOrgId, isActiveOrgValid } = usePermissions()

// Use this to conditionally render warning states or force org selection
if (!isActiveOrgValid) {
  return <OrgSwitcher />  // Shows warning, forces selection
}
```

### 3. Org-Scoped Cache Invalidation
When user switches orgs, all org-scoped caches are automatically cleared:
```typescript
// In setActiveOrgId:
if (prevOrgId !== newOrgId) {
  cacheStore.invalidateOrgScopes(newOrgId)  // Clears old cache
}
```

Use the cache hook in your data fetching:
```typescript
const { get, set } = useOrgScopedCache()

// On fetch:
const events = get<Event[]>("events-list")
if (!events) {
  const fresh = await fetchEvents()
  set("events-list", fresh)
  return fresh
}
```

### 4. UI Feedback
The OrgSwitcher now:
- Shows "Create Org" if user has no orgs
- Shows warning icon + message if activeOrgId is invalid
- Forces selection before proceeding
- Shows org roles in dropdown

### 5. No-Org State Handling
Pages can check for no-org scenario:
```typescript
"use client"
import { usePermissions } from "@/lib/providers/permissions-provider"
import { NoOrgState } from "@/components/no-org-state"

export default function MyPage() {
  const { permissions, isLoading } = usePermissions()

  if (!isLoading && !permissions?.orgMemberships.length) {
    return <NoOrgState />
  }

  // Render normal content
}
```

## Files Modified/Created

### Core Infrastructure
- `lib/cache-store.ts` - Org-scoped cache with TTL invalidation
- `hooks/use-org-scoped-cache.ts` - Hook to access org cache

### PermissionsProvider Updates
- Enhanced `validateAndNormalizeActiveOrgId()` function
- Validates activeOrgId on each permissions load
- Invalidates org-scoped caches on org switch
- Exposes `isActiveOrgValid` flag
- Better logging for debugging

### Component Updates
- `components/org-switcher.tsx` - Warning state, no-org handling
- `components/no-org-state.tsx` - Empty state for no orgs

## Integration Checklist

### For Existing Pages
1. Add org validation in layouts:
   ```typescript
   const { permissions, isActiveOrgValid } = usePermissions()
   if (!isActiveOrgValid && permissions?.orgMemberships.length > 0) {
     return <OrgSwitcher />
   }
   ```

2. Wrap data fetching with cache:
   ```typescript
   const { get, set } = useOrgScopedCache()
   const data = get("cache-key") || await fetch(...)
   set("cache-key", data)
   ```

3. Handle no-org state:
   ```typescript
   if (!permissions?.orgMemberships.length) {
     return <NoOrgState />
   }
   ```

### For New Features
1. Always scope queries by activeOrgId in RLS
2. Use `useOrgScopedCache()` for data fetching
3. Show appropriate empty states on permission denial
4. Check `isActiveOrgValid` before rendering sensitive UI

## Testing Scenarios

### Scenario 1: Lose Org Access
1. Load page (activeOrgId = org-1)
2. Admin removes user from org-1
3. Refresh page
4. System detects org-1 not in memberships
5. Auto-fallback to default org or first org
6. OrgSwitcher shows warning message

### Scenario 2: Switch Accounts
1. User logged in as alice@example.com (activeOrgId = org-alice)
2. Logout, login as bob@example.com
3. permissions.loadPermissions() runs
4. activeOrgId reset (bob not in org-alice)
5. Auto-fallback to bob's first org
6. Cache cleared

### Scenario 3: No Org Memberships
1. New user created, no org memberships
2. permissions load: orgMemberships = []
3. activeOrgId = null
4. usePermissions() returns isActiveOrgValid = false
5. App shows NoOrgState
6. User clicks "Create Org" or "Invite Code"

## Debugging

Enable logging to see org drift detection:
```
[v0] Active org not available, falling back to profile default: org-2
[v0] Org changed from org-1 to org-2 - invalidating caches
[v0] Permissions loaded. Active org: org-2 Valid: true
```

Check localStorage:
```javascript
console.log(localStorage.getItem("activeOrgId"))
```

Check permission context:
```javascript
const { activeOrgId, isActiveOrgValid, permissions } = usePermissions()
console.log({ activeOrgId, isActiveOrgValid, orgs: permissions?.orgMemberships })
```
