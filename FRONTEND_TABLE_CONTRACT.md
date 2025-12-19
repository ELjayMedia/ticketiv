# FRONTEND ↔ TABLE CONTRACT (Ticketiv)

## 0) Conventions

### 0.1 Terminology

**Ticket** = `order_items` row (not a separate `tickets` table).
A ticket is "minted" when `order_items.ticket_code` exists.

**Order** = `orders` parent row + `order_items` children + `payments` rows.

**Organizer** = user with `profiles.role = 'organizer'` and/or membership in `event_staff` for specific events.

### 0.2 Required foreign keys / identity

- **Current user id**: `auth.users.id`
- **Org scope**: `organizations.id` (referenced by many tables via `org_id`)
- **Event scope**: `events.id`

### 0.3 Client data access rules (RLS expectations)

Frontend must assume:

- `anon`/`authenticated` use `NEXT_PUBLIC_SUPABASE_ANON_KEY` and rely on RLS.
- `service_role` is server-only and used only in API routes for privileged actions.

---

## 1) Canonical Entities (Frontend Types ↔ Tables)

### 1.1 PublicEvent

**Source tables**
- `events`
- `event_dates`
- `venues`
- optional: `event_artists` + `artists` (for lineup summary)
- optional: `storage.objects` (poster/cover)

**Frontend shape (suggested)**
```typescript
{
  id: string
  slug: string
  title: string
  description: string
  visibility: string
  status: string
  primary_date: {
    starts_at: string
    ends_at: string
  }
  venue: {
    name: string
    city: string
    address: string
  }
  image_url: string
  min_price_cents: number
}
```

### 1.2 TicketType

**Source tables**
- `ticket_types`
- `ticket_type_channels` (channel-specific quota / per-order limits)

**Frontend shape**
```typescript
{
  id: string
  event_id: string
  name: string
  price_cents: number
  currency: string
  quota: number
  per_user_limit: number
  is_reserved_seating: boolean
  channels: Array<{
    channel: string
    quota: number
    per_order_limit: number
  }>
}
```

### 1.3 Order (Buyer view)

**Source tables**
- `orders` (parent)
- `order_items` (children)
- `payments`
- `order_adjustments` (fees/discounts)
- optional: `refunds`

**Frontend shape**
```typescript
{
  id: string
  status: string
  channel: string
  total_cents: number
  currency: string
  items: Array<OrderItem>
  adjustments: Array<Adjustment>
  payment_status: string
  provider: string
}
```

### 1.4 Ticket (Buyer view)

**Source table**
- `order_items`

**Frontend shape**
```typescript
{
  id: string
  ticket_code: string
  checked_in_at: string | null
  holder_name: string
  holder_email: string
  holder_phone: string
  seat_id: string | null
  event_id: string
}
```

### 1.5 Scan (Staff view)

**Source tables**
- `scans`
- `devices`, `device_sessions`

**Frontend shape**
```typescript
{
  id: string
  event_id: string
  ticket_code: string
  outcome: 'valid' | 'invalid' | 'already_used' | 'wrong_event' | 'revoked'
  scanned_at: string
  device_id: string
  device_session_id: string
}
```

### 1.6 Organizer Finance

**Source tables**
- `ledger_entries`
- `pricing_plans`
- `payouts`
- `payout_accounts`
- `refunds` (optional)

---

## 2) Route ↔ Data Contracts (Reads/Writes)

### 2.1 Public Discovery

#### Route: `/` Home

**Reads**
- Featured/published events: `events` + `event_dates` + `venues`
- Optional: promoted logic via `events` fields or `feature_flags`/config

**Contract**
- Only published/visible events are returned for public.
- Each event must include one "primary date" (soonest upcoming).

**Suggested adapter**
```typescript
getPublicEvents({ promoted?: boolean, limit?: number })
```

#### Route: `/browse`

**Reads**
- `events` + `event_dates` + `venues`
- optional filters: category/city/date-range
- optional: min price from `ticket_types`

**Contract**

Server supports filtering:
- city, category
- `starts_at >= now` (default)
- text search on title/venue/city (optional)
- Pagination contract: page, pageSize, total (or cursor)

**Suggested adapter**
```typescript
searchEvents({ q, city, category, dateFrom, dateTo, sort, page })
```

#### Route: `/events/[id]` (Event Details)

**Reads**
- `events`
- `event_dates` (all dates)
- `venues`
- `ticket_types`
- `ticket_type_channels` (availability per channel)
- `event_artists` + `artists` (lineup)

**Contract**

Return ticket types with availability summary:
- `remaining = quota - sold_count` (computed)
- channel caps applied if `ticket_type_channels` exists

Reserved seating:
- if `ticket_types.is_reserved_seating = true`, include seat map availability pointers (see 2.4)

**Suggested adapters**
```typescript
getEventById(id)
getEventTicketTypes(eventId, channel)
getEventLineup(eventId)
```

### 2.2 Checkout & Orders

#### Route: `/checkout/[eventId]`

**Writes (create draft order)**
- `orders` (status = pending)
- `order_items` (one row per ticket requested; ticket_code may be minted later)
- `order_adjustments` (fees/discounts calculated)
- `price_rule_redemptions` if promo applied (optional; can be written on payment success instead)

**Reads**
- `ticket_types` (price, currency, limits)
- `ticket_type_channels` (quota/per-order)
- `price_rules` (promo validation)
- `pricing_plans` (platform fees rules per org)

**Contract**

The create-order API must be idempotent per client attempt (use `device_id` + client nonce).

Enforce:
- per-user limit (`ticket_types.per_user_limit`)
- per-order limit (`ticket_type_channels.per_order_limit`)
- quota (global or channel quota)

Must return:
- `order.id`
- `amount_due_cents`
- line items and adjustments
- `currency`

**Suggested API**
```typescript
POST /api/orders
input: event_id, {ticket_type_id, qty}, buyer info, channel, optional promo_code
output: order, pricing_breakdown
```

#### Payment: `/api/payments/{provider}/create`

**Writes**
- `payments` (status initiated/pending)
- `webhooks` (later, on callback receipt; server-only)
- `ledger_entries` (on success: revenue + fees + settlement entries)

**Contract**

Payment create returns:
- provider checkout URL / reference id
- `order_id`

Payment verify (webhook or polling) sets:
- `payments.status = succeeded|failed`
- `orders.status = paid|failed|cancelled`

On success:
- mint ticket codes (see 2.3)
- create ledger entries
- mark promo redemption (if delayed)

### 2.3 Tickets ("My Tickets")

#### Route: `/app/tickets`

**Reads**
- `orders` where `buyer_id = current_user` AND `status = paid`
- `order_items` children
- join: `events`, `event_dates`, `venues`, `ticket_types`

**Contract**

Return only tickets owned by user:
- `order_items` must be linked to user via `orders.buyer_id`
- Each ticket includes:
  - `ticket_code` (required)
  - event title/date/venue summary

**Suggested adapter**
```typescript
getMyTickets()
```

#### Route: `/app/tickets/[orderItemId]`

**Reads**
- `order_items` by id
- parent `orders` to confirm ownership
- event summary joins

**Contract**
- If user does not own the ticket: return 404 or "Not authorized"
- If `checked_in_at` not null: show "Used" state

#### Ticket Minting (server-side)

**Writes**
- Update `order_items.ticket_code` (and possibly store QR artifact in storage)

**Contract**

Ticket codes must be:
- unique
- non-guessable
- deterministic or random with uniqueness guaranteed

Mint happens:
- immediately after payment success
- or during webhook processing

**Tables**
- `order_items` (ticket_code)
- optional: `storage.objects` (PDF/PKPass exports)

### 2.4 Reserved Seating (If enabled)

#### Route: Event seating selection (part of `/events/[id]` or `/checkout/[id]`)

**Reads**
- `seat_maps` (schema JSON)
- `seats` (seat labels)
- `seat_reservations` (active holds)
- `seat_holds` (temporary group hold)

**Writes**
- `seat_holds` (hold_code + expiry)
- `seat_reservations` (user → seat lock with expiry)
- `order_items.seat_id` assigned on order creation

**Contract**

Holds must expire reliably:
- `seat_holds.expires_at`
- `seat_reservations.expires_at`

UI must treat seat as unavailable if:
- reservation active and not owned by current user
- hold active (if used)

### 2.5 Scanner / Staff

#### Route: `/scan`

**Reads**
- `events` accessible to staff
- `event_staff` to determine which events user can scan
- `devices` & `device_sessions` for device pairing / tracking (optional but recommended)

**Writes**
- `device_sessions` start/end (on login/logout or session start)
- `scans` insert on each scan attempt
- `order_items.checked_in_at` update when valid scan

**Validation contract**

Input: `{event_id, ticket_code, device_id, gate?}`

Output states:
- `VALID_FIRST_USE`
- `VALID_ALREADY_USED`
- `INVALID_CODE`
- `INVALID_EVENT`
- `REVOKED`
- `REFUNDED/CANCELLED` (if applicable)

Must be safe for offline:
- if offline, queue scans locally, sync later to `/api/scanner/sync`

**Tables**
- `scans`
- `order_items`
- `devices`, `device_sessions`
- optional: `jobs` for sync processing

### 2.6 Organizer Workspace

#### Route: `/dashboard` (Organizer)

**Reads**
- `events` where `org_id = my org`
- KPI aggregates from:
  - `orders` (paid count)
  - `ledger_entries` (gross/net)
  - `scans` (check-ins)

**Contract**

Must return:
- last 30 days sales
- tickets sold
- gross revenue
- check-ins

Access is org-scoped (RLS) and/or staff-scoped (`event_staff`)

#### Route: `/events` (Organizer list)

**Reads**
- `events` scoped by org
- `event_dates` for next date
- computed counts:
  - orders paid
  - scans count

**Writes**
- none (read screen)

#### Route: `/events/[eventId]` (Organizer tabs)

**Tab: Overview**
- Reads: `events`, `event_dates`, `venues`, `ticket_types`, `ticket_type_channels`

**Tab: Orders / Guest list**
- Reads: `orders` by event, `order_items` joins, `payments`, `refunds` (optional), `guestlist_entries`, `guestlist_fulfillments`

**Tab: Staff**
- Reads/Writes: `event_staff` (add/remove roles), `devices` (register)

**Tab: Scanner**
- Reads: `scans` by event, per-device/per-session aggregates

**Tab: Finance / Payouts**
- Reads/Writes: `ledger_entries`, `payout_accounts`, `payouts`

**Contract**

All tabs must enforce:
- organizer owns event via `events.org_id`
- or user is staff via `event_staff`

### 2.7 Promo Codes / Price Rules

#### Route: `/api/promo-codes/validate`

**Reads**
- `price_rules` (validity windows, applies_to)
- existing redemptions: `price_rule_redemptions`

**Writes**
- (optional on validate) reserve redemption
- (preferred) write redemption on payment success: `price_rule_redemptions`

**Contract**

Validate must return:
- `is_valid`
- `type` (discount/fee/tax)
- computed discount amount for the cart

Must enforce:
- `starts_at`/`ends_at`
- channel rules
- per-user usage if implemented

### 2.8 Transfers (Ticket handover)

#### Route: "Transfer ticket" (from My Ticket)

**Writes**
- `transfers` row created:
  - `order_item_id`
  - `from_user_id`
  - `to_user_id` or recipient email flow
  - `status = pending`
  - optional `listing_expires_at`, `price_cents`

**Contract**

Ticket transfer must not be allowed if:
- `order_items.checked_in_at` is set
- `order_items.revoked_at` is set
- order refunded/cancelled

Acceptance updates ownership model (choose one):
- update `orders.buyer_id` linkage model (not ideal if order has multiple items), or
- store owner per `order_items` (recommended if not already)

If `order_items` does not currently have `owner_id`, you'll want to add it (or implement a view) to support true per-ticket ownership.

---

## 3) Data Adapter Contracts (Demo vs Production)

**Rule**

All adapters return identical shapes, regardless of data source.

**Example adapters**
- `getPublicEvents()`
- `getEventById()`
- `createOrder()`
- `getMyTickets()`
- `validateTicketScan()`
- `getOrganizerDashboardKpis()`

**Contract**

Demo mode:
- returns mock objects matching production schema shapes

Production mode:
- uses Supabase queries with RLS, or API routes where service role required

---

## 4) Minimal Views You Should Consider (Optional but clean)

To keep frontend queries simpler, consider creating DB views:

- `v_public_events` - events joined to next event_date + venue + poster url
- `v_my_tickets` - order_items joined to orders + event summary
- `v_event_kpis` - aggregates orders/ledger/scans per event

These reduce join duplication and standardize shapes.

---

## 5) Error & State Contracts (UI must handle)

### Payment states
- `payments.status`: `initiated` | `pending` | `succeeded` | `failed`
- `orders.status`: `pending` | `paid` | `failed` | `cancelled` | `refunded`

### Ticket states
- **valid unused**: `checked_in_at` is null and `revoked_at` is null
- **used**: `checked_in_at` not null
- **revoked**: `revoked_at` not null

### Scanner outcomes (from `scans.outcome`)

Define canonical outcomes and keep UI consistent:
- `valid`
- `already_used`
- `invalid_code`
- `wrong_event`
- `revoked`
- `refunded`

---

## 6) Quick "Screen ↔ Tables" Index

| Screen | Tables |
|--------|--------|
| **Home/Browse** | `events`, `event_dates`, `venues`, `ticket_types`, `storage.objects` |
| **Event Details** | + `artists`, `event_artists`, `ticket_type_channels` |
| **Checkout** | `orders`, `order_items`, `order_adjustments`, `price_rules`, `payments` |
| **My Tickets** | `orders`, `order_items`, `events`, `venues`, `event_dates` |
| **Scanner** | `scans`, `order_items`, `devices`, `device_sessions`, `event_staff` |
| **Organizer Dashboard** | `events`, `orders`, `ledger_entries`, `scans` |
| **Organizer Finance** | `ledger_entries`, `pricing_plans`, `payouts`, `payout_accounts`, `refunds` |
| **Guestlist** | `guestlist_entries`, `guestlist_fulfillments` |
| **Transfers** | `transfers`, `order_items` |

---

## Implementation Notes

### Current Status

The Ticketiv frontend already implements most of these contracts through:

1. **Data Adapter Layer** (`lib/data/events.ts`, `lib/data/orders.ts`)
   - Unified interface for demo and production modes
   - Automatic switching based on Supabase configuration

2. **Type Definitions** (`types/index.ts`)
   - Complete TypeScript interfaces for all entities
   - Aligned with Supabase table schemas

3. **API Routes** (`app/api/*`)
   - Server-side operations using service role
   - Webhook handling for payments
   - Scanner validation endpoints

4. **UI Components**
   - Mobile + Desktop responsive patterns
   - Role-based access controls
   - Real-time state management

### Next Steps for Full Alignment

1. **Add Database Views** (Section 4)
   - Create `v_public_events` for simplified event queries
   - Create `v_my_tickets` for user ticket views
   - Create `v_event_kpis` for organizer dashboards

2. **Enhance Order Items Ownership**
   - Consider adding `owner_id` to `order_items` for transfer support
   - Update RLS policies to support per-ticket ownership

3. **Implement Idempotency Keys**
   - Add `device_id` + nonce tracking to prevent duplicate orders
   - Store in `orders` table or separate `idempotency_keys` table

4. **Standardize Error Handling**
   - Ensure all adapters return consistent error shapes
   - Add error boundary components for graceful degradation

This document serves as the contract between frontend code and Supabase schema, ensuring consistent data handling across all user flows.
