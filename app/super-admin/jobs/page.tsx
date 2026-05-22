import { JobsScreen } from "@/components/quiet/screens/admin/jobs"
import { getJobsOverview } from "@/lib/data/admin/jobs"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { ADMIN_ROLE_TIERS } from "@/lib/super-admin/permissions"

export const metadata = { title: "Jobs | Super Admin" }
export const dynamic = "force-dynamic"

export default async function SuperAdminJobsPage() {
  await requireAdminRole(ADMIN_ROLE_TIERS)
  const overview = await getJobsOverview()
  return <JobsScreen overview={overview} />
}
