// Source: v_my_tickets (RLS-scoped) + event_favourites for the calendar
// month grid. Returns one row per (event, date) so a 2-day-pass counts on
// both its dates if event_dates has multiple rows — we resolve from
// event_starts_at on the ticket view for simplicity.

import "server-only"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface CalendarEventRow {
  event_id: string
  title: string
  venue: string | null
  starts_at: string
  cover_image_url: string | null
  source: "ticket" | "favourite"
}

export interface MyCalendarMonth {
  year: number
  month: number // 1-12
  events: CalendarEventRow[]
}

export async function getMyCalendarMonth(
  year?: number,
  month?: number,
): Promise<MyCalendarMonth | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const now = new Date()
  const y = year ?? now.getUTCFullYear()
  const m = month ?? now.getUTCMonth() + 1
  const monthStart = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0))
  const monthEnd = new Date(Date.UTC(y, m, 1, 0, 0, 0))

  // Tickets the user holds, with the event window inside this month.
  const ticketsRes = await supabase
    .from("v_my_tickets")
    .select("event_id, event_title, event_starts_at, venue_name, cover_image_url, revoked_at")
    .gte("event_starts_at", monthStart.toISOString())
    .lt("event_starts_at", monthEnd.toISOString())
    .is("revoked_at", null)
    .order("event_starts_at", { ascending: true })

  // Favourited events in this month.
  const favRes = await supabase
    .from("event_favourites")
    .select(
      "event_id, events:events!inner(id, title, starts_at, cover_image_url, venues(name))",
    )
    .eq("user_id", user.id)
    .gte("events.starts_at", monthStart.toISOString())
    .lt("events.starts_at", monthEnd.toISOString())

  const seen = new Set<string>()
  const events: CalendarEventRow[] = []

  for (const row of ticketsRes.data ?? []) {
    if (!row.event_starts_at || !row.event_id) continue
    const key = `t:${row.event_id}:${row.event_starts_at}`
    if (seen.has(key)) continue
    seen.add(key)
    events.push({
      event_id: row.event_id,
      title: row.event_title ?? "Event",
      venue: row.venue_name ?? null,
      starts_at: row.event_starts_at,
      cover_image_url: row.cover_image_url ?? null,
      source: "ticket",
    })
  }

  for (const row of favRes.data ?? []) {
    const e = row.events as unknown as {
      id: string
      title: string
      starts_at: string
      cover_image_url: string | null
      venues: { name: string | null } | null
    } | null
    if (!e?.starts_at) continue
    const key = `f:${e.id}:${e.starts_at}`
    if (seen.has(key) || seen.has(`t:${e.id}:${e.starts_at}`)) continue
    seen.add(key)
    events.push({
      event_id: e.id,
      title: e.title ?? "Event",
      venue: e.venues?.name ?? null,
      starts_at: e.starts_at,
      cover_image_url: e.cover_image_url ?? null,
      source: "favourite",
    })
  }

  events.sort((a, b) => a.starts_at.localeCompare(b.starts_at))

  return { year: y, month: m, events }
}
