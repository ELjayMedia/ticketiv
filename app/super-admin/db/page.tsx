import { DBScreen } from "@/components/quiet/screens/admin/db"
import { getDBOverview } from "@/lib/data/admin/db"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { ADMIN_ROLE_TIERS } from "@/lib/super-admin/permissions"

export const metadata = { title: "DB · Supabase | Super Admin" }
export const dynamic = "force-dynamic"

export default async function SuperAdminDBPage() {
  await requireAdminRole(ADMIN_ROLE_TIERS)
  const overview = await getDBOverview()
  return <DBScreen overview={overview} />
}
