import { DisputesScreen } from "@/components/quiet/screens/admin/disputes"
import { getDisputesOverview } from "@/lib/data/admin/disputes"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { ADMIN_ROLE_TIERS } from "@/lib/super-admin/permissions"

export const metadata = { title: "Disputes | Super Admin" }
export const dynamic = "force-dynamic"

export default async function SuperAdminDisputesPage() {
  await requireAdminRole(ADMIN_ROLE_TIERS)
  const overview = await getDisputesOverview()
  return <DisputesScreen overview={overview} />
}
