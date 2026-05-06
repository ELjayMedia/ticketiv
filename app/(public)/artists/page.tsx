import { getPublicArtists } from "@/lib/data/public"
import ArtistsClient from "./artists-client"

export const dynamic = "force-dynamic"

export default async function ArtistsPage() {
  const artists = await getPublicArtists({ limit: 50 })
  return <ArtistsClient initialArtists={artists} />
}
