import { redirect } from "next/navigation"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { AddVenueMemberForm, RemoveVenueMemberButton } from "@/components/venues/venue-forms"
import { addVenueMemberAction, removeVenueMemberAction } from "@/app/manage/venues/[venueId]/actions"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getVenueAccess } from "@/lib/venues/access"
import { assignableVenueRoles, canRemoveVenueMember, isVenueRole, venueRoleLabel } from "@/lib/venues/core"

export const dynamic = "force-dynamic"

export default async function VenueTeamPage({ params }: { params: Promise<{ venueId: string }> }) {
  const { venueId } = await params
  const access = await getVenueAccess(venueId)
  if (!access) return redirect("/403")

  const supabase = createServerSupabaseClient()
  const { data, error } = supabase ? await supabase.rpc("fn_venue_team", { p_venue_id: venueId }) : { data: [], error: null }
  if (error) throw new Error(`Could not load the venue team: ${error.message}`)
  const team = (data ?? []).filter((m) => isVenueRole(m.role))
  const roles = assignableVenueRoles(access.role)

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-5 py-8 md:px-10">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Team</span>
        <h1 className="text-h1">People who manage {access.venue.name}</h1>
        <p className="text-[13px] text-ink-3">
          Managers can edit the venue and add staff. Staff can view the workspace. Only the owner can add managers.
        </p>
      </header>

      <Card>
        <CardBody className="p-0">
          <ul className="flex flex-col divide-y divide-line">
            {team.map((m) => {
              const role = m.role as Parameters<typeof venueRoleLabel>[0]
              const isSelf = m.user_id === access.userId
              const removable = canRemoveVenueMember(access.role, role, isSelf)
              return (
                <li key={m.user_id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-[14px] font-medium text-ink">
                      {m.display_name}
                      {isSelf ? <span className="text-ink-3"> (you)</span> : null}
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{venueRoleLabel(role)}</span>
                  </div>
                  {removable ? (
                    <RemoveVenueMemberButton venueId={venueId} userId={m.user_id} label={isSelf ? "Leave" : "Remove"} action={removeVenueMemberAction} />
                  ) : null}
                </li>
              )
            })}
          </ul>
        </CardBody>
      </Card>

      {roles.length > 0 ? (
        <Card>
          <CardBody className="flex flex-col gap-3 p-5">
            <h2 className="text-h2">Add someone</h2>
            <AddVenueMemberForm venueId={venueId} roles={roles} action={addVenueMemberAction} />
          </CardBody>
        </Card>
      ) : null}
    </main>
  )
}
