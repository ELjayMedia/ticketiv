import "server-only"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { formatEventDate, formatTimeRange, formatPriceLabel } from "@/lib/format"
import { asCurrency } from "@/lib/currency"

export interface FavouriteEvent {
  id: string
  slug: string
  title: string
  photo: string
  whenLabel: string
  venueName: string
  city: string | null
  priceLabel: string
  savedAt: string
}

export async function getFavourites(): Promise<FavouriteEvent[]> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return []

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("event_favourites")
    .select(
      `created_at,
       events (
         id, title, slug, cover_image_url, starts_at, city,
         venues ( name )
       )`,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error || !data) return []

  return (data as any[]).flatMap((row) => {
    const ev = row.events
    if (!ev) return []
    const start = ev.starts_at ? new Date(ev.starts_at) : null
    return [
      {
        id: ev.id,
        slug: ev.slug,
        title: ev.title,
        photo: ev.cover_image_url ?? "",
        whenLabel: start
          ? `${formatEventDate(start)} · ${formatTimeRange(start)}`
          : "Date coming soon",
        venueName: (ev.venues as any)?.name ?? "Venue TBA",
        city: ev.city ?? null,
        priceLabel: "",
        savedAt: row.created_at,
      } satisfies FavouriteEvent,
    ]
  })
}
