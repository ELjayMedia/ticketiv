import { redirectToOrgScopedRoute } from "@/lib/resolve-org"

export const dynamic = "force-dynamic"

export default async function CreateEventPage() {
  await redirectToOrgScopedRoute((orgId) => `/orgs/${orgId}/events/new`)
}
