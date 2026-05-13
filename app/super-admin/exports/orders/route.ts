import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { requireSuperAdmin } from "@/lib/super-admin/auth"

function csvEscape(value: unknown) {
  if (value === null || value === undefined) return ""
  const text = typeof value === "object" ? JSON.stringify(value) : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

export async function GET() {
  await requireSuperAdmin()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("orders")
    .select("id, org_id, buyer_id, status, total_cents, currency, channel, buyer_email, buyer_phone, created_at")
    .order("created_at", { ascending: false })
    .limit(1000)

  if (error) throw new Error(error.message)

  const columns = ["id", "org_id", "buyer_id", "status", "total_cents", "currency", "channel", "buyer_email", "buyer_phone", "created_at"]
  const rows = [columns.join(","), ...(data ?? []).map((row) => columns.map((column) => csvEscape(row[column as keyof typeof row])).join(","))]

  return new NextResponse(rows.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="ticketiv-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
