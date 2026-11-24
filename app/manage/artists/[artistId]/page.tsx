import Link from "next/link"
import { redirect } from "next/navigation"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
import { getArtistAccess } from "@/lib/artists/access"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

function when(startsAt: string | null, tz: string | null) {
  if (!startsAt) return "Date to be announced"
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: tz || "Africa/Mbabane" }).format(new Date(startsAt))
}

/** Artist overview: verification, followers (aggregate only), profile gaps, upcoming public performances. */
export default async function ArtistOverviewPage({ params }: { params: Promise<{ artistId: string }> }) {
  const { artistId } = await params
  const access = await getArtistAccess(artistId)
  if (!access) return redirect("/403")
  const { artist } = access
  const supabase = createServerSupabaseClient() as any

  const [countRes, lineupRes] = await Promise.all([
    supabase.rpc("fn_follower_count", { p_kind: "artist", p_id: artistId }),
    supabase
      .from("event_artists")
      .select("role, events:events!inner(id, title, slug, starts_at, tz, status, visibility)")
      .eq("artist_id", artistId)
      .eq("events.status", "published")
      .eq("events.visibility", "public")
      .gte("events.starts_at", new Date().toISOString()),
  ])
  const followers = typeof countRes.data === "number" ? countRes.data : 0
  const shows = ((lineupRes.data ?? []) as Array<{ role: string | null; events: any }>)
    .map((r) => ({ ...r.events, role: r.role }))
    .sort((a, b) => String(a.starts_at).localeCompare(String(b.starts_at)))

  const missing = [
    !artist.bio && "a biography",
    !artist.imageUrl && "a photo",
    artist.genres.length === 0 && "genres",
    !artist.bookingEmail && "a booking contact",
    !artist.pressKitUrl && "a press kit",
  ].filter(Boolean) as string[]

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-5 py-8 md:px-10">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Artist workspace</span>
        <h1 className="text-h1">{artist.name}</h1>
        <p className="text-[13px] text-ink-3">
          {followers.toLocaleString("en-GB")} {followers === 1 ? "follower" : "followers"} ·{" "}
          <Link href={`/artists/${artist.id}`} className="text-accent hover:underline">
            View public profile
          </Link>
        </p>
      </header>

      {!artist.verified ? (
        <Card>
          <CardBody className="flex items-start gap-3 p-4">
            <Icon name="shield" size={18} className="mt-0.5 shrink-0 text-warning" />
            <p className="text-[13px] text-ink-2">
              This profile isn&apos;t verified yet. It appears publicly once it&apos;s on a public line-up, without a verified badge.
            </p>
          </CardBody>
        </Card>
      ) : null}

      {missing.length > 0 ? (
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-[13px] text-ink-2">Organisers and fans look for {missing.join(", ")}.</p>
            <Link href={`/manage/artists/${artistId}/profile`} className="text-[13px] font-semibold text-accent hover:underline">
              Complete the profile
            </Link>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-h2">Upcoming performances</h2>
            <span className="font-mono text-[12px] text-ink-3">{shows.length}</span>
          </div>
          {shows.length === 0 ? (
            <p className="text-[13px] text-ink-3">No upcoming public performances. They appear here when an organiser publishes an event with you on the line-up.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {shows.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/events/${e.slug ?? e.id}`} className="min-w-0 truncate text-[14px] font-medium text-ink hover:underline">
                    {e.title}
                  </Link>
                  <span className="shrink-0 font-mono text-[12px] text-ink-3">{when(e.starts_at, e.tz)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </main>
  )
}
