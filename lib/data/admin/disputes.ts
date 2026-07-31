// Source: disputes (+ the order/payment it references).

import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"

export type DisputeStatus =
  | "open"
  | "investigating"
  | "awaiting_customer"
  | "resolved"
  | "rejected"

export type DisputeKind =
  | "refund_request"
  | "chargeback"
  | "duplicate_charge"
  | "not_received"
  | "other"

export interface DisputeRow {
  id: string
  org_id: string | null
  order_id: string | null
  payment_id: string | null
  kind: DisputeKind
  status: DisputeStatus
  reason: string | null
  amount_cents: number | null
  currency: string | null
  assigned_to: string | null
  resolution: string | null
  refund_id: string | null
  created_at: string
  resolved_at: string | null
  org_name: string | null
}

export interface DisputeCounts {
  open: number
  investigating: number
  awaiting_customer: number
  unassigned_open: number
  stale_open: number
}

export interface DisputesOverview {
  disputes: DisputeRow[]
  counts: DisputeCounts
}

const EMPTY_COUNTS: DisputeCounts = {
  open: 0,
  investigating: 0,
  awaiting_customer: 0,
  unassigned_open: 0,
  stale_open: 0,
}

export async function getDisputesOverview(): Promise<DisputesOverview> {
  const admin = createAdminClient()

  const [listRes, countsRes] = await Promise.all([
    // `disputes` is newer than the last types/database.ts generation; cast per
    // the repo's convention for untyped tables (see lib/tapband/*).
    (admin.from as any)("disputes")
      .select(
        "id, org_id, order_id, payment_id, kind, status, reason, amount_cents, currency, assigned_to, resolution, refund_id, created_at, resolved_at, organizations(name)",
      )
      // Open work first, then most recent — the queue's job is "what needs me now".
      .order("resolved_at", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: false })
      .limit(100),
    // fn_dispute_counts is service-role-only and not in the generated RPC types.
    (admin.rpc as any)("fn_dispute_counts") as Promise<{ data: DisputeCounts | null }>,
  ])

  const disputes: DisputeRow[] = ((listRes.data ?? []) as any[]).map((d) => ({
    id: d.id,
    org_id: d.org_id,
    order_id: d.order_id,
    payment_id: d.payment_id,
    kind: d.kind,
    status: d.status,
    reason: d.reason,
    amount_cents: d.amount_cents,
    currency: d.currency,
    assigned_to: d.assigned_to,
    resolution: d.resolution,
    refund_id: d.refund_id,
    created_at: d.created_at,
    resolved_at: d.resolved_at,
    org_name: (d.organizations as { name: string } | null)?.name ?? null,
  }))

  return { disputes, counts: countsRes?.data ?? EMPTY_COUNTS }
}
