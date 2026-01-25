"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function getDeviceSessions(deviceId: string) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("device_sessions")
      .select("*")
      .eq("device_id", deviceId)
      .order("started_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching device sessions:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching device sessions:", error)
    return []
  }
}

export async function getActiveDeviceSession(deviceId: string) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from("device_sessions")
      .select("*")
      .eq("device_id", deviceId)
      .is("ended_at", null)
      .maybeSingle()

    if (error) {
      console.error("[v0] Error fetching active device session:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("[v0] Unexpected error fetching active device session:", error)
    return null
  }
}

export async function startDeviceSession(deviceId: string, userId: string) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from("device_sessions")
      .insert([{ device_id: deviceId, user_id: userId, started_at: new Date().toISOString() }])
      .select()

    if (error) {
      console.error("[v0] Error starting device session:", error)
      return null
    }

    return data?.[0] || null
  } catch (error) {
    console.error("[v0] Unexpected error starting device session:", error)
    return null
  }
}

export async function endDeviceSession(sessionId: string) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from("device_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", sessionId)
      .select()

    if (error) {
      console.error("[v0] Error ending device session:", error)
      return null
    }

    return data?.[0] || null
  } catch (error) {
    console.error("[v0] Unexpected error ending device session:", error)
    return null
  }
}

export async function deleteDeviceSession(sessionId: string) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return false

  try {
    const { error } = await supabase
      .from("device_sessions")
      .delete()
      .eq("id", sessionId)

    if (error) {
      console.error("[v0] Error deleting device session:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("[v0] Unexpected error deleting device session:", error)
    return false
  }
}
