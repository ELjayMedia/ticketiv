import { redirectToOrgScopedRoute } from "@/lib/resolve-org"

export const dynamic = "force-dynamic"

export default async function OrganizerDashboardPage() {
  await redirectToOrgScopedRoute((orgId) => `/orgs/${orgId}/dashboard`)
}
