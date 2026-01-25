"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface AdminUser {
  user_id: string
  created_at: string
}

/**
 * Check if a user is an admin
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return false

  try {
    const { data, error } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle()

    if (error) {
      console.error("[v0] Error checking admin status:", error)
      return false
    }

    return !!data
  } catch (error) {
    console.error("[v0] Unexpected error checking admin status:", error)
    return false
  }
}

/**
 * Get all admin users
 */
export async function getAllAdminUsers(): Promise<AdminUser[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("admin_users")
      .select("user_id, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching admin users:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching admin users:", error)
    return []
  }
}

/**
 * Add a user as admin
 */
export async function addAdminUser(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { success: false, error: "Supabase not configured" }

  try {
    const { error } = await supabase
      .from("admin_users")
      .insert([{ user_id: userId }])

    if (error) {
      console.error("[v0] Error adding admin user:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("[v0] Unexpected error adding admin user:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

/**
 * Remove a user from admin
 */
export async function removeAdminUser(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { success: false, error: "Supabase not configured" }

  try {
    const { error } = await supabase
      .from("admin_users")
      .delete()
      .eq("user_id", userId)

    if (error) {
      console.error("[v0] Error removing admin user:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("[v0] Unexpected error removing admin user:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
