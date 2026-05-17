import { createServerSupabaseClient } from "./supabase-server"
import type { WaitlistRecord } from "@/types"

export async function joinWaitlist(params: {
  eventId: string
  ticketTypeId?: string
  userId?: string
  email: string
  firstName?: string
  lastName?: string
  quantity: number
}): Promise<{ success: boolean; error?: string; waitlistId?: string }> {
  const supabase = createServerSupabaseClient()

  if (!supabase) {
    return { success: false, error: "Service unavailable" }
  }

  // Check if already on waitlist
  const { data: existing } = await supabase
    .from("waitlists")
    .select("id")
    .eq("event_id", params.eventId)
    .eq("email", params.email)
    .eq("status", "active")
    .maybeSingle()

  if (existing) {
    return { success: false, error: "Already on waitlist" }
  }

  // Add to waitlist
  const { data, error } = await supabase
    .from("waitlists")
    .insert({
      event_id: params.eventId,
      ticket_type_id: params.ticketTypeId,
      user_id: params.userId,
      email: params.email,
      first_name: params.firstName,
      last_name: params.lastName,
      quantity_requested: params.quantity,
      status: "active",
      joined_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (error) {
    console.error("[v0] Failed to join waitlist:", error)
    return { success: false, error: "Failed to join waitlist" }
  }

  return { success: true, waitlistId: data.id }
}

export async function getWaitlistPosition(
  eventId: string,
  email: string,
): Promise<{ position: number | null; total: number }> {
  const supabase = createServerSupabaseClient()

  if (!supabase) {
    return { position: null, total: 0 }
  }

  // Get all active waitlist entries ordered by joined_at
  const { data: entries } = await supabase
    .from("waitlists")
    .select("email, joined_at")
    .eq("event_id", eventId)
    .eq("status", "active")
    .order("joined_at", { ascending: true })

  if (!entries || entries.length === 0) {
    return { position: null, total: 0 }
  }

  const position = entries.findIndex((e) => e.email === email) + 1
  return { position: position > 0 ? position : null, total: entries.length }
}

export async function offerTicketsToWaitlist(
  eventId: string,
  ticketTypeId: string,
  quantity: number,
): Promise<{ success: boolean; offered: number }> {
  const supabase = createServerSupabaseClient()

  if (!supabase) {
    return { success: false, offered: 0 }
  }

  // Get next active waitlist entries
  const { data: waitlistEntries } = await supabase
    .from("waitlists")
    .select("*")
    .eq("event_id", eventId)
    .eq("status", "active")
    .lte("quantity_requested", quantity)
    .order("joined_at", { ascending: true })
    .limit(10)

  if (!waitlistEntries || waitlistEntries.length === 0) {
    return { success: true, offered: 0 }
  }

  let offeredCount = 0
  const offerExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes

  for (const entry of waitlistEntries) {
    if (offeredCount >= quantity) break

    // Update status to offered
    const { error } = await supabase
      .from("waitlists")
      .update({
        status: "offered",
        offer_expires_at: offerExpiresAt,
        notified_at: new Date().toISOString(),
      })
      .eq("id", entry.id)

    if (!error) {
      offeredCount += entry.quantity_requested
      // TODO: Send notification email to entry.email
    }
  }

  return { success: true, offered: offeredCount }
}

export async function getEventWaitlist(eventId: string): Promise<WaitlistRecord[]> {
  const supabase = createServerSupabaseClient()

  if (!supabase) {
    return []
  }

  const { data, error } = await supabase
    .from("waitlists")
    .select("*")
    .eq("event_id", eventId)
    .order("joined_at", { ascending: true })

  if (error) {
    console.error("[v0] Failed to fetch waitlist:", error)
    return []
  }

  return data || []
}

export async function cancelWaitlistEntry(
  waitlistId: string,
  userId?: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerSupabaseClient()

  if (!supabase) {
    return { success: false, error: "Service unavailable" }
  }

  const updateData: Partial<WaitlistRecord> = {
    status: "cancelled",
  }

  let query = supabase.from("waitlists").update(updateData).eq("id", waitlistId)

  if (userId) {
    query = query.eq("user_id", userId)
  }

  const { error } = await query

  if (error) {
    console.error("[v0] Failed to cancel waitlist entry:", error)
    return { success: false, error: "Failed to cancel waitlist entry" }
  }

  return { success: true }
}
