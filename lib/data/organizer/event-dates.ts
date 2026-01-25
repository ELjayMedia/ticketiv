"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface EventDate {
  id: string
  event_id: string
  starts_at: string
  ends_at: string
  created_at?: string
  updated_at?: string
}

export interface CreateEventDateInput {
  event_id: string
  starts_at: string
  ends_at: string
}

export interface UpdateEventDateInput {
  starts_at?: string
  ends_at?: string
}

/**
 * Get all event dates for a specific event
 */
export async function getEventDates(eventId: string): Promise<EventDate[]> {
  const supabase = createServerSupabaseClient()

  if (!supabase) {
    console.warn("[v0] Supabase client not available for getEventDates")
    return []
  }

  try {
    const { data, error } = await supabase
      .from("event_dates")
      .select("*")
      .eq("event_id", eventId)
      .order("starts_at", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching event dates:", error)
      return []
    }

    return (data as EventDate[]) || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching event dates:", error)
    return []
  }
}

/**
 * Get a specific event date by ID
 */
export async function getEventDateById(dateId: string): Promise<EventDate | null> {
  const supabase = createServerSupabaseClient()

  if (!supabase) {
    console.warn("[v0] Supabase client not available for getEventDateById")
    return null
  }

  try {
    const { data, error } = await supabase
      .from("event_dates")
      .select("*")
      .eq("id", dateId)
      .maybeSingle()

    if (error) {
      console.error("[v0] Error fetching event date:", error)
      return null
    }

    return (data as EventDate) || null
  } catch (error) {
    console.error("[v0] Unexpected error fetching event date:", error)
    return null
  }
}

/**
 * Create a new event date
 */
export async function createEventDate(input: CreateEventDateInput): Promise<EventDate | null> {
  const supabase = createServerSupabaseClient()

  if (!supabase) {
    console.warn("[v0] Supabase client not available for createEventDate")
    return null
  }

  try {
    const { data, error } = await supabase
      .from("event_dates")
      .insert([
        {
          event_id: input.event_id,
          starts_at: input.starts_at,
          ends_at: input.ends_at,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating event date:", error)
      return null
    }

    return (data as EventDate) || null
  } catch (error) {
    console.error("[v0] Unexpected error creating event date:", error)
    return null
  }
}

/**
 * Update an event date
 */
export async function updateEventDate(
  dateId: string,
  input: UpdateEventDateInput
): Promise<EventDate | null> {
  const supabase = createServerSupabaseClient()

  if (!supabase) {
    console.warn("[v0] Supabase client not available for updateEventDate")
    return null
  }

  try {
    const { data, error } = await supabase
      .from("event_dates")
      .update({
        ...(input.starts_at && { starts_at: input.starts_at }),
        ...(input.ends_at && { ends_at: input.ends_at }),
      })
      .eq("id", dateId)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error updating event date:", error)
      return null
    }

    return (data as EventDate) || null
  } catch (error) {
    console.error("[v0] Unexpected error updating event date:", error)
    return null
  }
}

/**
 * Delete an event date
 */
export async function deleteEventDate(dateId: string): Promise<boolean> {
  const supabase = createServerSupabaseClient()

  if (!supabase) {
    console.warn("[v0] Supabase client not available for deleteEventDate")
    return false
  }

  try {
    const { error } = await supabase.from("event_dates").delete().eq("id", dateId)

    if (error) {
      console.error("[v0] Error deleting event date:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("[v0] Unexpected error deleting event date:", error)
    return false
  }
}

/**
 * Get event dates within a time range
 */
export async function getEventDatesInRange(
  eventId: string,
  startDate: string,
  endDate: string
): Promise<EventDate[]> {
  const supabase = createServerSupabaseClient()

  if (!supabase) {
    console.warn("[v0] Supabase client not available for getEventDatesInRange")
    return []
  }

  try {
    const { data, error } = await supabase
      .from("event_dates")
      .select("*")
      .eq("event_id", eventId)
      .gte("starts_at", startDate)
      .lte("ends_at", endDate)
      .order("starts_at", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching event dates in range:", error)
      return []
    }

    return (data as EventDate[]) || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching event dates in range:", error)
    return []
  }
}
