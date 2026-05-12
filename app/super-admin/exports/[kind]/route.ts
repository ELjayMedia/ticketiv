import { createAdminClient } from "@/lib/supabase/admin"
import { requireSuperAdmin } from "@/lib/super-admin/auth"
import { csvResponse, rowsToCsv } from "@/lib/super-admin/csv"

const EXPORTS: Record<string, { table: string; columns: string[]; orderBy: string }> = {
  orders: {
    table: "orders",
    columns: ["id", "org_id", "buyer_id", "buyer_email", "buyer_phone", "status", "total_cents", "currency", "channel", "created_at"],
    orderBy: "created_at",
  },
  "ticket-holders": {
    table: "order_items",
    columns: ["id", "order_id", "ticket_type_id", "ticket_code", "status", "holder_name", "holder_email", "holder_phone", "checked_in_at", "created_at"],
    orderBy: "created_at",
  },
  scans: {
    table: "scans",
    columns: ["id", "event_id", "order_item_id", "ticket_code", "outcome", "gate", "device_id", "scanned_at", "notes"],
    orderBy: "scanned_at",
  },
  payouts: {
    table: "payouts",
    columns: ["id", "org_id", "status", "amount_cents", "currency", "provider", "destination_ref", "paid_at", "created_at"],
    orderBy: "created_at",
  },
  refunds: {
    table: "refunds",
    columns: ["id", "payment_id", "status", "type", "amount_cents", "currency", "provider_ref", "initiated_by", "processed_at", "created_at"],
    orderBy: "created_at",
  },
  audit: {
    table: "audit_log",
    columns: ["id", "org_id", "actor_id", "table_name", "record_id", "action", "changes", "created_at"],
    orderBy: "created_at",
  },
}

export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  await requireSuperAdmin()
  const { kind } = await params
  const config = EXPORTS[kind]

  if (!config) {
    return new Response("Unknown export", { status: 404 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from(config.table)
    .select(config.columns.join(","))
    .order(config.orderBy, { ascending: false })
    .limit(5000)

  if (error) {
    return new Response(error.message, { status: 500 })
  }

  const csv = rowsToCsv((data ?? []) as Record<string, unknown>[], config.columns)
  return csvResponse(`ticketiv-${kind}.csv`, csv)
}
