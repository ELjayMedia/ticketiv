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

---

## 7) Write-Path Ownership Matrix

This matrix defines **which layer owns each write operation** to prevent race conditions and ensure data consistency.

| Operation | Owner | Enforcement | Idempotency |
|-----------|-------|-------------|-------------|
| **Create Order** | API Route (`/api/orders`) | Service role + RLS | `device_id` + nonce |
| **Create Payment** | API Route (`/api/payments/{provider}`) | Service role | Provider transaction ID |
| **Mint Ticket Code** | Webhook/Job | Service role | Check `ticket_code` IS NULL |
| **Update Payment Status** | Webhook (`/api/payments/{provider}/webhook`) | Verify signature | `payments.id` + `status` transition |
| **Record Scan** | API Route (`/api/scanner/validate`) | Staff auth + device check | `(ticket_code, event_id, scanned_at)` unique |
| **Update Check-in** | Scan API (atomically) | Service role | Compare-and-set on `checked_in_at` |
| **Create Transfer** | Client mutation → API | User owns ticket + not checked in | Transfer ID |
| **Accept Transfer** | API Route (`/api/transfers/accept`) | Recipient auth | Status = pending → completed |
| **Request Refund** | Client mutation → API | User owns order + not checked in | Refund ID |
| **Approve Refund** | Organizer action → API | Organizer auth + service role | Status = pending → approved |
| **Create Payout** | Cron Job / Manual trigger | Service role | Payout batch ID |
| **Update Payout Status** | Webhook (provider) | Verify signature | `payouts.id` + status |
| **Add Event Staff** | Organizer action → API | Org ownership | `(event_id, user_id)` unique |
| **Register Device** | Scanner first use → API | Staff auth | `device_id` unique |

**Key Principles:**

1. **Frontend NEVER writes directly** to:
   - `orders`, `order_items`, `payments`, `ledger_entries`, `payouts`, `refunds`
   - These require service role for atomicity and privilege

2. **Frontend MAY write directly** (via RLS) to:
   - `profiles` (own profile only)
   - `transfers` (create only, if `order_items.owner_id = current_user`)
   - `resale_listings` (create/update own listings)
   - Client must still validate business rules before write

3. **All privileged writes go through API routes** that:
   - Validate permissions with service role
   - Apply business logic (quotas, limits, state transitions)
   - Return success/failure with error codes

---

## 8) State Transition Rules

### 8.1 Order Lifecycle

```
┌─────────┐
│ pending │ ← initial state (cart created)
└────┬────┘
     │ payment initiated
     ↓
┌─────────┐
│ pending │ (payment in flight)
└────┬────┘
     │ webhook received
     ├─→ succeeded → ┌──────┐
     │              │ paid │ (final success state)
     │              └──────┘
     │
     ├─→ failed → ┌────────┐
     │            │ failed │ (can retry payment)
     │            └────────┘
     │
     └─→ timeout → ┌───────────┐
                  │ cancelled │ (can create new order)
                  └───────────┘
```

# From paid state:
```
┌──────┐
│ paid │
└──┬───┘
   │ refund requested + approved
   ↓
┌──────────┐
│ refunded │ (terminal state)
└──────────┘
```

**Allowed transitions:**

| From | To | Trigger | Validation |
|------|----|---------|-----------:|
| `pending` | `paid` | Webhook: payment succeeded | Payment amount matches order total |
| `pending` | `failed` | Webhook: payment failed | None (can retry) |
| `pending` | `cancelled` | User cancels or timeout (15 min) | None |
| `failed` | `pending` | User retries payment | Order not expired |
| `paid` | `refunded` | Refund approved | All tickets not checked in |

**Forbidden transitions:**
- `paid` → `pending` (cannot unpay)
- `refunded` → `paid` (cannot un-refund)
- `cancelled` → `paid` (must create new order)

### 8.2 Payment Lifecycle

```
┌───────────┐
│ initiated │ ← payment record created
└─────┬─────┘
      │ checkout redirect
      ↓
┌─────────┐
│ pending │ (user at provider checkout)
└────┬────┘
     │ webhook/polling
     ├─→ ┌───────────┐
     │   │ succeeded │ (final success)
     │   └───────────┘
     │
     └─→ ┌────────┐
         │ failed │ (can retry or cancel)
         └────────┘
```

**Validation:**
- Only ONE `succeeded` payment per order
- Multiple `failed` attempts allowed
- Webhook must verify signature before state change

### 8.3 Ticket Lifecycle

```
┌────────────┐
│ code=NULL  │ ← order_item created (not minted yet)
└─────┬──────┘
      │ payment succeeded
      ↓
┌────────────────┐
│ code=XXXXXX    │ ← ticket minted (usable)
│ checked_in=NULL│
└───────┬────────┘
        │ scanned at gate
        ├─→ ┌──────────────────┐
        │   │ checked_in != NULL│ (used)
        │   └──────────────────┘
        │
        ├─→ ┌──────────────────┐
        │   │ revoked_at != NULL│ (blocked from use)
        │   └──────────────────┘
        │
        └─→ ┌──────────────────┐
            │ refunded (parent) │ (cannot check in)
            └──────────────────┘
```

**Allowed actions per state:**

| State | Can Check In? | Can Transfer? | Can Refund? |
|-------|--------------|---------------|-------------|
| code=NULL | No (not minted) | No | Yes (cancel order) |
| Minted + unused | Yes | Yes | Yes |
| Checked in | No (already used) | No | No |
| Revoked | No (blocked) | No | Maybe (case-by-case) |
| Refunded (parent) | No | No | Already refunded |

### 8.4 Transfer Lifecycle

```
┌─────────┐
│ pending │ ← transfer initiated by owner
└────┬────┘
     │ recipient accepts
     ├─→ ┌───────────┐
     │   │ completed │ (ownership transferred)
     │   └───────────┘
     │
     ├─→ ┌──────────┐
     │   │ rejected │ (recipient declined)
     │   └──────────┘
     │
     └─→ ┌───────────┐
         │ cancelled │ (sender cancelled)
         └───────────┘
```

**Validation:**
- Ticket must be unused (`checked_in_at` IS NULL)
- Ticket not revoked
- Order status = paid
- No pending transfers exist

### 8.5 Payout Lifecycle

```
┌─────────┐
│ pending │ ← payout batch created
└────┬────┘
     │ submitted to provider
     ↓
┌────────────┐
│ processing │
└─────┬──────┘
      │ webhook/polling
      ├─→ ┌───────────┐
      │   │ completed │ (funds disbursed)
      │   └───────────┘
      │
      └─→ ┌────────┐
          │ failed │ (can retry)
          └────────┘
```

**Validation:**
- Payout amount must match ledger balance
- Cannot payout if negative balance
- Payout account must be verified

---

## 9) Failure & Retry Semantics

### 9.1 Payment Failures

**Scenario:** User completes checkout, but payment fails.

**System behavior:**
1. `payments.status` = `failed`
2. `orders.status` remains `pending` (not `failed`)
3. Frontend shows "Payment Failed" with **Retry** button
4. User can retry with same order ID (idempotent)
5. After 3 failures, offer alternative payment method

**Retry contract:**
- Same `order.id` can have multiple `payments` rows
- Only latest `payments` row matters for order status
- If all payment methods exhausted, order → `cancelled` after timeout

### 9.2 Webhook Failures

**Scenario:** Webhook from payment provider fails to process.

**System behavior:**
1. Webhook handler logs error to `webhooks` table
2. Status = `failed`, `retry_count` incremented
3. Background job retries webhook processing (exponential backoff: 1m, 5m, 15m, 1h)
4. After 5 retries, alert admin + mark `abandoned`

**Idempotency:**
- Webhook handler checks `payments.status` before updating
- If already `succeeded`, skip processing (duplicate webhook)
- Use `payment.provider_transaction_id` as deduplication key

### 9.3 Ticket Minting Failures

**Scenario:** Payment succeeded but ticket code generation fails.

**System behavior:**
1. Background job (`jobs` table) created to mint codes
2. Job retries on failure (max 5 attempts)
3. If persistent failure, alert admin
4. Frontend polls `order_items.ticket_code` until non-null

**Recovery:**
- Admin can manually trigger minting via organizer dashboard
- Ticket codes must be unique (check uniqueness constraint)

### 9.4 Scanner Offline Failures

**Scenario:** Scanner loses internet connection at gate.

**System behavior:**
1. Scanner stores scans locally in IndexedDB
2. Each scan tagged with `synced = false`
3. When connection restored, POST to `/api/scanner/sync`
4. Server validates and inserts scans with `scanned_at` preserved
5. Detect conflicts: if ticket already scanned (race condition), mark as warning

**Validation:**
- Server rejects scans older than 24 hours
- Duplicate scans (same ticket + event + timestamp) are deduplicated

### 9.5 Transfer Acceptance Failures

**Scenario:** Recipient accepts transfer but update fails.

**System behavior:**
1. API route uses transaction to atomically:
   - Update `transfers.status` = `completed`
   - Update `order_items.owner_id` = recipient
2. If transaction fails, rollback and return error
3. Frontend retries on user action (not automatic)

**Validation:**
- Transfer must still be `pending` (no concurrent acceptance)
- Original ticket still unused

---

## 10) Idempotency Guarantees

### 10.1 Order Creation

**Mechanism:** Client-provided idempotency key

```typescript
POST /api/orders
headers: { "X-Idempotency-Key": "{device_id}:{nonce}" }
body: { event_id, items, buyer_info }
```

**Server behavior:**
1. Check if order with this key exists in last 24 hours
2. If exists: return existing order (HTTP 200, not 201)
3. If not: create order, store key in `orders.idempotency_key`
4. Keys expire after 24 hours (cleanup job)

**Edge cases:**
- If order creation fails mid-transaction, key is NOT stored
- Next retry will attempt creation again

### 10.2 Payment Initiation

**Mechanism:** Provider transaction ID

```typescript
POST /api/payments/deltapay/create
body: { order_id, amount_cents }
```

**Server behavior:**
1. Check if `payments` row exists for this `order_id` with status = `pending`
2. If exists: return existing payment reference (idempotent)
3. If not: create new payment, call provider API
4. Store provider's transaction ID as unique key

**Edge cases:**
- If provider API call fails, payment row deleted (rollback)
- Retry creates new payment attempt

### 10.3 Webhook Processing

**Mechanism:** Unique webhook ID + status check

```typescript
POST /api/payments/deltapay/webhook
body: { transaction_id, status, signature }
```

**Server behavior:**
1. Verify signature (reject if invalid)
2. Check `payments.provider_transaction_id` = `transaction_id`
3. Check current `payments.status`:
   - If already `succeeded`: return 200 (already processed)
   - If `pending`: update to `succeeded`, mint tickets, update order
4. Log to `webhooks` table for audit

**Unique constraint:**
```sql
CREATE UNIQUE INDEX idx_scans_dedup 
ON scans(ticket_code, event_id, scanned_at);
```

**Edge cases:**
- Duplicate webhooks (provider retries): safe due to status check
- Webhook arrives before payment creation: queue for retry

### 10.4 Ticket Scan

**Mechanism:** Unique constraint + compare-and-set

```typescript
POST /api/scanner/validate
body: { event_id, ticket_code, device_id, scanned_at }
```

**Server behavior:**
1. Find `order_items` by `ticket_code` + `event_id`
2. Check `checked_in_at`:
   - If NULL: update to `scanned_at`, insert scan record (outcome = `valid`)
   - If NOT NULL: insert scan record (outcome = `already_used`), no update
3. Both operations in same transaction

**Unique constraint:**
```sql
CREATE UNIQUE INDEX idx_scans_dedup 
ON scans(ticket_code, event_id, scanned_at);
```

**Edge cases:**
- Simultaneous scans (2 devices): first wins, second gets `already_used`
- Offline sync with past timestamp: accepted if within 24h

### 10.5 Payout Creation

**Mechanism:** Payout batch ID

```typescript
POST /api/payouts
body: { org_id, amount_cents, payout_account_id }
```

**Server behavior:**
1. Check if pending payout exists for this org
2. If exists: return existing payout (HTTP 200)
3. If not: calculate balance from `ledger_entries`, create payout
4. Payout batch ID = `{org_id}:{date}:{sequence}`

**Edge cases:**
- If balance insufficient: return error (not created)
- Concurrent payout requests: database lock on `organizations` row

---

## 11) Webhook Processing Contract

### 11.1 General Webhook Requirements

All payment provider webhooks must:

1. **Verify Signature**
   - DeltaPay: HMAC-SHA256 with secret key
   - Paystack: X-Paystack-Signature header
   - Reject if signature invalid (HTTP 401)

2. **Idempotency**
   - Check if webhook already processed (see 10.3)
   - Return 200 if duplicate

3. **Atomic Updates**
   - Use database transaction for multi-table updates
   - Rollback on any failure

4. **Error Logging**
   - Log all webhooks to `webhooks` table (success + failure)
   - Include raw payload for debugging

5. **Async Processing**
   - Respond 200 immediately after validation
   - Process heavy operations (minting, emails) in background job

### 11.2 DeltaPay Webhook

**Endpoint:** `POST /api/payments/deltapay/webhook`

**Payload:**
```json
{
  "transaction_id": "TXN_XXXXX",
  "order_id": "order_XXXXX",
  "status": "SUCCESSFUL" | "FAILED",
  "amount": 5000,
  "currency": "SZL",
  "timestamp": "2025-01-15T10:30:00Z",
  "signature": "hmac_signature"
}
```

**Processing steps:**
1. Verify signature using `DELTAPAY_SECRET_KEY`
2. Find `payments` row by `provider_transaction_id`
3. Check current status (idempotency)
4. Update `payments.status`:
   - `SUCCESSFUL` → `succeeded`
   - `FAILED` → `failed`
5. If succeeded:
   - Update `orders.status` = `paid`
   - Queue job: mint ticket codes
   - Insert `ledger_entries` (revenue + fees)
   - Send confirmation email (background)
6. Return 200 with `{received: true}`

**Error handling:**
- If payment not found: log error, return 404
- If signature invalid: return 401
- If processing fails: return 500, webhook will retry

### 11.3 Paystack Webhook

**Endpoint:** `POST /api/payments/paystack/webhook`

**Payload:**
```json
{
  "event": "charge.success",
  "data": {
    "reference": "REF_XXXXX",
    "status": "success",
    "amount": 500000,
    "metadata": {
      "order_id": "order_XXXXX"
    }
  }
}
```

**Processing steps:**
1. Verify `X-Paystack-Signature` header
2. Extract `order_id` from `metadata`
3. Find `payments` row by `provider_transaction_id` = `reference`
4. Same update flow as DeltaPay
5. Return 200

**Event types to handle:**
- `charge.success` → mark succeeded
- `charge.failed` → mark failed
- `transfer.success` → mark payout completed (separate webhook)

### 11.4 Retry Policy

If webhook processing fails (server error, DB down):

1. **Provider retries** (their schedule):
   - Immediate, 1 min, 5 min, 15 min, 1 hour, 6 hours
2. **Our handling:**
   - Log each attempt to `webhooks` table
   - Increment `retry_count`
   - After 5 failed attempts: alert admin
3. **Manual recovery:**
   - Admin can view failed webhooks in dashboard
   - "Replay webhook" button re-processes payload

---

## 12) Implementation Checklist

### 12.1 Database Migrations Needed

- [ ] Add `orders.idempotency_key` (TEXT, index)
- [ ] Add `order_items.owner_id` (UUID, FK to users, nullable)
- [ ] Add `webhooks` table:
  ```sql
  CREATE TABLE webhooks (
    id UUID PRIMARY KEY,
    provider TEXT NOT NULL,
    event_type TEXT,
    payload JSONB NOT NULL,
    signature TEXT,
    status TEXT DEFAULT 'pending',
    retry_count INT DEFAULT 0,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] Add unique index: `idx_scans_dedup` (see 10.4)
- [ ] Add `ledger_entries.payout_id` (FK to payouts)

### 12.2 API Routes to Implement/Update

- [ ] `POST /api/orders` - add idempotency key handling
- [ ] `POST /api/payments/{provider}/webhook` - implement signature verification
- [ ] `POST /api/scanner/sync` - offline scan batch upload
- [ ] `POST /api/transfers/accept` - atomic transfer completion
- [ ] `POST /api/payouts` - payout creation with balance check

### 12.3 Background Jobs Needed

- [ ] `mint-tickets` - generate codes after payment success
- [ ] `process-webhooks` - retry failed webhook processing
- [ ] `expire-orders` - cancel pending orders after 15 min timeout
- [ ] `cleanup-idempotency-keys` - delete keys older than 24h
- [ ] `expire-seat-holds` - release expired seat reservations

### 12.4 Frontend Adapters to Update

- [ ] `lib/data/orders.ts` - add idempotency key to createOrder
- [ ] `lib/data/scanner.ts` - implement offline sync queue
- [ ] `lib/data/tickets.ts` - add transfer acceptance flow
- [ ] Error handling: standardize error shapes across all adapters

---

## Summary

This contract now covers:
- ✅ Entity shapes and table mappings
- ✅ Read/write contracts per route
- ✅ **Write-path ownership matrix** (who owns each write)
- ✅ **State transition rules** (valid state changes)
- ✅ **Failure & retry semantics** (what happens when things break)
- ✅ **Idempotency guarantees** (preventing duplicate operations)
- ✅ **Webhook processing contract** (how external systems integrate)

The contract ensures **frontend and backend cannot drift** by explicitly defining:
- Who can write what (ownership)
- How data flows through states (transitions)
- What happens when operations fail (recovery)
- How to prevent duplicates (idempotency)
- How external systems integrate (webhooks)

Any deviation from this contract is a bug that must be fixed in either frontend or backend.
