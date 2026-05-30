"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface Profile {
  user_id: string
  org_id?: string | null
  role: string
  display_name?: string | null
  created_at: string
  name?: string | null
  surname?: string | null
  phone?: string | null
}

/**
 * Get a user's profile
 */
export async function getUserProfile(userId: string): Promise<Profile | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()

    if (error) {
      console.error("[v0] Error fetching user profile:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("[v0] Unexpected error fetching user profile:", error)
    return null
  }
}

/**
 * Get profiles by organization
 */
export async function getOrgProfiles(orgId: string): Promise<Profile[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("org_id", orgId)
      .order("display_name", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching org profiles:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching org profiles:", error)
    return []
  }
}

/**
 * Get profiles by role
 */
export async function getProfilesByRole(role: string): Promise<Profile[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", role)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching profiles by role:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching profiles by role:", error)
    return []
  }
}

/**
 * Create or update a user profile
 */
export async function upsertProfile(profile: Profile): Promise<Profile | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from("profiles")
      .upsert(profile as any)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error upserting profile:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("[v0] Unexpected error upserting profile:", error)
    return null
  }
}

/**
 * Update user profile
 */
export async function updateProfile(
  userId: string,
  updates: Partial<Omit<Profile, "user_id" | "created_at">>
): Promise<Profile | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates as any)
      .eq("user_id", userId)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error updating profile:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("[v0] Unexpected error updating profile:", error)
    return null
  }
}

/**
 * Search profiles by display name
 */
export async function searchProfiles(query: string, limit: number = 10): Promise<Profile[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .or(`display_name.ilike.%${query}%,name.ilike.%${query}%,surname.ilike.%${query}%`)
      .limit(limit)

    if (error) {
      console.error("[v0] Error searching profiles:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error searching profiles:", error)
    return []
  }
}

/**
 * Delete a profile
 */
export async function deleteProfile(userId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return false

  try {
    const { error } = await supabase.from("profiles").delete().eq("user_id", userId)

    if (error) {
      console.error("[v0] Error deleting profile:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("[v0] Unexpected error deleting profile:", error)
    return false
  }
}

/**
 * Get profiles by organization and role
 */
export async function getOrgProfilesByRole(orgId: string, role: string): Promise<Profile[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("org_id", orgId)
      .eq("role", role)
      .order("display_name", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching org profiles by role:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching org profiles by role:", error)
    return []
  }
}

/**
 * Get profile count by organization
 */
export async function getOrgProfileCount(orgId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return 0

  try {
    const { count, error } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)

    if (error) {
      console.error("[v0] Error counting org profiles:", error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error("[v0] Unexpected error counting org profiles:", error)
    return 0
  }
}
