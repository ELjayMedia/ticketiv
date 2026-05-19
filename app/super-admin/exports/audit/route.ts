import { createAdminClient } from "@/lib/supabase/admin"
import { makeCsvResponse } from "@/lib/super-admin/exports"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { ADMIN_ROLE_TIERS } from "@/lib/super-admin/permissions"

const AUDIT_EXPORT_COLUMNS = ["id", "org_id", "actor_id", "table_name", "record_id", "action", "created_at"]

export async function GET() {
  await requireAdminRole(ADMIN_ROLE_TIERS)
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("audit_log")
    .select(AUDIT_EXPORT_COLUMNS.join(", "))
    .order("created_at", { ascending: false })
    .limit(1000)

  if (error) throw new Error(error.message)

  return makeCsvResponse("ticketiv-audit", AUDIT_EXPORT_COLUMNS, (data ?? []) as Array<Record<string, unknown>>)
}
