# Frontend ↔ Database Contract

**Purpose:** This document is the single source of truth for how the Ticketiv frontend interacts with the Supabase backend. Every screen, every query, every mutation is documented here to prevent schema drift.

**Rules:**
- v0 reads should prefer **views** (stable shapes)
- v0 writes should hit **tables** (normalized) or **RPC functions** (business logic)
- Never let v0 "invent" fields or recompute server-side logic
- TypeScript types generated from DB must compile without errors

---

## Table of Contents

1. [Public Screens (Attendee - Unauthenticated)](#public-screens)
2. [Authenticated Attendee Screens](#authenticated-attendee-screens)
3. [Organizer Screens](#organizer-screens)
4. [Scanner/Staff Screens](#scanner-staff-screens)
5. [RPC Function Catalog](#rpc-function-catalog)
6. [Public API Surface](#public-api-surface)
7. [Schema-to-Screen Coverage Checklist](#schema-to-screen-coverage-checklist)
8. [TypeScript Type Generation](#typescript-type-generation)
9. [Practical Don'ts](#practical-donts)

---

## Public Screens (Attendee - Unauthenticated)

### 1. Home Page (`/`)

**Route:** `app/(public)/page.tsx`

**Data Sources:**
- **View:** `v_events_public` (featured/promoted events)
- **Table:** `venues` (for location data)
- **Table:** `event_dates` (for upcoming dates)

**Select Shape:**
\`\`\`typescript
// Featured events carousel
v_events_public {
  id, slug, title, subtitle, poster_url,
  starts_at, city, venue_name,
  min_price_cents, max_price_cents,
  visibility, is_promoted
}
WHERE visibility = 'public' AND is_promoted = true
ORDER BY starts_at ASC
LIMIT 10

// Category-grouped events
v_events_public {
  id, slug, title, poster_url, starts_at, city, min_price_cents, category
}
WHERE visibility = 'public'
GROUP BY category
\`\`\`

**RLS Expectation:**
- Public read access, no authentication required
- Only `visibility = 'public'` events visible

**Mutations:** None (read-only)

**Errors:**
- Empty state: "No upcoming events. Check back soon!"
- Network error: "Unable to load events. Please refresh."

---

### 2. Browse/Search Events (`/browse`)

**Route:** `app/(public)/browse/page.tsx`

**Data Sources:**
- **View:** `v_events_public` (primary data source)
- **View:** `v_event_sales_public` (optional: for "selling fast" badges)

**Select Shape:**
\`\`\`typescript
v_events_public {
  id, slug, title, poster_url, starts_at, ends_at,
  city, venue_name, venue_id,
  min_price_cents, max_price_cents,
  category, visibility, tags,
  org_name
}
WHERE visibility = 'public'
  AND (title ILIKE '%{query}%' OR city ILIKE '%{query}%')
  AND category = '{category}' (if filter applied)
  AND city = '{city}' (if filter applied)
  AND starts_at >= '{from_date}' AND starts_at <= '{to_date}'
ORDER BY starts_at ASC | min_price_cents ASC (based on sort)
LIMIT 50 OFFSET {page * 50}
\`\`\`

**RLS Expectation:**
- Public read access
- Search filters applied client-side (parameterized queries)

**Mutations:** None (read-only)

**Errors:**
- No results: "No events match your filters. Try adjusting your search."
- Network error: "Search failed. Please try again."

---

### 3. Event Detail Page (`/events/[slug]`)

**Route:** `app/(public)/events/[id]/page.tsx`

**Data Sources:**
- **View:** `v_events_public` (event metadata)
- **Table:** `ticket_types` (available tickets)
- **Table:** `ticket_type_channels` (channel-specific quotas)
- **Table:** `event_dates` (all dates for multi-date events)
- **Table:** `event_artists` + `artists` (lineup)
- **Table:** `venues` (venue details with coordinates)

**Select Shape:**
\`\`\`typescript
v_events_public {
  id, slug, title, subtitle, description,
  poster_url, banner_url, video_url,
  starts_at, ends_at, timezone,
  city, venue_name, venue_address,
  category, tags, age_restriction,
  org_id, org_name, org_logo_url,
  visibility, status
}
WHERE slug = '{slug}' AND visibility = 'public'

// Nested: ticket types with channels
ticket_types {
  id, name, description, price_cents, quota, sold_count,
  per_user_limit, visibility,
  ticket_type_channels (channel, quota, per_order_limit)
}
WHERE event_id = {event_id} AND visibility = 'public'
ORDER BY sort_order ASC

// Nested: event dates
event_dates {
  id, starts_at, ends_at, timezone
}
WHERE event_id = {event_id}
ORDER BY starts_at ASC

// Nested: lineup
event_artists {
  artist_id, role, sort_order,
  artists (name, bio, image_url, genre, social_links)
}
WHERE event_id = {event_id}
ORDER BY sort_order ASC

// Nested: venue
venues {
  id, name, address, city, postal_code,
  capacity, lat, lng, amenities
}
WHERE id = {venue_id}
\`\`\`

**RLS Expectation:**
- Public read on `v_events_public`
- Public read on `ticket_types` where `visibility = 'public'`
- Public read on `venues`, `event_dates`, `event_artists`, `artists`

**Mutations:** None (read-only)

**Errors:**
- Not found: "Event not found or no longer available."
- Sold out: "This event is sold out."
- Upcoming: "Tickets go on sale {sale_starts_at}."

---

### 4. Marketplace (Resale Tickets) (`/marketplace`)

**Route:** `app/(public)/marketplace/page.tsx`

**Data Sources:**
- **View:** `v_resale_listings_public` (active listings)
- **Table:** `order_items` (ticket details)
- **Table:** `ticket_types` (ticket type info)
- **View:** `v_events_public` (event details)

**Select Shape:**
\`\`\`typescript
v_resale_listings_public {
  id, order_item_id, price_cents, original_price_cents,
  listed_at, expires_at, status,
  // Nested from order_items
  ticket_code, ticket_type_id,
  // Nested from ticket_types
  ticket_type_name,
  // Nested from events via order_items
  event_id, event_title, event_slug, event_poster_url,
  event_starts_at, event_city
}
WHERE status = 'active' AND expires_at > NOW()
  AND event_category = '{category}' (if filter applied)
ORDER BY listed_at DESC
LIMIT 50
\`\`\`

**RLS Expectation:**
- Public read on active listings only
- Cannot see seller identity

**Mutations:** None (purchases handled in checkout flow)

**Errors:**
- No listings: "No resale tickets available right now."
- Listing expired: "This listing is no longer available."

---

## Authenticated Attendee Screens

### 5. Checkout Page (`/checkout/[id]`)

**Route:** `app/(app)/checkout/[id]/page.tsx`

**Data Sources:**
- **View:** `v_events_public` (event info for display)
- **Table:** `ticket_types` (validate selections)
- **RPC:** `fn_quote_order` (pricing calculation)
- **RPC:** `fn_preview_pricing` (promo code validation)
- **RPC:** `fn_apply_pricing_to_order` (final price computation)

**Select Shape:**
\`\`\`typescript
// Step 1: Display event info
v_events_public { id, title, poster_url, starts_at, venue_name }
WHERE id = {event_id}

// Step 2: Validate ticket selections
ticket_types { id, price_cents, quota, sold_count, per_user_limit }
WHERE id IN ({selected_ticket_type_ids})

// Step 3: Get pricing quote (RPC call)
fn_quote_order({
  event_id: uuid,
  items: { ticket_type_id: uuid, quantity: int }[],
  promo_code?: string,
  channel: string
}) → {
  subtotal_cents: int,
  adjustments: { type, amount_cents, reason }[],
  total_cents: int,
  breakdown: object
}
\`\`\`

**RLS Expectation:**
- User must be authenticated
- Can only create orders for themselves

**Mutations:**
\`\`\`typescript
// DO NOT call directly from UI - use API route
POST /api/orders
Body: {
  event_id: uuid,
  items: { ticket_type_id: uuid, quantity: int }[],
  buyer_email: string,
  buyer_name: string,
  promo_code?: string,
  channel: 'web'
}
→ API route calls fn_mint_tickets RPC internally
\`\`\`

**Errors:**
- Quota exceeded: "Not enough tickets available. Reduce quantity."
- Promo invalid: "Promo code invalid or expired."
- Payment failed: "Payment failed. Please try again or use a different method."

---

### 6. My Tickets (`/app/tickets`)

**Route:** `app/(app)/tickets/page.tsx`

**Data Sources:**
- **View:** `v_user_tickets` (user's tickets with denormalized event info)
- **Table:** `order_items` (fallback if view doesn't exist)
- **Table:** `orders` (order metadata)
- **View:** `v_events_public` (event details)

**Select Shape:**
\`\`\`typescript
v_user_tickets {
  id, ticket_code, qr_code, seat_label,
  checked_in_at, checked_in_by,
  transferred_at, transfer_status,
  // Nested: order
  order_id, order_number, purchased_at,
  // Nested: ticket type
  ticket_type_id, ticket_type_name, price_cents,
  // Nested: event
  event_id, event_title, event_slug, event_poster_url,
  event_starts_at, event_city, event_venue_name
}
WHERE buyer_id = auth.uid()
ORDER BY event_starts_at DESC

// OR if view doesn't exist:
orders {
  id, order_number, purchased_at, total_cents,
  order_items (
    id, ticket_code, qr_code, checked_in_at,
    ticket_types (name, price_cents),
    events (title, slug, poster_url, starts_at)
  )
}
WHERE buyer_id = auth.uid()
ORDER BY purchased_at DESC
\`\`\`

**RLS Expectation:**
- User can only read their own tickets (`buyer_id = auth.uid()`)
- RLS enforced on `orders` and `order_items` tables

**Mutations:** None (read-only list view)

**Errors:**
- No tickets: "You don't have any tickets yet. Browse events!"
- Load failed: "Unable to load tickets. Please refresh."

---

### 7. Ticket Detail (QR Code) (`/app/tickets/[id]`)

**Route:** `app/(app)/tickets/[id]/page.tsx`

**Data Sources:**
- **Table:** `order_items` (ticket details)
- **View:** `v_events_public` (event info)
- **Table:** `scans` (check-in history)

**Select Shape:**
\`\`\`typescript
order_items {
  id, ticket_code, qr_code, seat_label,
  checked_in_at, checked_in_by,
  transferred_at, revoked_at,
  order_id, ticket_type_id,
  // Nested: order
  orders (order_number, buyer_id, purchased_at),
  // Nested: ticket type
  ticket_types (name, price_cents, description),
  // Nested: event (via order)
  orders.events (
    title, poster_url, starts_at, ends_at,
    city, venue_name, venue_address
  )
}
WHERE id = {ticket_id}
  AND orders.buyer_id = auth.uid()

// Check-in history
scans {
  id, scanned_at, outcome, device_id, notes
}
WHERE ticket_code = {ticket_code}
ORDER BY scanned_at DESC
LIMIT 10
\`\`\`

**RLS Expectation:**
- User can only view tickets they own
- Check-in history visible to ticket owner

**Mutations:**
\`\`\`typescript
// Transfer ticket (via RPC)
fn_initiate_transfer({
  order_item_id: uuid,
  to_email: string,
  message?: string
}) → { transfer_id: uuid, status: string }

// Cancel transfer
UPDATE transfers
SET status = 'cancelled', cancelled_at = NOW()
WHERE order_item_id = {order_item_id}
  AND from_user_id = auth.uid()
  AND status = 'pending'
\`\`\`

**Errors:**
- Not found: "Ticket not found."
- Already checked in: "This ticket has already been used."
- Transferred: "This ticket has been transferred to another user."
- Revoked: "This ticket has been revoked."

---

### 8. Ticket Transfer (`/app/tickets/[id]/transfer`)

**Route:** `app/(app)/tickets/[id]/transfer/page.tsx`

**Data Sources:**
- **Table:** `order_items` (ticket ownership)
- **Table:** `transfers` (existing transfers)
- **RPC:** `fn_ticket_is_transferable` (validation)

**Select Shape:**
\`\`\`typescript
order_items {
  id, ticket_code, checked_in_at, transferred_at,
  ticket_types (name, allows_transfer)
}
WHERE id = {ticket_id}
  AND orders.buyer_id = auth.uid()

// Check transferability
fn_ticket_is_transferable({ticket_id: uuid})
→ { transferable: boolean, reason?: string }

// Existing transfers
transfers {
  id, to_email, status, created_at, accepted_at, message
}
WHERE order_item_id = {ticket_id}
ORDER BY created_at DESC
\`\`\`

**RLS Expectation:**
- User owns the ticket
- Transfer window open (event not started)

**Mutations:**
\`\`\`typescript
// Initiate transfer
INSERT INTO transfers (order_item_id, from_user_id, to_email, message)
VALUES ({ticket_id}, auth.uid(), {email}, {message})
RETURNING id

// Cancel transfer
UPDATE transfers
SET status = 'cancelled'
WHERE id = {transfer_id}
  AND from_user_id = auth.uid()
  AND status = 'pending'
\`\`\`

**Errors:**
- Not transferable: "This ticket type cannot be transferred."
- Already transferred: "This ticket has already been transferred."
- Event started: "Transfers are closed for this event."

---

## Organizer Screens

### 9. Organizer Dashboard (`/dashboard`)

**Route:** `app/(organizer)/dashboard/page.tsx`

**Data Sources:**
- **View:** `mv_event_sales` (materialized: sales KPIs)
- **View:** `mv_revenue_breakdown` (materialized: revenue analysis)
- **View:** `event_summary` (denormalized event list with stats)
- **RPC:** `get_user_orgs` (user's organizations)

**Select Shape:**
\`\`\`typescript
// KPI Cards (aggregate across org)
mv_event_sales {
  total_events, total_tickets_sold, total_revenue_cents, total_checkins
}
WHERE org_id IN (SELECT get_user_orgs())

// Recent events with stats
event_summary {
  event_id, title, slug, poster_url, starts_at,
  total_orders, tickets_sold, revenue_cents, checkins_count,
  status, visibility
}
WHERE org_id IN (SELECT get_user_orgs())
ORDER BY starts_at DESC
LIMIT 10
\`\`\`

**RLS Expectation:**
- User must have organizer role
- Can only see events for their organizations
- RLS policy: `org_id IN (SELECT get_user_orgs())`

**Mutations:** None (read-only dashboard)

**Errors:**
- No org access: "You don't have access to any organizations."
- No events: "No events yet. Create your first event!"

---

### 10. Event Management (`/events`)

**Route:** `app/(organizer)/events/page.tsx`

**Data Sources:**
- **View:** `event_summary` (all org events with stats)
- **Table:** `events` (for direct updates)

**Select Shape:**
\`\`\`typescript
event_summary {
  event_id, title, slug, poster_url,
  starts_at, ends_at, city, venue_name,
  total_orders, tickets_sold, revenue_cents, checkins_count,
  status, visibility, created_at
}
WHERE org_id IN (SELECT get_user_orgs())
ORDER BY starts_at DESC
\`\`\`

**RLS Expectation:**
- Organizers can read/update events in their orgs
- Policy: `is_event_organizer(event_id)`

**Mutations:**
\`\`\`typescript
// Publish event
UPDATE events
SET visibility = 'public', published_at = NOW()
WHERE id = {event_id}
  AND org_id IN (SELECT get_user_orgs())

// Unpublish event
UPDATE events
SET visibility = 'draft'
WHERE id = {event_id}
  AND org_id IN (SELECT get_user_orgs())

// Delete event (soft delete)
UPDATE events
SET status = 'cancelled', cancelled_at = NOW()
WHERE id = {event_id}
  AND org_id IN (SELECT get_user_orgs())
  AND total_orders = 0  -- Prevent deletion if orders exist
\`\`\`

**Errors:**
- Cannot delete: "Cannot delete event with existing orders."
- No permission: "You don't have permission to edit this event."

---

### 11. Event Detail (Organizer) (`/events/[eventId]`)

**Route:** `app/(organizer)/events/[eventId]/page.tsx`

**Data Sources:**
- **Table:** `events` (editable event data)
- **View:** `event_summary` (read-only stats)
- **Table:** `orders` (order list)
- **Table:** `scans` (scan history)
- **View:** `mv_revenue_breakdown` (financial breakdown)

**Tabs & Data Sources:**

#### Tab 1: Overview
\`\`\`typescript
events {
  id, title, slug, description, poster_url, banner_url,
  starts_at, ends_at, timezone, city, venue_id,
  category, tags, age_restriction, status, visibility
}
WHERE id = {event_id}
  AND org_id IN (SELECT get_user_orgs())

event_dates { id, starts_at, ends_at, timezone }
WHERE event_id = {event_id}

ticket_types {
  id, name, description, price_cents, quota, sold_count, per_user_limit
}
WHERE event_id = {event_id}
\`\`\`

#### Tab 2: Orders
\`\`\`typescript
orders {
  id, order_number, buyer_name, buyer_email, purchased_at,
  total_cents, status, payment_status, channel,
  order_items (id, ticket_code, checked_in_at)
}
WHERE event_id = {event_id}
ORDER BY purchased_at DESC
LIMIT 100
\`\`\`

#### Tab 3: Staff
\`\`\`typescript
event_staff {
  id, user_id, role, added_at,
  users (email, full_name)
}
WHERE event_id = {event_id}
ORDER BY added_at DESC
\`\`\`

#### Tab 4: Scanner
\`\`\`typescript
scans {
  id, ticket_code, scanned_at, outcome, device_id, notes,
  order_items (
    ticket_types (name),
    orders (buyer_name)
  )
}
WHERE event_id = {event_id}
ORDER BY scanned_at DESC
LIMIT 100

// Device stats
device_sessions {
  device_id, devices (name), started_at, ended_at,
  (SELECT COUNT(*) FROM scans WHERE device_id = device_sessions.device_id) as scan_count
}
WHERE event_id = {event_id}
\`\`\`

#### Tab 5: Finance
\`\`\`typescript
mv_revenue_breakdown {
  gross_sales_cents, platform_fee_cents, processor_fee_cents,
  refunds_cents, net_revenue_cents
}
WHERE event_id = {event_id}

ledger_entries {
  id, type, amount_cents, balance_impact, created_at, notes
}
WHERE event_id = {event_id}
ORDER BY created_at DESC
\`\`\`

**RLS Expectation:**
- All reads require `is_event_organizer(event_id)` = true
- Orders, scans, ledger filtered by event ownership

**Mutations:**
\`\`\`typescript
// Update event details
UPDATE events
SET title = {title}, description = {description}, ...
WHERE id = {event_id}
  AND org_id IN (SELECT get_user_orgs())

// Add staff member
INSERT INTO event_staff (event_id, user_id, role)
VALUES ({event_id}, {user_id}, {role})

// Remove staff member
DELETE FROM event_staff
WHERE id = {staff_id}
  AND event_id = {event_id}
  AND is_event_organizer({event_id})
\`\`\`

**Errors:**
- No permission: "Access denied."
- Invalid update: "Cannot modify published event without unpublishing first."

---

### 12. Finance Dashboard (`/finance`)

**Route:** `app/(organizer)/finance/page.tsx`

**Data Sources:**
- **View:** `mv_revenue_breakdown` (aggregated financials)
- **Table:** `ledger_entries` (transaction log)
- **Table:** `payouts` (settlement history)
- **Table:** `refunds` (refund requests)

**Select Shape:**
\`\`\`typescript
// KPIs
mv_revenue_breakdown {
  SUM(gross_sales_cents) as total_gross,
  SUM(platform_fee_cents) as total_fees,
  SUM(refunds_cents) as total_refunds,
  SUM(net_revenue_cents) as total_net,
  COUNT(DISTINCT event_id) as events_count
}
WHERE org_id IN (SELECT get_user_orgs())

// Ledger entries
ledger_entries {
  id, type, amount_cents, balance_impact, created_at,
  event_id, order_id, notes,
  events (title)
}
WHERE org_id IN (SELECT get_user_orgs())
ORDER BY created_at DESC
LIMIT 100

// Payouts
payouts {
  id, amount_cents, status, provider, requested_at,
  processed_at, failed_at, failure_reason
}
WHERE org_id IN (SELECT get_user_orgs())
ORDER BY requested_at DESC

// Refunds
refunds {
  id, order_id, amount_cents, reason, status,
  requested_at, approved_at, approved_by,
  orders (order_number, buyer_name, event_id)
}
WHERE org_id IN (SELECT get_user_orgs())
ORDER BY requested_at DESC
\`\`\`

**RLS Expectation:**
- Organizers can only see ledger/payouts/refunds for their org
- Policy: `org_id IN (SELECT get_user_orgs())`

**Mutations:**
\`\`\`typescript
// Request payout
INSERT INTO payouts (org_id, amount_cents, provider, status)
VALUES ({org_id}, {amount}, 'deltapay', 'pending')
RETURNING id

// Approve refund (requires admin role)
UPDATE refunds
SET status = 'approved', approved_at = NOW(), approved_by = auth.uid()
WHERE id = {refund_id}
  AND is_org_admin((SELECT org_id FROM orders WHERE id = order_id))
\`\`\`

**Errors:**
- Insufficient balance: "Insufficient balance for payout."
- Pending payout: "A payout is already in progress."

---

### 13. Device Management (`/devices`)

**Route:** `app/(organizer)/devices/page.tsx`

**Data Sources:**
- **Table:** `devices` (registered devices)
- **Table:** `device_sessions` (session history)
- **View:** `v_device_stats` (per-device scan counts)

**Select Shape:**
\`\`\`typescript
devices {
  id, device_id, name, status, last_seen_at, created_at,
  org_id, added_by
}
WHERE org_id IN (SELECT get_user_orgs())
ORDER BY last_seen_at DESC

// Device sessions
device_sessions {
  id, device_id, event_id, started_at, ended_at,
  events (title, starts_at),
  (SELECT COUNT(*) FROM scans WHERE device_id = device_sessions.device_id) as scan_count
}
WHERE device_id = {device_id}
ORDER BY started_at DESC

// Device stats (aggregated)
v_device_stats {
  device_id, today_scans, total_scans, events_scanned
}
WHERE device_id = {device_id}
\`\`\`

**RLS Expectation:**
- Organizers can manage devices in their org
- Policy: `org_id IN (SELECT get_user_orgs())`

**Mutations:**
\`\`\`typescript
// Revoke device
UPDATE devices
SET status = 'revoked', revoked_at = NOW()
WHERE device_id = {device_id}
  AND org_id IN (SELECT get_user_orgs())

// Activate device
UPDATE devices
SET status = 'active', revoked_at = NULL
WHERE device_id = {device_id}
  AND org_id IN (SELECT get_user_orgs())
\`\`\`

**Errors:**
- Device not found: "Device not registered."
- Already revoked: "Device is already revoked."

---

## Scanner/Staff Screens

### 14. Scanner Console (`/scan`)

**Route:** `app/(scanner)/scan/page.tsx`

**Data Sources:**
- **View:** `v_scannable_events` (events staff can scan)
- **RPC:** `fn_check_in` (validate ticket)
- **RPC:** `scanner_mark_checkin` (record scan)

**Select Shape:**
\`\`\`typescript
// Events staff can scan
v_scannable_events {
  event_id, title, starts_at, venue_name, total_tickets
}
WHERE EXISTS (
  SELECT 1 FROM event_staff
  WHERE event_id = events.id
    AND user_id = auth.uid()
    AND role IN ('scanner', 'organizer')
)
ORDER BY starts_at ASC

// Scan history (today)
scans {
  id, ticket_code, scanned_at, outcome, notes,
  order_items (
    ticket_types (name),
    orders (buyer_name)
  )
}
WHERE event_id = {selected_event_id}
  AND scanned_at::date = CURRENT_DATE
ORDER BY scanned_at DESC
LIMIT 50
\`\`\`

**RLS Expectation:**
- Staff can only scan events they're assigned to
- Policy: `user_has_event_role(event_id, ARRAY['scanner', 'organizer'])`

**Mutations:**
\`\`\`typescript
// Validate & check in ticket (RPC)
fn_check_in({
  ticket_code: string,
  event_id: uuid,
  device_id: string
}) → {
  success: boolean,
  outcome: 'valid' | 'invalid' | 'used' | 'wrong_event' | 'revoked',
  ticket: { buyer_name, ticket_type, seat_label },
  message: string
}

// Fallback: direct insert (if RPC unavailable)
INSERT INTO scans (
  event_id, ticket_code, outcome, device_id, scanned_at
)
VALUES ({event_id}, {ticket_code}, 'valid', {device_id}, NOW())
\`\`\`

**Errors:**
- Invalid ticket: "Ticket not found or invalid."
- Already used: "This ticket was already scanned at {time}."
- Wrong event: "This ticket is for a different event."
- Revoked: "This ticket has been revoked."

---

## RPC Function Catalog

### Checkout & Pricing

| Function | Purpose | Input | Output |
|----------|---------|-------|--------|
| `fn_quote_order` | Calculate order total with fees | `{event_id, items[], promo_code?, channel}` | `{subtotal_cents, adjustments[], total_cents}` |
| `fn_preview_pricing` | Preview promo code discount | `{event_id, items[], promo_code}` | `{discount_cents, final_total}` |
| `fn_apply_pricing_to_order` | Apply pricing rules to order | `{order_id, price_rule_id?}` | `{order_adjustments[]}` |
| `fn_get_my_order_totals` | User's order history totals | `{user_id}` | `{orders[], total_spent}` |

### Tickets

| Function | Purpose | Input | Output |
|----------|---------|-------|--------|
| `fn_mint_tickets` | Create tickets after payment | `{order_id}` | `{ticket_codes[], qr_codes[]}` |
| `fn_ticket_is_transferable` | Check if ticket can be transferred | `{ticket_id}` | `{transferable: bool, reason?}` |
| `verify_ticket_signature` | Verify QR code signature | `{ticket_code, signature}` | `{valid: bool}` |

### Check-in

| Function | Purpose | Input | Output |
|----------|---------|-------|--------|
| `fn_check_in` | Validate & check in ticket | `{ticket_code, event_id, device_id}` | `{outcome, ticket_info, message}` |
| `scanner_mark_checkin` | Record scan in logs | `{ticket_code, event_id, device_id, outcome}` | `{scan_id}` |

### Auth & Authorization

| Function | Purpose | Input | Output |
|----------|---------|-------|--------|
| `current_user_org_ids` | Get user's organization IDs | None | `uuid[]` |
| `get_user_orgs` | Get user's organizations | None | `{org_id, name, role}[]` |
| `user_has_org_role` | Check if user has org role | `{org_id, role}` | `boolean` |
| `is_event_organizer` | Check if user is event organizer | `{event_id}` | `boolean` |
| `is_org_admin` | Check if user is org admin | `{org_id}` | `boolean` |
| `user_has_event_role` | Check if user has event role | `{event_id, roles[]}` | `boolean` |

---

## Public API Surface

### Public (No Auth Required)

**Tables:**
- None (use views only)

**Views:**
- `v_events_public` - Published events
- `v_event_sales_public` - Public sales stats (if needed)
- `v_resale_listings_public` - Active resale listings

**Tables (read-only via RLS):**
- `venues` - Location data
- `artists` - Performer info
- `event_artists` - Lineup
- `event_dates` - Event schedule

### Authenticated User

**Tables (RLS: user owns data):**
- `orders` (WHERE `buyer_id = auth.uid()`)
- `order_items` (via `orders.buyer_id`)
- `transfers` (WHERE `from_user_id = auth.uid()` OR `to_user_id = auth.uid()`)

**Views:**
- `v_user_tickets` - User's tickets with event info
- `v_user_orders` - User's order history

**RPC:**
- `fn_quote_order` - Pricing preview
- `fn_get_my_order_totals` - Order history

### Organizer/Staff

**Tables (RLS: org/event access):**
- `events` (WHERE `org_id IN (SELECT get_user_orgs())`)
- `ticket_types`, `ticket_type_channels` (via event ownership)
- `event_staff` (WHERE `is_event_organizer(event_id)`)
- `ledger_entries` (via org ownership)
- `payouts` (via org ownership)
- `refunds` (via org ownership)
- `devices` (via org ownership)
- `device_sessions` (via device ownership)
- `scans` (WHERE `user_has_event_role(event_id, ARRAY['scanner', 'organizer'])`)

**Views:**
- `event_summary` - Denormalized event list with stats
- `mv_event_sales` - Sales KPIs (materialized)
- `mv_revenue_breakdown` - Financial breakdown (materialized)
- `v_scannable_events` - Events staff can scan
- `v_device_stats` - Per-device scan counts

**RPC:**
- `fn_check_in` - Ticket validation
- `scanner_mark_checkin` - Scan logging
- `is_event_organizer`, `is_org_admin`, `user_has_event_role` - Authorization checks

### Admin Only (Service Role)

**Direct table access via API routes:**
- `payments`, `payment_attempts` - Payment processing
- `ledger_entries` - Financial transactions (writes)
- `payouts` - Payout processing (writes)
- Raw table writes requiring atomicity

---

## Schema-to-Screen Coverage Checklist

### Attendee Screens

| Screen | Primary Data Source | Secondary Sources | Write Path |
|--------|---------------------|-------------------|------------|
| Home | `v_events_public` | `venues`, `event_dates` | None |
| Browse | `v_events_public` | `v_event_sales_public` | None |
| Event Detail | `v_events_public` | `ticket_types`, `event_artists`, `venues` | None |
| Checkout | `fn_quote_order` RPC | `ticket_types`, `price_rules` | `POST /api/orders` |
| My Tickets | `v_user_tickets` OR `orders` + `order_items` | `scans` (history) | None |
| Ticket Detail | `order_items` | `scans`, `transfers` | Transfer: `INSERT transfers` |
| Marketplace | `v_resale_listings_public` | `order_items`, `ticket_types` | None |

### Organizer Screens

| Screen | Primary Data Source | Secondary Sources | Write Path |
|--------|---------------------|-------------------|------------|
| Dashboard | `mv_event_sales`, `event_summary` | None | None |
| Event Management | `event_summary` | None | `UPDATE events` |
| Event Detail | `events` | `orders`, `scans`, `ledger_entries` | `UPDATE events`, `INSERT event_staff` |
| Finance | `mv_revenue_breakdown` | `ledger_entries`, `payouts`, `refunds` | `INSERT payouts`, `UPDATE refunds` |
| Devices | `devices` | `device_sessions`, `v_device_stats` | `UPDATE devices` |

### Scanner Screens

| Screen | Primary Data Source | Secondary Sources | Write Path |
|--------|---------------------|-------------------|------------|
| Scanner Console | `v_scannable_events` | `scans` (history) | `fn_check_in` RPC |

**Coverage Status:**
- ✅ All attendee screens mapped
- ✅ All organizer screens mapped
- ✅ Scanner flow mapped
- ⚠️ Admin screens not yet built (payouts approval, org management)

---

## TypeScript Type Generation

### Setup

1. **Install Supabase CLI:**
   \`\`\`bash
   npm install supabase --save-dev
   \`\`\`

2. **Generate types:**
   \`\`\`bash
   npx supabase gen types typescript --project-id {project_id} > types/database.ts
   \`\`\`

3. **Import in code:**
   \`\`\`typescript
   import { Database } from '@/types/database'
   
   type Event = Database['public']['Tables']['events']['Row']
   type EventInsert = Database['public']['Tables']['events']['Insert']
   type EventUpdate = Database['public']['Tables']['events']['Update']
   \`\`\`

4. **Type-safe queries:**
   \`\`\`typescript
   const { data } = await supabase
     .from('events')
     .select('id, title, starts_at')
     .eq('visibility', 'public')
   
   // data is inferred as Event[] automatically
   \`\`\`

### Regeneration Triggers

Run type generation whenever:
- New table added
- Column added/removed/renamed
- View definition changed
- RPC function signature changed

**CI/CD Integration:**
\`\`\`yaml
# .github/workflows/types.yml
- name: Generate Supabase Types
  run: npx supabase gen types typescript --project-id ${{ secrets.SUPABASE_PROJECT_ID }} > types/database.ts
  
- name: Check for type errors
  run: npm run type-check
\`\`\`

---

## Practical Don'ts

### ❌ DON'T: Let v0 query raw financial tables directly

**Wrong:**
\`\`\`typescript
const { data } = await supabase
  .from('payments')
  .select('*')
  .eq('order_id', orderId)
\`\`\`

**Right:**
\`\`\`typescript
// Use view or RPC
const { data } = await supabase
  .from('mv_revenue_breakdown')
  .select('*')
  .eq('event_id', eventId)
\`\`\`

**Why:** `payments`, `ledger_entries`, `payouts` contain sensitive data. Use views that aggregate and sanitize.

---

### ❌ DON'T: Update `checked_in_at` directly

**Wrong:**
\`\`\`typescript
await supabase
  .from('order_items')
  .update({ checked_in_at: new Date() })
  .eq('ticket_code', code)
\`\`\`

**Right:**
\`\`\`typescript
// Use RPC
const { data } = await supabase.rpc('fn_check_in', {
  ticket_code: code,
  event_id: eventId,
  device_id: deviceId
})
\`\`\`

**Why:** Check-in requires:
- Validation (is ticket valid?)
- Logging (`scans` table)
- Device tracking (`device_sessions`)
- Atomic operation (prevent double scans)

---

### ❌ DON'T: Recompute pricing in UI

**Wrong:**
\`\`\`typescript
const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0)
const platformFee = subtotal * 0.05
const total = subtotal + platformFee
\`\`\`

**Right:**
\`\`\`typescript
const { data } = await supabase.rpc('fn_quote_order', {
  event_id: eventId,
  items: items.map(i => ({ ticket_type_id: i.id, quantity: i.qty }))
})
const total = data.total_cents
\`\`\`

**Why:** Pricing rules, promo codes, dynamic fees, taxes are server-side only. UI must always call RPC.

---

### ❌ DON'T: Do joins that views already provide

**Wrong:**
\`\`\`typescript
const { data } = await supabase
  .from('events')
  .select(`
    *,
    venues(*),
    ticket_types(*),
    event_artists(*, artists(*))
  `)
  .eq('slug', slug)
\`\`\`

**Right:**
\`\`\`typescript
const { data } = await supabase
  .from('v_events_public')
  .select('*')
  .eq('slug', slug)
  .single()

// Then fetch related data separately if needed
\`\`\`

**Why:** Views like `v_events_public`, `event_summary`, `v_user_tickets` already have optimized joins. Don't duplicate.

---

### ❌ DON'T: Create orders from UI

**Wrong:**
\`\`\`typescript
const { data: order } = await supabase
  .from('orders')
  .insert({ event_id, buyer_id, total_cents })
  .select()
  .single()

const { data: items } = await supabase
  .from('order_items')
  .insert(items.map(i => ({ order_id: order.id, ticket_type_id: i.id })))
\`\`\`

**Right:**
\`\`\`typescript
// Call API route
const response = await fetch('/api/orders', {
  method: 'POST',
  body: JSON.stringify({ event_id, items, buyer_email })
})
\`\`\`

**Why:** Order creation requires:
- Atomic transaction (orders + order_items + order_adjustments)
- Payment processing
- Ticket minting (QR codes, signatures)
- Ledger entries
- Service role privileges

---

### ❌ DON'T: Expose service role key to client

**Wrong:**
\`\`\`typescript
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY)
\`\`\`

**Right:**
\`\`\`typescript
// Client-side
const supabase = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

// Server-side only (API routes, RSC)
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY)
\`\`\`

**Why:** Service role bypasses RLS. Only use in trusted server contexts.

---

## Update Log

| Date | Author | Changes |
|------|--------|---------|
| 2025-01-XX | v0 | Initial contract created |
| 2025-01-XX | v0 | Added write-path ownership, state transitions, idempotency |

---

**End of Frontend ↔ Database Contract**
