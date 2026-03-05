# Data Layer Refactor: Migration Guide

## Overview

This document guides the migration from direct table reads to view-based adapters. The refactor improves performance, maintainability, and enforces separation of concerns.

## Architecture

### Layers
```
UI Components
    ↓
Data Layer Modules (/lib/data/*)
    ↓
Adapters (/lib/adapters/*)
    ↓
Database Views (Supabase)
    ↓
Physical Tables
```

### Key Principles
- **Views** = Pre-aggregated, optimized SQL queries (no mutations)
- **Adapters** = TypeScript wrappers around views (queries + validation)
- **Schemas** = Zod definitions for type safety and runtime validation
- **Error Handling** = Graceful degradation (return empty/null, log to console)

## Existing Adapters

### Public
- `getPublicEventsList()` - Paginated event listing
- `getPublicEventBySlug()` - Single event detail
- `getPublicOrganizersList()` - Organizer directory
- `getPublicOrganizerById()` - Single organizer
- `getPublicArtistsList()` - Artist directory
- `getMyTickets()` - User's purchased tickets

### Organizer
- `getOrganizerEventsList()` - Events for an org
- `getEventOrders()` - Orders for an event
- `getOrganizerDashboardStats()` - Dashboard overview

### Admin
- `getAdminPayoutSummary()` - Payout aggregates
- `getOrganizerPayoutStatus()` - Single org payout
- `getSettlementMetrics()` - Overall settlement stats

### Checkout
- `getCheckoutSummary()` - Order summary for payment
- `validateOrderOwnership()` - Verify user owns order

## Migration Checklist

### Phase 1: Direct Replacements (Low Risk)
Replace these directly - they already have adapters:

- [ ] `/lib/data/public/events.ts` → Use `getPublicEventsList()`, `getPublicEventBySlug()`
- [ ] `/lib/data/public/organisers.ts` → Use `getPublicOrganizersList()`, `getPublicOrganizerById()`
- [ ] `/lib/data/public/artists.ts` → Use `getPublicArtistsList()`
- [ ] `/lib/data/attendee/tickets.ts` → Use `getMyTickets()`

**Pattern:**
```typescript
// Old
const { data } = await supabase.from("events").select("*")

// New
import { getPublicEventsList } from "@/lib/adapters/events"
const data = await getPublicEventsList()
```

### Phase 2: View-Based Replacements (Medium Risk)
Refactor to use new views and adapters:

- [ ] `/lib/data/organizer/events.ts` → Use `getOrganizerEventsList()`
- [ ] `/lib/data/organizer/orders.ts` → Use `getEventOrders()`, `getCheckoutSummary()`
- [ ] `/lib/data/admin/settlement.ts` → Use `getAdminPayoutSummary()`

**Pattern:**
```typescript
// Old - Multiple table joins
const { data } = await supabase
  .from("events")
  .select("*, orders(*), tickets(*)")

// New - Single view query
import { getOrganizerEventsList } from "@/lib/adapters/organizer-events"
const data = await getOrganizerEventsList(orgId)
```

### Phase 3: Transaction Operations (High Risk)
These require RPC functions (not included in this refactor):

- `/lib/data/attendee/orders.ts` - CREATE/UPDATE operations
- `/lib/data/attendee/refunds.ts` - Refund processing
- `/lib/data/payments.ts` - Payment recording

**Action:** Keep as-is for now. Future: Create RPCs for mutations.

## Testing Strategy

1. **Schema Validation**
   - Run `validateSchema()` in development
   - Check Zod error logs in console

2. **Query Performance**
   - Compare query times before/after
   - Monitor Supabase query execution logs

3. **Data Correctness**
   - Verify row counts match
   - Spot-check calculations (totals, sums, counts)

4. **Error Handling**
   - Test with Supabase offline
   - Verify graceful degradation (empty arrays, null returns)

## SQL Setup

Before using adapters, run these migrations:

```bash
# Execute in Supabase SQL Editor
1. scripts/001-create-organizer-views.sql
2. scripts/002-create-admin-views.sql
```

Verify views exist:
```sql
SELECT table_name FROM information_schema.views 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

## Performance Gains

### Before
- Multiple queries per page (N+1 problem)
- Data transfer: full rows with unrequired columns
- Logic scattered across multiple files

### After
- Single view query per operation
- Optimized SELECT (only needed columns)
- Aggregations in database (SUM, COUNT, etc.)

**Expected:** 40-60% reduction in API calls and response times.

## Troubleshooting

### "View does not exist"
- Verify migrations were run
- Check Supabase SQL logs for errors
- Ensure correct role/permissions

### "Schema validation failed"
- Check view column names match schema definition
- Run view query manually in SQL editor
- Compare JSON structure

### "Graceful degradation not working"
- Ensure try/catch wraps each adapter call
- Check console.error logs for root cause
- Add [v0] prefix for debugging

## Future Improvements

1. **Caching** - Add Redis layer for frequently accessed views
2. **RLS Policies** - Add row-level security filters to views
3. **RPCs** - Create Postgres functions for mutations
4. **Hooks** - Create React hooks wrapping adapters (useOrganizerEvents, etc.)
5. **Monitoring** - Add metrics for query performance tracking
