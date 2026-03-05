# Data Layer Refactor: Example Implementation

## Example 1: Refactoring Public Events List

### Before (Direct Table Read)
```typescript
// lib/data/public/events.ts
export async function getPublicEvents(params?: {
  limit?: number
  city?: string
  sort?: "date" | "price"
}): Promise<EventSummary[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  // Direct table query - requires client-side filtering
  let query = supabase
    .from("events")
    .select(`
      id, title, slug, category, city,
      venues(id, name, address),
      ticket_types(price_cents, currency),
      event_dates(starts_at)
    `)
    .eq("visibility", "public")

  // Apply filters manually
  if (params?.city) {
    query = query.ilike("city", `%${params.city}%`)
  }

  // Manual pagination
  const limit = params?.limit || 24
  const offset = 0
  query = query.range(offset, offset + limit - 1)

  const { data, error } = await query
  if (error) throw error
  
  // Client-side transformations
  return data?.map(e => ({
    id: e.id,
    title: e.title,
    // ... 20 more fields to map manually
  })) || []
}
```

### After (View-Based Adapter)
```typescript
// lib/adapters/events.ts
export async function getPublicEventsList(params?: {
  limit?: number
  offset?: number
  city?: string
  sort?: "soonest" | "price_low" | "price_high"
}): Promise<EventsPublicView[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    let query = supabase.from("v_events_public").select("*")

    // Declarative filtering
    if (params?.city) {
      query = query.ilike("city", `%${params.city}%`)
    }

    // Query optimization via view
    const orderColumn = params?.sort === "price_low" ? "min_price_cents" : "starts_at"
    query = query.order(orderColumn, { ascending: params?.sort === "price_low" })

    // Pagination
    const limit = params?.limit || 24
    const offset = params?.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error("[v0] Error fetching public events:", error)
      return []
    }

    // Type-safe validation
    return (data || []).map(item => 
      validateSchema(EventsPublicViewSchema, item, "v_events_public")
    )
  } catch (error) {
    console.error("[v0] Exception in getPublicEventsList:", error)
    return []
  }
}
```

### Benefits
- **Database handles aggregation** - min/max prices, venue joins
- **Single query** - No N+1 problem
- **Type-safe** - Zod validates response shape
- **Graceful errors** - Returns empty array, logs to console
- **Easier testing** - Mock adapter instead of Supabase client

---

## Example 2: Refactoring Organizer Dashboard

### Before (Multiple Queries + Joins)
```typescript
// lib/data/organizer/dashboard.ts
export async function getOrganizerDashboard(orgId: string) {
  const supabase = await createServerSupabaseClient()

  // Query 1: Get all events
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("org_id", orgId)

  // Query 2: Get all orders
  const { data: orders } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .in("event_id", events?.map(e => e.id) || [])

  // Query 3: Get payouts
  const { data: payouts } = await supabase
    .from("payouts")
    .select("*")
    .eq("org_id", orgId)

  // Manual aggregation in JavaScript
  const totalRevenue = orders?.reduce(
    (sum, o) => sum + o.order_items.reduce((s, i) => s + i.total_cents, 0),
    0
  ) || 0

  const totalAttendees = new Set(
    orders?.map(o => o.user_id) || []
  ).size

  return {
    totalEvents: events?.length || 0,
    upcomingEvents: events?.filter(e => new Date(e.starts_at) > new Date()).length || 0,
    totalRevenue,
    totalAttendees,
    pendingPayouts: payouts?.filter(p => p.status === "pending").reduce((s, p) => s + p.amount_cents, 0) || 0,
  }
}
```

### After (Single View Query)
```typescript
// lib/adapters/organizer-events.ts
export async function getOrganizerDashboardStats(
  orgId: string
): Promise<OrganizerDashboardView | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  try {
    // Single query - database does all aggregation
    const { data, error } = await supabase
      .from("v_organizer_dashboard")
      .select("*")
      .eq("org_id", orgId)
      .single()

    if (error) {
      console.error("[v0] Error fetching dashboard stats:", error)
      return null
    }

    if (!data) return null
    return validateSchema(OrganizerDashboardViewSchema, data, "v_organizer_dashboard")
  } catch (error) {
    console.error("[v0] Exception in getOrganizerDashboardStats:", error)
    return null
  }
}
```

### Benefits
- **3 queries → 1 query** - Massive latency reduction
- **JavaScript aggregation → SQL aggregation** - Faster calculations
- **No N+1 risk** - View handles all joins
- **Consistent logic** - All rules in database (not scattered in code)
- **Easier caching** - Single view result can be cached

---

## Example 3: Adding Error Handling

### Pattern: Graceful Degradation
```typescript
// All adapters follow this pattern
export async function getEventOrders(
  eventId: string,
  params?: { limit?: number }
): Promise<EventOrdersView[]> {
  const supabase = await createServerSupabaseClient()
  
  // Graceful: Return empty array if Supabase unavailable
  if (!supabase) {
    console.warn("[v0] Supabase not configured, returning empty orders list")
    return []
  }

  try {
    let query = supabase.from("v_event_orders").select("*")

    // Apply filters safely
    if (eventId) {
      query = query.eq("event_id", eventId)
    }

    const limit = params?.limit || 50
    query = query.range(0, limit - 1)

    const { data, error } = await query

    // Graceful: Log and return empty if query fails
    if (error) {
      console.error("[v0] Error fetching event orders:", error)
      return []
    }

    // Graceful: Handle null data
    if (!data) return []

    // Validate each item - catches schema drift early
    return data.map(item => 
      validateSchema(EventOrdersViewSchema, item, "v_event_orders")
    )
  } catch (error) {
    // Graceful: Catch unexpected errors
    console.error("[v0] Exception in getEventOrders:", error)
    return []
  }
}
```

### Usage in Components
```typescript
// components/dashboard/OrdersList.tsx
export async function OrdersList({ eventId }: { eventId: string }) {
  // Never crashes - always returns array
  const orders = await getEventOrders(eventId)

  if (orders.length === 0) {
    return <EmptyState message="No orders yet" />
  }

  return (
    <table>
      {orders.map(order => (
        <tr key={order.order_id}>
          <td>{order.buyer_email}</td>
          <td>{order.total_cents / 100}</td>
        </tr>
      ))}
    </table>
  )
}
```

---

## Migration Workflow

### Step 1: Create View
```sql
-- scripts/001-create-organizer-views.sql
CREATE OR REPLACE VIEW v_organizer_events AS
SELECT 
  e.id, e.title, e.slug, e.status,
  COUNT(DISTINCT oi.id) as ticket_sales,
  COALESCE(SUM(oi.unit_price_cents * oi.quantity), 0)::int as revenue_cents
FROM events e
LEFT JOIN order_items oi ON e.id = oi.event_id
GROUP BY e.id;
```

### Step 2: Add TypeScript Schema
```typescript
// lib/schemas/views.ts
export const OrganizerEventsViewSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  ticket_sales: z.number().int(),
  revenue_cents: z.number().int(),
})

export type OrganizerEventsView = z.infer<typeof OrganizerEventsViewSchema>
```

### Step 3: Create Adapter
```typescript
// lib/adapters/organizer-events.ts
export async function getOrganizerEventsList(orgId: string) {
  // Implementation here
}
```

### Step 4: Update Components
```typescript
// Before
import { getOrganizerEvents } from "@/lib/data/organizer/events"

// After
import { getOrganizerEventsList } from "@/lib/adapters/organizer-events"
```

### Step 5: Test
- [ ] Query runs without errors
- [ ] Data matches expected schema
- [ ] Error handling works (test offline mode)
- [ ] Performance improved (check query time)
