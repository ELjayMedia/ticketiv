-- Migration: Create admin settlement and payout views
-- Purpose: Provide efficient views for admin operations and settlement processing

-- v_admin_payout_summary: Aggregated payout status for all organizers
CREATE OR REPLACE VIEW v_admin_payout_summary AS
SELECT 
  org.id as org_id,
  org.name as org_name,
  p.status,
  p.amount_cents,
  COUNT(DISTINCT e.id)::int as event_count,
  COALESCE(COUNT(DISTINCT o.id), 0)::int as order_count,
  COALESCE(MAX(p.updated_at), NOW()) as last_updated
FROM orgs org
LEFT JOIN payouts p ON org.id = p.org_id
LEFT JOIN events e ON org.id = e.org_id
LEFT JOIN orders o ON e.id = o.event_id
GROUP BY org.id, org.name, p.status, p.amount_cents, p.updated_at
ORDER BY last_updated DESC;

-- v_admin_audit_summary: Audit log aggregates for admin oversight
CREATE OR REPLACE VIEW v_admin_audit_summary AS
SELECT 
  DATE(created_at) as audit_date,
  action,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id)::int as unique_users,
  COUNT(DISTINCT entity_id)::int as unique_entities
FROM audit_log
GROUP BY DATE(created_at), action
ORDER BY audit_date DESC;

-- Indexes for admin views
CREATE INDEX IF NOT EXISTS idx_payouts_org_id_status ON payouts(org_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
