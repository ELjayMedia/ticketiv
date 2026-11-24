import { redirect } from "next/navigation"

import { updateArtistProfileAction } from "@/app/manage/artists/[artistId]/actions"
import { ArtistProfileForm } from "@/components/artists/artist-forms"
import { Card, CardBody } from "@/components/quiet/ui/card"
import { getArtistAccess } from "@/lib/artists/access"

export const dynamic = "force-dynamic"

export default async function ArtistProfilePage({ params }: { params: Promise<{ artistId: string }> }) {
  const { artistId } = await params
  const access = await getArtistAccess(artistId)
  if (!access) return redirect("/403")
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-5 py-8 md:px-10">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Profile &amp; press kit</span>
        <h1 className="text-h1">{access.artist.name}</h1>
        <p className="text-[13px] text-ink-3">Everything here is public on your artist page. Contact Ticketiv support to change the artist name.</p>
      </header>
      <Card>
        <CardBody className="p-5">
          <ArtistProfileForm artist={access.artist} action={updateArtistProfileAction} />
        </CardBody>
      </Card>
    </main>
  )
}
