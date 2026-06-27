import { notFound } from "next/navigation"
import { requireOrgCapability } from "@/lib/data/organizer/access"
import { TeamRoles } from "@/components/quiet/screens/team/team-roles"
import { getOrgTeam } from "@/lib/data/organizer/team"
import { mapTeam } from "@/lib/mappers/team"

export const metadata = { title: "Team & roles" }
export const dynamic = "force-dynamic"

export default async function OrgTeamPage({
  params,
}: {
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = await params
  await requireOrgCapability(orgId, "staff")
  const team = await getOrgTeam(orgId)
  if (!team) {
    notFound()
  }

  return <TeamRoles {...mapTeam(team!, orgId)} />
}
