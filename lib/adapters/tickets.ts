"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { validateSchema, MyTicketsViewSchema, type MyTicketsView } from "@/lib/schemas/views"

/**
 * Adapter for authenticated user tickets
 * Requires active session
 */

export async function getMyTickets(userId: string, params?: {
  limit?: number
  offset?: number
}): Promise<MyTicketsView[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    console.warn("[v0] Supabase not configured, cannot fetch tickets")
    return []
  }

  try {
    let query = supabase
      .from("v_my_tickets")
      .select("*")
      .eq("user_id", userId)
      .order("starts_at", { ascending: false })

    const limit = params?.limit || 24
    const offset = params?.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error("[v0] Error fetching tickets:", error)
      return []
    }

    if (!data) return []
    return data.map((item) => validateSchema(MyTicketsViewSchema, item, "v_my_tickets"))
  } catch (error) {
    console.error("[v0] Exception in getMyTickets:", error)
    return []
  }
}

export async function getTicketById(ticketId: string, userId: string): Promise<MyTicketsView | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    console.warn("[v0] Supabase not configured, cannot fetch ticket")
    return null
  }

  try {
    const { data, error } = await supabase
      .from("v_my_tickets")
      .select("*")
      .eq("order_item_id", ticketId)
      .eq("user_id", userId)
      .single()

    if (error) {
      console.error("[v0] Error fetching ticket:", error)
      return null
    }

    if (!data) return null
    return validateSchema(MyTicketsViewSchema, data, "v_my_tickets")
  } catch (error) {
    console.error("[v0] Exception in getTicketById:", error)
    return null
  }
}
