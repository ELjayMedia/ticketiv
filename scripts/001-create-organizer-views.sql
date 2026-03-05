-- Migration: Create organizer event management views
-- Purpose: Provide efficient views for organizers to query their events and analytics
-- This migration creates views with pre-aggregated data to avoid expensive joins

-- v_organizer_events: List events belonging to an organizer with key metrics
CREATE OR REPLACE VIEW v_organizer_events AS
SELECT 
  e.id,
  e.org_id,
  e.title,
  e.slug,
  e.status,
  e.starts_at,
  v.name as venue_name,
  COALESCE(COUNT(DISTINCT oi.id), 0)::int as ticket_sales,
  COALESCE(SUM(oi.unit_price_cents * oi.quantity), 0)::int as revenue_cents,
  COALESCE(COUNT(DISTINCT CASE WHEN oi.checked_in_at IS NOT NULL THEN oi.id END), 0)::int as attendance_count
FROM events e
LEFT JOIN venues v ON e.venue_id = v.id
LEFT JOIN order_items oi ON e.id = oi.event_id AND oi.status = 'completed'
GROUP BY e.id, e.org_id, e.title, e.slug, e.status, e.starts_at, v.name
ORDER BY e.starts_at DESC;

-- v_event_orders: All orders for a specific event (for organizer)
CREATE OR REPLACE VIEW v_event_orders AS
SELECT 
  o.id as order_id,
  oi.id as order_item_id,
  e.id as event_id,
  u.email as buyer_email,
  u.full_name as buyer_name,
  tt.name as ticket_type_name,
  oi.quantity,
  oi.unit_price_cents,
  (oi.unit_price_cents * oi.quantity) as total_cents,
  COALESCE((oi.unit_price_cents * oi.quantity * 0.02)::int, 0) as fee_cents,
  oi.status,
  o.created_at as ordered_at,
  p.method as payment_method
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN events e ON oi.event_id = e.id
JOIN ticket_types tt ON oi.ticket_type_id = tt.id
JOIN users u ON o.user_id = u.id
LEFT JOIN payments p ON o.id = p.order_id
ORDER BY o.created_at DESC;

-- v_organizer_dashboard: Dashboard overview for an organizer
CREATE OR REPLACE VIEW v_organizer_dashboard AS
SELECT 
  e.org_id,
  COUNT(DISTINCT e.id)::int as total_events,
  COUNT(DISTINCT CASE WHEN e.starts_at > NOW() THEN e.id END)::int as upcoming_events,
  COALESCE(SUM(oi.unit_price_cents * oi.quantity), 0)::int as total_revenue_cents,
  COALESCE(COUNT(DISTINCT oi.user_id), 0)::int as total_attendees,
  COALESCE(SUM(CASE WHEN p.status = 'pending' THEN p.amount_cents ELSE 0 END), 0)::int as pending_payouts_cents
FROM orgs org
LEFT JOIN events e ON org.id = e.org_id
LEFT JOIN order_items oi ON e.id = oi.event_id AND oi.status = 'completed'
LEFT JOIN payouts p ON org.id = p.org_id
GROUP BY org.id;

-- v_checkout_summary: Minimalist view for payment processing
CREATE OR REPLACE VIEW v_checkout_summary AS
SELECT 
  o.id as order_id,
  e.id as event_id,
  e.title as event_title,
  oi.ticket_type_id,
  tt.name as ticket_type_name,
  oi.quantity,
  oi.unit_price_cents,
  (oi.unit_price_cents * oi.quantity) as subtotal_cents,
  COALESCE((oi.unit_price_cents * oi.quantity * 0.02)::int, 0) as fee_cents,
  (oi.unit_price_cents * oi.quantity) + COALESCE((oi.unit_price_cents * oi.quantity * 0.02)::int, 0) as total_cents,
  e.currency
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN events e ON oi.event_id = e.id
JOIN ticket_types tt ON oi.ticket_type_id = tt.id
WHERE o.status = 'pending'
LIMIT 1;

-- Indexes for view performance
CREATE INDEX IF NOT EXISTS idx_organizer_events_org_id ON events(org_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_event_id ON order_items(event_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
