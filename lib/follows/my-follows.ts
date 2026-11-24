export type MyFollowKind = "organizer" | "series" | "artist" | "venue"

export interface MyFollow {
  kind: MyFollowKind
  id: string
  name: string
  slug: string | null
  href: string
  imageUrl: string | null
  followedAt: string
}

const KINDS: MyFollowKind[] = ["organizer", "series", "artist", "venue"]

export const FOLLOW_KIND_LABEL: Record<MyFollowKind, string> = {
  organizer: "Organisers",
  series: "Series",
  artist: "Artists",
  venue: "Venues",
}

/** Public page for a followed entity. Organisers and artists are addressed by id; series and venues by slug. */
export function followHref(kind: MyFollowKind, id: string, slug: string | null): string {
  switch (kind) {
    case "organizer":
      return `/organisers/${id}`
    case "artist":
      return `/artists/${id}`
    case "series":
      return slug ? `/series/${slug}` : "/me/following"
    case "venue":
      return slug ? `/venues/${slug}` : "/me/following"
  }
}

/** Map fn_my_follows rows, dropping anything malformed. */
export function mapMyFollows(rows: unknown): MyFollow[] {
  if (!Array.isArray(rows)) return []
  return rows.flatMap((row) => {
    if (!row || typeof row !== "object") return []
    const r = row as Record<string, unknown>
    const kind = r.kind as MyFollowKind
    if (!KINDS.includes(kind) || typeof r.id !== "string" || typeof r.name !== "string") return []
    const slug = typeof r.slug === "string" && r.slug ? r.slug : null
    return [{
      kind,
      id: r.id,
      name: r.name,
      slug,
      href: followHref(kind, r.id, slug),
      imageUrl: typeof r.image_url === "string" && r.image_url ? r.image_url : null,
      followedAt: typeof r.followed_at === "string" ? r.followed_at : "",
    }]
  })
}

export function groupFollows(follows: MyFollow[]): Array<{ kind: MyFollowKind; label: string; items: MyFollow[] }> {
  return KINDS.map((kind) => ({ kind, label: FOLLOW_KIND_LABEL[kind], items: follows.filter((f) => f.kind === kind) })).filter(
    (g) => g.items.length > 0,
  )
}
