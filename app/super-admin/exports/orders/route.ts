import { createAdminClient } from "@/lib/supabase/admin"
import { makeCsvResponse } from "@/lib/super-admin/exports"
import { requireAdminRole } from "@/lib/super-admin/auth"

const ORDER_EXPORT_ROLES = ["super_admin", "finance_admin", "support_admin"] as const
const ORDER_EXPORT_COLUMNS = ["id", "org_id", "buyer_id", "status", "total_cents", "currency", "channel", "buyer_email", "buyer_phone", "created_at"]

export async function GET() {
  await requireAdminRole([...ORDER_EXPORT_ROLES])
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("orders")
    .select(ORDER_EXPORT_COLUMNS.join(", "))
    .order("created_at", { ascending: false })
    .limit(1000)

  if (error) throw new Error(error.message)

  return makeCsvResponse("ticketiv-orders", ORDER_EXPORT_COLUMNS, (data ?? []) as unknown as Array<Record<string, unknown>>)
}
