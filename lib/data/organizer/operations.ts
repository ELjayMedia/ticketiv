"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface GuestlistEntry {
  id: string
  event_id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  status: "pending" | "fulfilled" | "cancelled"
  created_at: string
}

export interface Scan {
  id: string
  ticket_code: string
  device_id: string
  scanned_at: string
  result: "success" | "invalid" | "already_checked_in"
}

/**
 * Get guestlist for event
 * Reads from: guestlist_entries
 */
export async function getEventGuestlist(eventId: string): Promise<GuestlistEntry[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("guestlist_entries")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching guestlist:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching guestlist:", error)
    return []
  }
}

/**
 * Get scan log for event
 * Reads from: scans
 */
export async function getEventScans(eventId: string): Promise<Scan[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("scans")
      .select("*")
      .eq("event_id", eventId)
      .order("scanned_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching scans:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching scans:", error)
    return []
  }
}

/**
 * Get event staff members
 * Reads from: event_staff
 */
export async function getEventStaff(eventId: string) {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("event_staff")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching event staff:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching event staff:", error)
    return []
  }
}
