# Ticketiv Permission Model

This document defines the current Phase 1 access model for Ticketiv. It should be treated as the reference for routing, UI visibility, backend actions and Supabase policy reviews.

## Authentication baseline

Ticketiv currently uses Supabase Auth with email-based sign-in. Client-side UI may guide the journey, but sensitive operations must be verified again on the server through session checks, role lookups or trusted route handlers.

## Primary personas and roles

| Persona | Role source | Purpose | Primary surfaces |
| --- | --- | --- | --- |
| Public visitor | No session | Browse public published events. | Public home, event detail, checkout entry. |
| Attendee | Supabase user session | Buy tickets and view owned tickets. | Checkout, My Tickets, ticket detail. |
| Organizer owner/admin | `org_members.role` | Manage organization events and operational setup. | Organizer dashboard, event management, guestlists. |
| Event staff/scanner | `event_staff`, devices and sessions | Validate tickets for assigned events. | Scanner console and scan APIs. |
| Platform admin | `admin_users.role_tier` | Operate the internal platform command centre. | `/super-admin/*`. |
| Service role | Server-only Supabase key | Execute trusted backend workflows. | Route handlers, server actions, webhooks, jobs. |

## Platform admin tiers

| Admin tier | Intended use | Generic mutation access | Workflow access |
| --- | --- | --- | --- |
| `super_admin` | Full platform owner/operator. | All admin resources. | All workflows, exports and env controls. |
| `finance_admin` | Finance review and settlement support. | No raw finance table mutation; finance workflows only. | Payout workflow actions, finance views, relevant exports. |
| `support_admin` | Customer/order support. | Support resources such as orders, order items, transfers, waitlists. | Order/support visibility and orders export. |
| `event_ops_admin` | Event operations and access control. | Event, ticket, guestlist, scan and device resources. | Publish/archive events, ticket sales controls, scanner device assignment. |
| `read_only_admin` | Oversight and review. | None. | Read-only admin visibility, audit review. |

The canonical code reference for admin tiers and generic resource mutation boundaries is `lib/super-admin/permissions.ts`.

## Access boundaries

### Public browsing

Public event browsing must only expose published buyer-facing event information. Public queries must not expose private attendee, organizer finance, order, payment or audit data.

### Attendee account

Attendees may only view tickets and orders they own or are explicitly authorized to manage. QR codes must only be shown for valid issued tickets and must block revoked, refunded, transferred or already checked-in states where applicable.

### Organizer access

Organizer users are scoped by organization membership. Event management routes must verify that:

1. the user has a valid Supabase session;
2. the event belongs to the requested organization; and
3. the user has an allowed organizer management role.

Current organizer management roles are defined in `lib/org-management.ts`.

### Scanner access

Scanner access must be scoped to assigned events through staff/device/session checks. Valid scans should update ticket state and write scan records; invalid and duplicate scans should be logged and surfaced clearly.

### Platform admin access

Platform admin surfaces use the `admin_users` table and `role_tier` values. The `/super-admin` shell requires an active admin user. Sensitive child pages and server actions must still check the specific role tier required for that action.

### Finance controls

Finance users should not directly mutate sensitive finance tables through generic CRUD. Finance actions should go through audited server workflows such as payout lifecycle transitions. Payout status changes are guarded by valid state transitions and optimistic concurrency checks.

### Trusted backend-only operations

The following operations must remain server-side/trusted only:

- order creation and payment completion;
- ticket minting after confirmed payment;
- payment verification and webhook processing;
- event publish/archive actions;
- ticket sales status actions;
- guestlist fulfilment and complimentary ticket minting;
- payout lifecycle transitions;
- CSV exports;
- environment-variable management;
- audit log insertion.

Client UI can request these actions, but server routes/actions must independently verify session, role and scope.

## Audit and observability

Auditable operations should write to `audit_log` with actor, organization, table/entity, record and business action metadata where available. The admin audit viewer, jobs monitor and webhooks monitor provide operational visibility without exposing raw database access.

## Security review status

The current Supabase security advisor state has no SQL/RLS findings outstanding from the recent hardening pass. The remaining known advisor warning is Supabase Auth leaked password protection being disabled, which is an Auth configuration setting rather than a SQL migration.

## Closure criteria for Phase 1

TICK-14 can be considered complete when:

- public, attendee, organizer, scanner and platform admin boundaries are documented;
- role tiers are implemented and referenced from server-side checks;
- sensitive workflows are explicitly server-side/trusted;
- Supabase advisor SQL/RLS findings are resolved or documented;
- any remaining Auth configuration warning is recorded for manual dashboard action.
