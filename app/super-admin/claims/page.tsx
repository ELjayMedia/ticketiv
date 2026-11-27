import { redirect } from "next/navigation"

import { pendingClaimCounts } from "@/components/super-admin/claims-switch"
import { requireAdminRole } from "@/lib/super-admin/auth"

export const dynamic = "force-dynamic"

/** One Claims queue: opens whichever type has requests waiting (venues first). */
export default async function ClaimsPage() {
  await requireAdminRole(["super_admin", "support_admin", "event_ops_admin", "finance_admin", "read_only_admin"])
  const counts = await pendingClaimCounts()
  redirect(counts.venues === 0 && counts.artists > 0 ? "/super-admin/artist-claims" : "/super-admin/venue-claims")
}
