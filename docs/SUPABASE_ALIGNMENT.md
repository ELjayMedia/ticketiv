# Supabase Backend Alignment Guide

This document clarifies naming conventions and architectural decisions to align the frontend with the Supabase backend schema.

## 1. Tickets vs order_items

### Frontend Assumption (Historical)
- "Tickets" are separate entities with QR codes

### Supabase Reality
- `order_items` ARE the tickets
- Each `order_item` has a `ticket_code` for scanning
- No separate `tickets` table needed

### Implementation
\`\`\`typescript
// Type alias in types/index.ts
export type Ticket = OrderItemRecord

// Usage in code
const tickets: Ticket[] = await getUserTickets(userId)
\`\`\`

**Rule**: Do NOT create a separate `tickets` table. Treat `order_items` as tickets in all frontend code.

## 2. Pricing Engine & Order Adjustments

### Frontend Enhancement
The UI now includes a **Pricing Engine Layer** in `lib/pricing.ts` that maps to:

- `order_adjustments` - Fees, discounts, taxes applied to orders
- `price_rules` - Reusable pricing rules (discounts, fees)
- `price_rule_redemptions` - Tracking when rules are applied

### Key Functions

\`\`\`typescript
// Preview order with all adjustments
await previewOrder({
  items: [{ ticketType, quantity }],
  promoCode: "EARLY20",
  eventId: "evt_123"
})

// Apply promo code (creates order_adjustment)
await applyPromoCodeAdjustment(code, eventId, subtotal)

// Calculate fee adjustments
calculateFeeAdjustments(subtotal, feeConfig)
\`\`\`

### Database Schema (actual)

**order_adjustments**
- `id`, `order_id`, `type`, `scope`
- `label`, `amount_cents`
- `target_order_item_id` (optional), `price_rule_id` (optional link to price_rules)

**price_rules** — coded discounts/fees. A promo code is a `price_rule` with a non-null `code`.
- `id`, `org_id`, `event_id` (nullable), `ticket_type_id` (nullable)
- `code` (nullable), `type` (`absolute_discount` | `percent_discount` | `abs_fee` | `percent_fee` | `tax`)
- `value_numeric`, `applies_to` (`item` | `order`), `channel` (sales_channel[])
- `starts_at`, `ends_at`, `max_redemptions`, `per_user_limit`, `is_active`

**price_rule_redemptions** — one row per redemption; redemption count is derived from this table.
- `id`, `price_rule_id`, `order_id`, `user_id`, `redeemed_at`

> There is **no** `promo_codes` or `promo_code_usage` table. `lib/promo-codes.ts`
> reads `price_rules` / `price_rule_redemptions` directly.

## 3. Demo Mode vs Production

### Current Approach
- Demo mode uses mock data (`lib/demo-data.ts`)
- Production uses Supabase with RLS policies

### Future Enhancement
Instead of purely mock data, leverage Supabase features:

\`\`\`typescript
// Use feature_flags for demo organizations
const demoOrgFlags = await getFeatureFlags(orgId)
if (demoOrgFlags.demo_mode) {
  // Apply demo constraints
}

// Use pricing_plans for free vs paid tiers
const orgPlan = await getPricingPlan(orgId)
if (orgPlan.tier === "free") {
  // Limit features
}
\`\`\`

This allows "demo mode" to become real data with feature constraints rather than completely mocked data.

## 4. Order Creation Flow

### Updated Flow with Adjustments

\`\`\`typescript
// 1. Calculate pricing with adjustments
const preview = await previewOrder({
  items: selectedTickets,
  promoCode: appliedPromo,
  eventId
})

// 2. Create order
const { order, items } = await createOrder({
  event_id: eventId,
  purchaser_id: userId,
  items: selectedTickets
})

// 3. Create order_adjustments
for (const adjustment of preview.adjustments) {
  await createOrderAdjustment({
    order_id: order.id,
    type: adjustment.type,
    label: adjustment.label,
    amount: adjustment.amount,
    price_rule_id: adjustment.priceRuleId
  })
}

// 4. Record price_rule_redemption (if promo applied)
if (priceRuleId) {
  await recordPriceRuleRedemption({
    price_rule_id: priceRuleId,
    order_id: order.id,
    amount_applied: discountAmount
  })
}
\`\`\`

## 5. Type System Alignment

### Core Types
- `OrderItemRecord` - The actual ticket (has ticket_code)
- `Ticket` - Type alias for OrderItemRecord
- `OrderAdjustmentRecord` - Fees, discounts applied to orders
- `PriceRuleRecord` - Reusable pricing rules
- `PriceRuleRedemptionRecord` - Tracking rule applications

### Convention
- Use `Ticket` type in frontend UI code for clarity
- Use `OrderItemRecord` in data layer for Supabase queries
- Always query `order_items` table, never a non-existent `tickets` table

## 6. Migration Checklist

- [x] `PriceRuleRecord` / `PriceRuleRedemptionRecord` types match `price_rules` / `price_rule_redemptions`
- [x] `PromoCodeRecord` / `PromoCodeUsageRecord` kept as aliases to the price-rule types
- [x] `Ticket` type alias resolves to `OrderItemRecord`
- [x] `types/index.ts` aligned to the real schema and the `v_*_public` views
- [ ] Add admin UI for managing `price_rules`
- [ ] Migrate demo mode to use `feature_flags` table

## 7. Documentation Standards

When writing code or documentation:

1. **Refer to tickets as order_items** in comments
2. **Use the Ticket type alias** in UI components
3. **Always mention order_adjustments** when discussing pricing
4. **Link promo codes to price_rules** conceptually

Example:
\`\`\`typescript
// ✅ GOOD: Clear that we're querying order_items
const tickets: Ticket[] = await supabase
  .from("order_items")
  .select("*")
  
// ❌ BAD: Implies a tickets table exists
const tickets = await supabase
  .from("tickets")
  .select("*")
\`\`\`

---

This alignment ensures the frontend architecture matches Supabase's schema design while maintaining clear, frontend-friendly naming conventions.
