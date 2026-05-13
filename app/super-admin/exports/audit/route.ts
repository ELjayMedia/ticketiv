import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { requireSuperAdmin } from "@/lib/super-admin/auth"

function cell(value: unknown) {
  if (value === null || value === undefined) return ""
  return `"${String(value).replaceAll('"', '""')}"`
}

export async function GET() {
  await requireSuperAdmin()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("audit_log")
    .select("id, org_id, actor_id, table_name, record_id, action, created_at")
    .order("created_at", { ascending: false })
    .limit(1000)

  if (error) throw new Error(error.message)

  const columns = ["id", "org_id", "actor_id", "table_name", "record_id", "action", "created_at"]
  const rows = [columns.join(","), ...(data ?? []).map((row) => columns.map((column) => cell(row[column as keyof typeof row])).join(","))]

  return new NextResponse(rows.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="ticketiv-audit-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
