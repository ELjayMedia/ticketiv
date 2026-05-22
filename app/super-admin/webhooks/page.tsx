import { WebhooksScreen } from "@/components/quiet/screens/admin/webhooks"
import { getWebhooksOverview } from "@/lib/data/admin/webhooks"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { ADMIN_ROLE_TIERS } from "@/lib/super-admin/permissions"

export const metadata = { title: "Webhooks | Super Admin" }
export const dynamic = "force-dynamic"

export default async function SuperAdminWebhooksPage() {
  await requireAdminRole(ADMIN_ROLE_TIERS)
  const overview = await getWebhooksOverview()
  return <WebhooksScreen overview={overview} />
}
