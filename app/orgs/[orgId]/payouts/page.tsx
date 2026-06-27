import { notFound } from "next/navigation"
import { requireOrgCapability } from "@/lib/data/organizer/access"
import { PayoutsLedger } from "@/components/quiet/screens/payouts/payouts-ledger"
import { getOrgPayoutsOverview } from "@/lib/data/organizer/payouts"
import { mapPayouts } from "@/lib/mappers/payouts"

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

  return <PayoutsLedger {...mapPayouts(overview!)} />
}
