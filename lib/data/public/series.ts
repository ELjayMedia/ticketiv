"use server"

import { createClient } from "@/lib/supabase/server"

export type SeriesDetailEvent = {
  id: string
  slug: string
  title: string
  starts_at: string | null
  ends_at: string | null
  status: string
  cover_image_url: string | null
  city: string | null
  event_format: "single_day" | "multi_day"
  venue: { id: string; name: string; slug: string | null; city: string | null } | null
  min_price_cents: number | null
  currency: string
}

export type SeriesDetailData = {
  id: string
  slug: string
  title: string
  description: string | null
  series_type: "tour" | "recurring" | "season"
  cover_image_url: string | null
  recurrence_pattern: unknown | null
  starts_on: string | null
  ends_on: string | null
  organization: { id: string; name: string; slug: string; logo: string | null } | null
  events: SeriesDetailEvent[]
}

type RawEvent = {
  id: string
  slug: string
  title: string
  starts_at: string | null
  ends_at: string | null
  status: string
  cover_image_url: string | null
  city: string | null
  event_format: "single_day" | "multi_day" | null
  venue: { id: string; name: string; slug: string | null; city: string | null } | null
  ticket_types: Array<{ price_cents: number | null; currency: string | null }> | null
}

export async function getSeriesBySlug(slug: string): Promise<SeriesDetailData | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("event_series")
    .select(`
      id, slug, title, description, series_type, cover_image_url, recurrence_pattern,
      starts_on, ends_on,
      organization:organizations(id, name, slug, logo),
      events(
        id, slug, title, starts_at, ends_at, status, cover_image_url, city, event_format,
        venue:venues(id, name, slug, city),
        ticket_types(price_cents, currency)
      )
    `)
    .eq("slug", slug)
    .single()

  if (error || !data) return null

  type RawSeries = {
    id: string
    slug: string
    title: string
    description: string | null
    series_type: "tour" | "recurring" | "season"
    cover_image_url: string | null
    recurrence_pattern: unknown | null
    starts_on: string | null
    ends_on: string | null
    organization: { id: string; name: string; slug: string; logo: string | null } | null
    events: RawEvent[] | null
  }

  const raw = data as unknown as RawSeries
  const rawEvents = (raw.events ?? []).filter((e) => e.status === "published")

  const events: SeriesDetailEvent[] = rawEvents.map((e) => {
    const priced = (e.ticket_types ?? []).filter((t) => typeof t.price_cents === "number")
    const minPrice = priced.length > 0 ? Math.min(...priced.map((t) => t.price_cents as number)) : null
    const currency = (e.ticket_types ?? []).find((t) => t.currency)?.currency ?? "SZL"
    return {
      id: e.id,
      slug: e.slug,
      title: e.title,
      starts_at: e.starts_at,
      ends_at: e.ends_at,
      status: e.status,
      cover_image_url: e.cover_image_url,
      city: e.city,
      event_format: e.event_format === "multi_day" ? "multi_day" : "single_day",
      venue: e.venue ?? null,
      min_price_cents: minPrice,
      currency,
    }
  })

  events.sort((a, b) => {
    const aT = a.starts_at ? new Date(a.starts_at).getTime() : Infinity
    const bT = b.starts_at ? new Date(b.starts_at).getTime() : Infinity
    return aT - bT
  })

  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    description: raw.description,
    series_type: raw.series_type,
    cover_image_url: raw.cover_image_url,
    recurrence_pattern: raw.recurrence_pattern,
    starts_on: raw.starts_on,
    ends_on: raw.ends_on,
    organization: raw.organization,
    events,
  }
}

export type SeriesFollowState = {
  signedIn: boolean
  following: boolean
  followerCount: number
}

export async function getSeriesFollowState(seriesId: string): Promise<SeriesFollowState> {
  const supabase = await createClient()

  const { count } = await supabase
    .from("series_follows")
    .select("id", { count: "exact", head: true })
    .eq("series_id", seriesId)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { signedIn: false, following: false, followerCount: count ?? 0 }
  }

  const { data: follow } = await supabase
    .from("series_follows")
    .select("id")
    .eq("series_id", seriesId)
    .eq("user_id", user.id)
    .maybeSingle()

  return { signedIn: true, following: follow != null, followerCount: count ?? 0 }
}

export type SeriesSummary = {
  id: string
  slug: string
  title: string
  description: string | null
  series_type: "tour" | "recurring" | "season"
  cover_image_url: string | null
  organizationName: string | null
  upcomingCount: number
  nextStartsAt: string | null
}

/**
 * Public series directory: series with at least one published event, the
 * ones with something coming up first (soonest next date), then the rest.
 */
export async function listPublicSeries(limit = 60): Promise<SeriesSummary[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("event_series")
    .select(`
      id, slug, title, description, series_type, cover_image_url,
      organization:organizations(name),
      events(id, status, starts_at)
    `)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error || !data) {
    if (error) console.error("[series] list:", error)
    return []
  }

  type Row = {
    id: string
    slug: string
    title: string
    description: string | null
    series_type: "tour" | "recurring" | "season"
    cover_image_url: string | null
    organization: { name: string } | { name: string }[] | null
    events: Array<{ id: string; status: string; starts_at: string | null }> | null
  }

  const now = Date.now()
  const summaries = (data as unknown as Row[])
    .map((row) => {
      const published = (row.events ?? []).filter((e) => e.status === "published")
      const upcoming = published
        .map((e) => e.starts_at)
        .filter((s): s is string => !!s && new Date(s).getTime() >= now)
        .sort()
      const org = Array.isArray(row.organization) ? row.organization[0] : row.organization
      return {
        summary: {
          id: row.id,
          slug: row.slug,
          title: row.title,
          description: row.description,
          series_type: row.series_type,
          cover_image_url: row.cover_image_url,
          organizationName: org?.name ?? null,
          upcomingCount: upcoming.length,
          nextStartsAt: upcoming[0] ?? null,
        } satisfies SeriesSummary,
        publishedCount: published.length,
      }
    })
    .filter((s) => s.publishedCount > 0)
    .map((s) => s.summary)

  return summaries.sort((a, b) => {
    if (a.nextStartsAt && b.nextStartsAt) return a.nextStartsAt.localeCompare(b.nextStartsAt)
    if (a.nextStartsAt) return -1
    if (b.nextStartsAt) return 1
    return 0
  })
}
