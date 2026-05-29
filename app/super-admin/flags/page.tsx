import { FeatureFlagsScreen } from "@/components/quiet/screens/admin/feature-flags"
import { getPlatformFlags } from "@/lib/data/admin/feature-flags"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { ADMIN_ROLE_TIERS } from "@/lib/super-admin/permissions"

export const metadata = { title: "Feature flags | Super Admin" }
export const dynamic = "force-dynamic"

export default async function SuperAdminFeatureFlagsPage() {
  const { roleTier } = await requireAdminRole(ADMIN_ROLE_TIERS)
  const flags = await getPlatformFlags()
  return <FeatureFlagsScreen flags={flags} canAct={roleTier !== "read_only_admin"} />
}
