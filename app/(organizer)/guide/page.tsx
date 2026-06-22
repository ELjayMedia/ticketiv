import { redirectToOrgScopedRoute } from "@/lib/resolve-org"

export const dynamic = "force-dynamic"

export default async function OrganizerGuidePage() {
  await redirectToOrgScopedRoute((orgId) => `/orgs/${orgId}/onboarding`)
}
