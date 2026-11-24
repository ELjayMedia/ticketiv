import { redirect } from "next/navigation"

import { addArtistManagerAction, removeArtistMemberAction } from "@/app/manage/artists/[artistId]/actions"
import { AddArtistManagerForm, RemoveArtistMemberButton } from "@/components/artists/artist-forms"
import { Card, CardBody } from "@/components/quiet/ui/card"
import { getArtistAccess } from "@/lib/artists/access"
import { artistRoleLabel, canRemoveArtistMember, isArtistRole } from "@/lib/artists/core"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export default async function ArtistTeamPage({ params }: { params: Promise<{ artistId: string }> }) {
  const { artistId } = await params
  const access = await getArtistAccess(artistId)
  if (!access) return redirect("/403")
  const supabase = createServerSupabaseClient() as any
  const { data, error } = await supabase.rpc("fn_artist_team", { p_artist_id: artistId })
  if (error) throw new Error(`Could not load the artist team: ${error.message}`)
  const team = ((data ?? []) as Array<{ user_id: string; role: string; display_name: string }>).filter((m) => isArtistRole(m.role))

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-5 py-8 md:px-10">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Team</span>
        <h1 className="text-h1">Who manages {access.artist.name}</h1>
        <p className="text-[13px] text-ink-3">Managers can edit the profile and press kit. Only the owner adds or removes managers.</p>
      </header>
      <Card>
        <CardBody className="p-0">
          <ul className="flex flex-col divide-y divide-line">
            {team.map((m) => {
              const role = m.role as "artist_owner" | "artist_manager"
              const isSelf = m.user_id === access.userId
              return (
                <li key={m.user_id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-[14px] font-medium text-ink">
                      {m.display_name}
                      {isSelf ? <span className="text-ink-3"> (you)</span> : null}
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{artistRoleLabel(role)}</span>
                  </div>
                  {canRemoveArtistMember(access.role, role, isSelf) ? (
                    <RemoveArtistMemberButton artistId={artistId} userId={m.user_id} label={isSelf ? "Leave" : "Remove"} action={removeArtistMemberAction} />
                  ) : null}
                </li>
              )
            })}
          </ul>
        </CardBody>
      </Card>
      {access.role === "artist_owner" ? (
        <Card>
          <CardBody className="flex flex-col gap-3 p-5">
            <h2 className="text-h2">Add a manager</h2>
            <AddArtistManagerForm artistId={artistId} action={addArtistManagerAction} />
          </CardBody>
        </Card>
      ) : null}
    </main>
  )
}
