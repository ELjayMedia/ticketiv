# Ticketiv – Data Separation & Access Model

This document defines how data is separated, accessed, and protected across public users, authenticated users, organizers, staff, and admins in Ticketiv.

## Goal

- Prevent data leakage across organizations and events
- Keep frontend queries predictable
- Align frontend behavior with Supabase RLS rules
- Clearly separate public, org-scoped, and event-scoped data

## Rule of Thumb

If a user does not explicitly belong to an org or event, the frontend must not even attempt to query that data.

## 1. Core Separation Principles

Ticketiv enforces separation on three axes:

| Axis | Description |
|------|-------------|
| Tenant | Each organization is a hard boundary |
| Context | Event-level data is isolated from org-level data |
| Audience | Public vs authenticated vs privileged users |

## 2. Data Categories

### 2.1 Public Data (Unauthenticated Access)

Public data is read-only and exposed via public views.

**Examples:**
- Public event listings
- Event details pages
- Ticket availability (aggregated)
- Public sales stats (if allowed)

**Sources:**
- `v_events_public`
- `v_event_sales_public`
- Any `v_*_public` view

**Frontend rules:**
- No auth required
- Never query base tables
- No `org_id` or `user_id` filtering required

```typescript
// ✅ Correct
const { data } = await supabase.from("v_events_public").select("*")

// ❌ Incorrect - triggers RLS error
const { data } = await supabase.from("events").select("*")
```

**Implementation:**
- Use `lib/data/public/events.ts` for all public event queries
- Always add `.eq("visibility", "public")` filter
- Gracefully handle RLS failures with null returns

### 2.2 Profile Data (User Identity Layer)

Profiles represent identity and defaults, not permissions.

**Table:** `public.profiles`

**Purpose:**
- `display_name` – UI display only
- `avatar` – User picture
- `default_org_id` – Initial org context for permissions provider

**Critical Rule:**
```
profiles.role must NEVER be used to authorize actions.
```

**Frontend may read:**
- `profiles.org_id` → initial org context (for fallback only)
- `profiles.display_name` → UI display only

## 3. Organization-Scoped Data

### 3.1 Organization Membership Boundary

Organization data is scoped via:

**Table:** `public.org_members`

**Rule:**
A user may only access org-scoped data if a matching `org_members` row exists.

**Examples of org-scoped data:**
- Events under an organization
- Financial summaries
- Staff lists
- Payout accounts
- Org settings

**Frontend requirement:**
Every org query MUST include `org_id = activeOrgId` where `activeOrgId` exists in `org_members`.

```typescript
// ✅ Correct
const { data } = await supabase
  .from("events")
  .select("*")
  .eq("org_id", activeOrgId)

// ❌ Incorrect - leaks data / RLS failure
const { data } = await supabase.from("events").select("*")
```

### 3.2 Active Organization Context

The frontend must maintain an active organization context via `PermissionsProvider`.

**Source priority:**
1. URL (`/orgs/:orgId`)
2. Stored preference (`localStorage`)
3. `profiles.default_org_id`
4. First available `org_members` entry

**Invalid org handling:**
If `activeOrgId` no longer exists in `org_members`:
- Auto-fallback to a valid org
- Or show "No org access" state
- See `validateAndNormalizeActiveOrgId()` in `lib/providers/permissions-provider.tsx`

## 4. Event-Scoped Data

### 4.1 Event Boundary

Event data is scoped via:

**Table:** `public.event_staff`

**Rule:**
Event-level private data is only accessible if the user is:
- In `event_staff` for the event, OR
- An org admin for the event's org (inheritance rule)

**Examples of event-scoped private data:**
- Attendee lists
- Ticket scans
- Staff assignments
- Event-level analytics
- Check-in tools

### 4.2 Event → Org Inheritance Rule

**Critical:** Org admins automatically inherit access to all events under the org.

```typescript
canManageEvent(eventId) =
  isGlobalAdmin ||
  isEventStaff(eventId) ||
  isOrgAdmin(event.org_id)
```

**Frontend requirement:**
- Event layouts must know `event.org_id`
- Permission checks must consider both `event_staff` and `org_members`
- See `lib/rbac.ts` `EVENT_MANAGE` permission action

## 5. Global Admin Data

### 5.1 Platform-Wide Access

**Table:** `public.admin_users`

**Scope:**
- Cross-org access
- System-level dashboards
- Moderation tools

**Frontend rules:**
- Only `/admin/*` routes may access global data
- Admin users still use org context for normal org flows

## 6. Route-Level Data Separation

| Route | Data Scope | Notes |
|-------|-----------|-------|
| `/` | Public | Uses public views |
| `/events/:id` | Public | No auth required |
| `/browse` | Public | Event listing |
| `/events/:id/manage/*` | Event | Requires event/org access |
| `/organizer/*` | Organization | Requires org_members |
| `/orgs/:orgId/*` | Organization | Requires org_members |
| `/admin/*` | Global | Requires admin_users |

**Important:**
- Middleware provides coarse protection (authenticated check)
- Server layouts MUST enforce final authorization
- See `app/(organizer)/layout.tsx`, `app/orgs/[orgId]/layout.tsx`, `app/(organizer)/events/[eventId]/layout.tsx`

## 7. Frontend Query Rules (Hard Rules)

### ✅ Always Do

- Scope queries by `org_id` or `event_id`
- Use public views for public pages (import from `lib/data/public/*`)
- Load permissions before private queries
- Show friendly empty states on RLS failure
- Handle `null` returns gracefully

### ❌ Never Do

- Query base tables on public pages
- Trust `profiles.role` for authorization
- Query org/event data without an active context
- Assume admin without checking `admin_users`
- Throw errors on RLS failures without graceful fallback

## 8. Error & Empty States

### RLS Failure

Show `NoAccessEmptyState` component:
```typescript
import { NoAccessEmptyState } from "@/components/no-access-empty-state"

// In your component
if (!data && error?.code === "PGRST116") {
  return <NoAccessEmptyState />
}
```

Offer:
- Switch org
- Request access
- Contact organizer

### No Membership

Show "You're not part of any organizations yet"

CTA: Create org / Request invite

Use `NoOrgState` component:
```typescript
import { NoOrgState } from "@/components/no-org-state"

if (!permissions?.orgMemberships || permissions.orgMemberships.length === 0) {
  return <NoOrgState />
}
```

## 9. Implementation Checklist

When adding a new page:

- [ ] Determine if public or protected
- [ ] Choose correct data module (`lib/data/public/*` or `lib/data/organizer/*`)
- [ ] For protected routes: add server layout with permission check
- [ ] For org routes: add `.eq("org_id", activeOrgId)` or similar
- [ ] For event routes: check `EVENT_MANAGE` or appropriate action
- [ ] Handle RLS errors gracefully
- [ ] Test with invalid org/event IDs

## 10. Data Module Organization

```
lib/data/
├── public/
│   ├── events.ts          # v_events_public, public event queries
│   ├── categories.ts      # Public category queries
│   └── index.ts
├── organizer/
│   ├── events.ts          # Org-scoped event management
│   ├── orders.ts          # Org-scoped order/sales data
│   └── index.ts
├── protected/
│   ├── event-staff.ts     # Event staff operations
│   └── index.ts
└── permissions-loader.ts  # Loads user permissions from RLS tables
```

**Rule:** Import from the correct module based on route type.

## 11. Summary

Ticketiv's data safety depends on clear separation:

| Table | Role | Boundary |
|-------|------|----------|
| `profiles` | Identity | User defaults |
| `org_members` | Tenant | Organization access |
| `event_staff` | Execution | Event access + org inheritance |
| `admin_users` | Platform | Global authority |

**If the frontend respects these boundaries, Supabase RLS becomes a safety net — not a crutch.**

## Debugging & Development Aids

In non-production, enable debug panel showing:
- `user_id`
- `isGlobalAdmin`
- `activeOrgId`
- Org roles
- Event role (if applicable)

See `lib/providers/permissions-provider.tsx` console logs with `[v0]` prefix.
