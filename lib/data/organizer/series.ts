"use server"

import { createClient } from "@/lib/supabase/server"
import { findAvailableSeriesSlug, generateSeriesSlug } from "@/lib/series/slug"

export type OrgSeriesSummary = {
  id: string
  slug: string
  title: string
  series_type: "tour" | "recurring" | "season"
  starts_on: string | null
  ends_on: string | null
  cover_image_url: string | null
  event_count: number
}

export type OrgSeriesDetail = {
  id: string
  org_id: string
  slug: string
  title: string
  description: string | null
  series_type: "tour" | "recurring" | "season"
  cover_image_url: string | null
  recurrence_pattern: unknown | null
  starts_on: string | null
  ends_on: string | null
  events: Array<{
    id: string
    title: string
    slug: string
    starts_at: string | null
    status: string
  }>
}

export async function listOrgSeries(orgId: string): Promise<OrgSeriesSummary[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("event_series")
    .select(`
      id, slug, title, series_type, starts_on, ends_on, cover_image_url,
      events(id)
    `)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })

  if (error || !data) return []

  type Row = {
    id: string
    slug: string
    title: string
    series_type: "tour" | "recurring" | "season"
    starts_on: string | null
    ends_on: string | null
    cover_image_url: string | null
    events: Array<{ id: string }> | null
  }

  return (data as unknown as Row[]).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    series_type: row.series_type,
    starts_on: row.starts_on,
    ends_on: row.ends_on,
    cover_image_url: row.cover_image_url,
    event_count: (row.events ?? []).length,
  }))
}

export async function getOrgSeriesBySlug(
  orgId: string,
  slug: string,
): Promise<OrgSeriesDetail | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("event_series")
    .select(`
      id, org_id, slug, title, description, series_type, cover_image_url,
      recurrence_pattern, starts_on, ends_on,
      events(id, title, slug, starts_at, status)
    `)
    .eq("org_id", orgId)
    .eq("slug", slug)
    .single()

  if (error || !data) return null

  type Row = OrgSeriesDetail & { events: OrgSeriesDetail["events"] | null }
  const raw = data as unknown as Row
  return {
    id: raw.id,
    org_id: raw.org_id,
    slug: raw.slug,
    title: raw.title,
    description: raw.description,
    series_type: raw.series_type,
    cover_image_url: raw.cover_image_url,
    recurrence_pattern: raw.recurrence_pattern,
    starts_on: raw.starts_on,
    ends_on: raw.ends_on,
    events: (raw.events ?? []).slice().sort((a, b) => {
      const aT = a.starts_at ? new Date(a.starts_at).getTime() : Infinity
      const bT = b.starts_at ? new Date(b.starts_at).getTime() : Infinity
      return aT - bT
    }),
  }
}

export async function checkSeriesSlugAvailable(
  slug: string,
  ignoreId?: string,
): Promise<boolean> {
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) || slug.length < 2 || slug.length > 80) {
    return false
  }
  const supabase = await createClient()
  let query = supabase.from("event_series").select("id").eq("slug", slug).limit(1)
  if (ignoreId) query = query.neq("id", ignoreId)
  const { data } = await query
  return !data || data.length === 0
}

type SeriesFormInput = {
  title: string
  slug?: string
  description?: string | null
  series_type: "tour" | "recurring" | "season"
  cover_image_url?: string | null
  recurrence_pattern?: unknown | null
  starts_on?: string | null
  ends_on?: string | null
}

export async function createOrgSeries(
  orgId: string,
  input: SeriesFormInput,
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const supabase = await createClient()

  const rawSlug = input.slug?.trim() || generateSeriesSlug(input.title)
  let slug = generateSeriesSlug(rawSlug)
  if (!slug) return { ok: false, error: "Could not generate a slug from this title." }

  slug = await findAvailableSeriesSlug(supabase, slug)

  const recurrence =
    input.series_type === "recurring" && input.recurrence_pattern ? input.recurrence_pattern : null

  const { data, error } = await supabase
    .from("event_series")
    .insert({
      org_id: orgId,
      slug,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      series_type: input.series_type,
      cover_image_url: input.cover_image_url?.trim() || null,
      recurrence_pattern: recurrence,
      starts_on: input.starts_on || null,
      ends_on: input.ends_on || null,
    })
    .select("slug")
    .single()

  if (error || !data) {
    const message = error?.message ?? "Failed to create series."
    if (message.toLowerCase().includes("duplicate") || message.includes("23505")) {
      return { ok: false, error: "That slug is already taken. Try a different one." }
    }
    return { ok: false, error: message }
  }

  return { ok: true, slug: data.slug }
}

export async function updateOrgSeries(
  orgId: string,
  id: string,
  input: SeriesFormInput,
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const supabase = await createClient()

  let slug = input.slug ? generateSeriesSlug(input.slug) : null
  if (slug) {
    const available = await checkSeriesSlugAvailable(slug, id)
    if (!available) {
      return { ok: false, error: "That slug is already taken. Try a different one." }
    }
  }

  const recurrence =
    input.series_type === "recurring" && input.recurrence_pattern ? input.recurrence_pattern : null

  const updates: Record<string, unknown> = {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    series_type: input.series_type,
    cover_image_url: input.cover_image_url?.trim() || null,
    recurrence_pattern: recurrence,
    starts_on: input.starts_on || null,
    ends_on: input.ends_on || null,
  }
  if (slug) updates.slug = slug

  const { data, error } = await supabase
    .from("event_series")
    .update(updates)
    .eq("id", id)
    .eq("org_id", orgId)
    .select("slug")
    .single()

  if (error || !data) {
    const message = error?.message ?? "Failed to update series."
    if (message.toLowerCase().includes("duplicate") || message.includes("23505")) {
      return { ok: false, error: "That slug is already taken. Try a different one." }
    }
    return { ok: false, error: message }
  }

  return { ok: true, slug: data.slug }
}
