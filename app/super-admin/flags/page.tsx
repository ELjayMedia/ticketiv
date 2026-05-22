import { FeatureFlagsScreen } from "@/components/quiet/screens/admin/feature-flags"
import { getPlatformFlags } from "@/lib/data/admin/feature-flags"

export const metadata = { title: "Feature flags | Super Admin" }
export const dynamic = "force-dynamic"

export default async function SuperAdminFeatureFlagsPage() {
  const flags = await getPlatformFlags()
  return <FeatureFlagsScreen flags={flags} />
}
