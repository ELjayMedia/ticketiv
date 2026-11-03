import { notFound } from "next/navigation"
import { requireOrgCapability } from "@/lib/data/organizer/access"
import { PayoutsLedger } from "@/components/quiet/screens/payouts/payouts-ledger"
import { getOrgPayoutsOverview } from "@/lib/data/organizer/payouts"
import { mapPayouts } from "@/lib/mappers/payouts"
import { getOrganizerAccess } from "@/lib/organizer/access"

export const metadata = { title: "Payouts & ledger" }
export const dynamic = "force-dynamic"

export default async function OrgPayoutsPage({
  params,
}: {
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = await params
  await requireOrgCapability(orgId, "payouts")
  const overview = await getOrgPayoutsOverview(orgId)
  if (!overview) {
    notFound()
  }

  // Same rule as the payout-account RPCs (app.is_org_admin_of): owner, admin, platform admin.
  const access = await getOrganizerAccess(orgId)
  const canManageAccounts = Boolean(
    access && (access.isPlatformAdmin || access.storedRole === "organizer_owner" || access.storedRole === "organizer_admin"),
  )

  return <PayoutsLedger {...mapPayouts(overview!)} canManageAccounts={canManageAccounts} />
}
