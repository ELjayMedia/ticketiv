import Link from "next/link"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
import { PERFORMER_TYPES } from "@/lib/artists/core"
import { createPublicSupabaseClient } from "@/lib/supabase-public"

export const dynamic = "force-dynamic"

type ArtistCard = {
  id: string
  name: string
  image_url: string | null
  performer_type: string | null
  genres: string[] | null
  verification_status: string | null
}

const INPUT =
  "h-[42px] w-full rounded-md border border-line-2 bg-surface px-3 text-[14px] outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft"

const TYPE_LABEL = new Map<string, string>(PERFORMER_TYPES)

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value ?? "").trim()
}

/**
 * Public artist directory. Read with the anonymous client on purpose: the list
 * is exactly what the public may see (verified artists and anyone on a public
 * event's line-up), never an organiser's private roster.
 */
async function getArtists(query: string, type: string): Promise<ArtistCard[]> {
  const supabase = createPublicSupabaseClient()
  if (!supabase) return []
  let req = supabase
    .from("artists")
    .select("id, name, image_url, performer_type, genres, verification_status")
    .order("verification_status", { ascending: false })
    .order("name", { ascending: true })
    .limit(120)
  const q = query.replace(/[%_,()]/g, " ").slice(0, 80).trim()
  if (q) req = req.ilike("name", `%${q}%`)
  if (type && TYPE_LABEL.has(type)) req = req.eq("performer_type", type)
  const { data, error } = await req
  if (error) {
    console.error("[artists directory]", error.message)
    return []
  }
  return (data ?? []) as ArtistCard[]
}

export default async function ArtistsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const query = one(params.q)
  const type = one(params.type)
  const filtering = Boolean(query || type)
  const artists = await getArtists(query, type)

  return (
    <main className="page-frame flex flex-col gap-8 py-8">
      <div className="flex flex-col gap-3">
        <Link href="/" className="inline-flex w-fit items-center gap-1.5 text-[13px] text-ink-3 underline-offset-4 hover:underline">
          <Icon name="chevL" size={14} />
          Back home
        </Link>
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Talent</p>
        <h1 className="text-h1 sm:text-[32px]">Artists</h1>
        <p className="max-w-2xl text-[14px] leading-6 text-ink-3">
          Musicians, DJs, comedians and performers on Ticketiv. Follow an artist to hear when they announce a show.
        </p>
      </div>

      <form method="get" className="grid gap-3 rounded-[var(--radius-md)] border border-line bg-surface p-4 sm:grid-cols-[1fr_220px_auto] sm:items-end" aria-label="Find an artist">
        <label className="flex flex-col gap-1">
          <span className="text-label">Name</span>
          <input name="q" type="search" defaultValue={query} className={INPUT} placeholder="Search artists" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-label">Type</span>
          <select name="type" defaultValue={TYPE_LABEL.has(type) ? type : ""} className={INPUT}>
            <option value="">Any</option>
            {PERFORMER_TYPES.map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <button type="submit" className="h-[42px] rounded-[var(--radius)] border border-ink bg-ink px-4 text-[14px] font-semibold text-surface hover:bg-ink-2">
            Search
          </button>
          {filtering ? (
            <Link href="/artists" className="inline-flex h-[42px] items-center px-2 text-[13px] text-ink-3 hover:underline">
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      {artists.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {artists.map((artist) => {
            const meta = [artist.performer_type ? TYPE_LABEL.get(artist.performer_type) : null, ...(artist.genres ?? []).slice(0, 2)].filter(Boolean).join(" · ")
            return (
              <Link key={artist.id} href={`/artists/${artist.id}`} className="block">
                <Card className="h-full overflow-hidden transition-colors hover:border-line-2">
                  <div className="aspect-square overflow-hidden bg-bg">
                    {artist.image_url ? (
                      <img src={artist.image_url} alt={artist.name} className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-ink-4">
                        <Icon name="music" size={36} />
                      </span>
                    )}
                  </div>
                  <CardBody className="flex flex-col gap-1 px-4 py-3">
                    <h2 className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
                      <span className="line-clamp-1">{artist.name}</span>
                      {artist.verification_status === "verified" ? (
                        <Icon name="checkCircle" size={13} className="shrink-0 text-success" aria-label="Verified artist" />
                      ) : null}
                    </h2>
                    {meta ? <p className="line-clamp-1 text-[12px] text-ink-3">{meta}</p> : null}
                  </CardBody>
                </Card>
              </Link>
            )
          })}
        </div>
      ) : (
        <Card flat className="border-dashed">
          <CardBody className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <Icon name="music" size={32} className="text-ink-4" />
            <h2 className="text-h3">{filtering ? "No artists match" : "No artists yet"}</h2>
            <p className="max-w-md text-[13px] text-ink-3">
              {filtering ? "Try another name or type." : "Artists appear here once they're verified or announced on a public event's line-up."}
            </p>
          </CardBody>
        </Card>
      )}
    </main>
  )
}
