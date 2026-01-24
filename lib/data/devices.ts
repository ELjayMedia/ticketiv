"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function getOrgDevices(orgId: string) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("devices")
      .select("*")
      .eq("org_id", orgId)
      .order("last_seen_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching devices:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching devices:", error)
    return []
  }
}

export async function getDeviceById(deviceId: string) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from("devices")
      .select("*")
      .eq("id", deviceId)
      .maybeSingle()

    if (error) {
      console.error("[v0] Error fetching device:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("[v0] Unexpected error fetching device:", error)
    return null
  }
}

export async function createDevice(orgId: string, label: string, role: string, maxScansPerMinute?: number, eventId?: string, registeredBy?: string) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from("devices")
      .insert([{ org_id: orgId, label, role, event_id: eventId, registered_by: registeredBy, max_scans_per_minute: maxScansPerMinute }])
      .select()

    if (error) {
      console.error("[v0] Error creating device:", error)
      return null
    }

    return data?.[0] || null
  } catch (error) {
    console.error("[v0] Unexpected error creating device:", error)
    return null
  }
}

export async function updateDevice(deviceId: string, updates: Record<string, unknown>) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from("devices")
      .update(updates)
      .eq("id", deviceId)
      .select()

    if (error) {
      console.error("[v0] Error updating device:", error)
      return null
    }

    return data?.[0] || null
  } catch (error) {
    console.error("[v0] Unexpected error updating device:", error)
    return null
  }
}

export async function deleteDevice(deviceId: string) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return false

  try {
    const { error } = await supabase
      .from("devices")
      .delete()
      .eq("id", deviceId)

    if (error) {
      console.error("[v0] Error deleting device:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("[v0] Unexpected error deleting device:", error)
    return false
  }
}
