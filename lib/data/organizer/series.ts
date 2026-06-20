"use server"

import { format } from "date-fns"
import { createClient } from "@/lib/supabase/server"
import { findAvailableSeriesSlug, generateSeriesSlug } from "@/lib/series/slug"
import { computeOccurrences } from "@/lib/series/occurrences"
import type { RecurrencePattern } from "@/lib/series/recurrence"
import type { Json } from "@/types/database"

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
      recurrence_pattern: (recurrence ?? null) as Json,
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
    .update(updates as any)
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

export async function deleteOrgSeries(
  orgId: string,
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  // event_series.id is referenced by events.series_id with ON DELETE SET NULL,
  // so child events survive as standalone events.
  const { error } = await supabase
    .from("event_series")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * Generate draft event rows from a recurring series's recurrence pattern.
 * Events are created with only title / starts_at populated and status='draft' —
 * the organizer fills in venue, tickets, etc. before publishing.
 */
export async function generateSeriesEvents(
  orgId: string,
  seriesId: string,
  count: number,
): Promise<{ ok: true; created: number } | { ok: false; error: string }> {
  const supabase = await createClient()

  const { data: series, error: seriesError } = await supabase
    .from("event_series")
    .select("id, org_id, slug, title, series_type, recurrence_pattern, starts_on")
    .eq("id", seriesId)
    .eq("org_id", orgId)
    .single()

  if (seriesError || !series) {
    return { ok: false, error: "Series not found." }
  }
  if (series.series_type !== "recurring") {
    return { ok: false, error: "Only recurring series can generate events." }
  }
  const pattern = series.recurrence_pattern as RecurrencePattern | null
  if (!pattern || !("freq" in pattern)) {
    return { ok: false, error: "This series has no recurrence pattern set." }
  }

  // Anchor after the latest existing child event, or the series start, or now.
  const { data: lastEvent } = await supabase
    .from("events")
    .select("starts_at")
    .eq("series_id", seriesId)
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const now = new Date()
  let anchor = now
  if (lastEvent?.starts_at) {
    const last = new Date(lastEvent.starts_at)
    if (last.getTime() > anchor.getTime()) anchor = last
  } else if (series.starts_on) {
    const start = new Date(series.starts_on)
    if (start.getTime() > anchor.getTime()) anchor = start
  }

  const occurrences = computeOccurrences(pattern, anchor, count)
  if (occurrences.length === 0) {
    return { ok: false, error: "Could not compute any dates from this pattern." }
  }

  const rows = occurrences.map((date) => ({
    org_id: orgId,
    series_id: seriesId,
    title: `${series.title} — ${format(date, "EEE d MMM yyyy")}`,
    slug: `${series.slug}-${format(date, "yyyy-MM-dd")}-${Math.random().toString(36).slice(2, 7)}`,
    starts_at: date.toISOString(),
    status: "draft" as const,
    event_format: "single_day" as const,
  }))

  const { data: inserted, error: insertError } = await supabase
    .from("events")
    .insert(rows as any)
    .select("id")

  if (insertError) {
    return { ok: false, error: insertError.message }
  }

  return { ok: true, created: inserted?.length ?? 0 }
}
