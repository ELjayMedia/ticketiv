// Source: seat_maps + seats + seat_reservations + order_items (for sold).
// Schema JSON shape is defined here — Ticketiv convention v1.

import "server-only"
import { createServerSupabaseClient } from "@/lib/supabase-server"

/**
 * Convention for seat_maps.schema (Ticketiv v1).
 *
 * {
 *   rows:    ["A", "B", ...],            // labels in order
 *   cols:    12,                         // seats per row
 *   aisles:  [6],                        // gaps after col N
 *   stageLabel: "STAGE",
 *   tiers:   {
 *     "A": { name: "Premium", ticketTypeId: "...", priceCents: 120000 },
 *     "_default": { name: "Regular", ticketTypeId: "...", priceCents: 50000 }
 *   }
 * }
 */
export interface SeatMapSchema {
  rows: string[]
  cols: number
  aisles?: number[]
  stageLabel?: string
  tiers: Record<
    string,
    { name: string; ticketTypeId?: string; priceCents: number; colorKey?: "violet-soft" | "neutral" }
  >
}

export type SeatState = "avail" | "sold" | "hold" | "reserved" | "pick"

export interface SeatCell {
  label: string // "C-4"
  row: string
  col: number
  state: SeatState
  tierKey: string // matches schema.tiers key
}

export interface EventSeatingChart {
  eventId: string
  eventTitle: string
  whenLabel: string
  schema: SeatMapSchema
  seats: SeatCell[]
  holdsExpireAt: string | null
}

interface SeatMapRow {
  id: string
  schema: SeatMapSchema
}

const DATE_FMT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" })

export async function getEventSeatingChart(eventId: string): Promise<EventSeatingChart | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  const [eventRes, mapRes] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, starts_at")
      .eq("id", eventId)
      .maybeSingle(),
    supabase
      .from("seat_maps")
      .select("id, schema")
      .eq("event_id", eventId)
      .maybeSingle(),
  ])

  if (!eventRes.data) return null
  const map = mapRes.data as SeatMapRow | null
  if (!map) return null

  const [seatsRes, reservationsRes, orderItemsRes] = await Promise.all([
    supabase
      .from("seats")
      .select("id, label")
      .eq("seat_map_id", map.id),
    supabase
      .from("seat_reservations")
      .select("seat_id, user_id, expires_at")
      .eq("event_id", eventId)
      .eq("active", true)
      .gte("expires_at", new Date().toISOString()),
    supabase
      .from("order_items")
      .select("seat_id, status")
      .not("seat_id", "is", null)
      .in("status", ["issued", "scanned"]),
  ])

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const myId = user?.id ?? null

  const stateBySeatId = new Map<string, SeatState>()
  for (const r of reservationsRes.data ?? []) {
    if (!r.seat_id) continue
    stateBySeatId.set(r.seat_id, r.user_id === myId ? "pick" : "hold")
  }
  for (const o of orderItemsRes.data ?? []) {
    if (!o.seat_id) continue
    stateBySeatId.set(o.seat_id, "sold")
  }

  const cells: SeatCell[] = []
  for (const seat of seatsRes.data ?? []) {
    const [row, colStr] = seat.label.split("-")
    const col = Number(colStr)
    if (!row || Number.isNaN(col)) continue
    const tierKey = map.schema.tiers[row] ? row : "_default"
    cells.push({
      label: seat.label,
      row,
      col,
      state: stateBySeatId.get(seat.id) ?? "avail",
      tierKey,
    })
  }

  const start = eventRes.data.starts_at ? new Date(eventRes.data.starts_at) : null

  return {
    eventId: eventRes.data.id,
    eventTitle: eventRes.data.title,
    whenLabel: start ? DATE_FMT.format(start) : "Date TBA",
    schema: map.schema,
    seats: cells,
    holdsExpireAt: null,
  }
}
