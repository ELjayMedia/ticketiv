import { RoutingScreen } from "@/components/quiet/screens/admin/routing"
import { getRoutingOverview } from "@/lib/data/admin/routing"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { ADMIN_ROLE_TIERS } from "@/lib/super-admin/permissions"

export const metadata = { title: "Providers & routing | Super Admin" }
export const dynamic = "force-dynamic"

export default async function SuperAdminRoutingPage() {
  await requireAdminRole(ADMIN_ROLE_TIERS)
  const overview = await getRoutingOverview()
  return <RoutingScreen overview={overview} />
}
