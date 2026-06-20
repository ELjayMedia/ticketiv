import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { rowsToCsv, csvResponse } from "@/lib/super-admin/csv"

// TICK-58 — Reconciliation CSV exports with date-range filtering
// Gated on finance_admin or super_admin. Provider references included for Paystack reconciliation.

const FINANCE_ROLES = ["super_admin", "finance_admin"] as const

type ExportConfig = {
  table: string
  columns: string[]
  dateColumn: string
  // Columns that get a /100 SZL companion added automatically
  moneyColumns?: string[]
}

const EXPORTS: Record<string, ExportConfig> = {
  orders: {
    table: "orders",
    columns: ["id", "org_id", "buyer_id", "buyer_email", "buyer_phone", "status", "total_cents", "currency", "channel", "created_at"],
    dateColumn: "created_at",
    moneyColumns: ["total_cents"],
  },
  payments: {
    table: "payments",
    // `ext_payment_id` is the provider transaction reference (needed to match
    // Paystack settlement lines). The raw `payload` is intentionally excluded
    // — it's the full provider response and may carry authorization/card data.
    columns: ["id", "order_id", "provider", "status", "amount_cents", "currency", "ext_payment_id", "created_at"],
    dateColumn: "created_at",
    moneyColumns: ["amount_cents"],
  },
  refunds: {
    table: "refunds",
    columns: ["id", "payment_id", "status", "type", "amount_cents", "currency", "provider_ref", "initiated_by", "processed_at", "created_at"],
    dateColumn: "created_at",
    moneyColumns: ["amount_cents"],
  },
  payouts: {
    table: "payouts",
    columns: ["id", "org_id", "status", "amount_cents", "currency", "provider", "destination_ref", "paid_at", "created_at"],
    dateColumn: "created_at",
    moneyColumns: ["amount_cents"],
  },
  ledger: {
    table: "ledger_entries",
    columns: ["id", "org_id", "event_id", "order_id", "payment_id", "refund_id", "payout_id", "type", "amount_cents", "currency", "occurred_at"],
    dateColumn: "occurred_at",
    moneyColumns: ["amount_cents"],
  },
  "ticket-holders": {
    table: "order_items",
    columns: ["id", "order_id", "ticket_type_id", "ticket_code", "status", "holder_name", "holder_email", "holder_phone", "checked_in_at", "created_at"],
    dateColumn: "created_at",
  },
  audit: {
    table: "audit_log",
    columns: ["id", "org_id", "actor_id", "table_name", "record_id", "action", "changes", "created_at"],
    dateColumn: "created_at",
  },
}

function addSzlColumns(rows: Record<string, unknown>[], moneyColumns: string[]) {
  return rows.map((row) => {
    const out = { ...row }
    for (const col of moneyColumns) {
      const cents = typeof row[col] === "number" ? row[col] as number : null
      const szlKey = col.replace("_cents", "_szl")
      out[szlKey] = cents !== null ? (cents / 100).toFixed(2) : ""
    }
    return out
  })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ kind: string }> },
) {
  try {
    await requireAdminRole([...FINANCE_ROLES])
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { kind } = await params
  const config = EXPORTS[kind]
  if (!config) {
    return new NextResponse("Unknown export type", { status: 404 })
  }

  const from = req.nextUrl.searchParams.get("from")
  const to = req.nextUrl.searchParams.get("to")

  const admin = createAdminClient()
  let query = admin
    .from(config.table as any)
    .select(config.columns.join(","))
    .order(config.dateColumn, { ascending: false })
    .limit(50_000)

  if (from) {
    query = query.gte(config.dateColumn, `${from}T00:00:00.000Z`)
  }
  if (to) {
    query = query.lte(config.dateColumn, `${to}T23:59:59.999Z`)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let rows = (data ?? []) as unknown as Record<string, unknown>[]

  // Add SZL decimal companion columns for money fields
  const moneyColumns = config.moneyColumns ?? []
  if (moneyColumns.length > 0) {
    rows = addSzlColumns(rows, moneyColumns)
  }

  // Build output columns (insert SZL column after each cents column)
  let outputColumns = [...config.columns]
  for (const col of moneyColumns) {
    const idx = outputColumns.indexOf(col)
    if (idx !== -1) {
      const szlKey = col.replace("_cents", "_szl")
      outputColumns.splice(idx + 1, 0, szlKey)
    }
  }

  const csv = rowsToCsv(rows, outputColumns)
  const dateSuffix = new Date().toISOString().slice(0, 10)
  const rangeSuffix = from && to ? `-${from}-to-${to}` : from ? `-from-${from}` : to ? `-to-${to}` : ""

  return csvResponse(`ticketiv-${kind}${rangeSuffix}-${dateSuffix}.csv`, csv)
}
