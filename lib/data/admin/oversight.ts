"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface Job {
  id: string
  kind: string
  attempts: number | null
  payload: unknown
  last_error: string | null
  locked_at: string | null
  max_attempts: number | null
  run_after: string | null
  created_at: string | null
}

export interface Webhook {
  id: string
  provider: string
  payload: unknown
  processed_at: string | null
  provider_event_id: string | null
  received_at: string
  signature: string | null
}

/**
 * Get audit logs for platform oversight
 * Reads from: audit_log, app_audit_log
 */
export async function getAuditLogs(filters?: { actorId?: string; table?: string; limit?: number }) {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    let query = supabase.from("audit_log").select("*")

    if (filters?.actorId) {
      query = query.eq("actor_id", filters.actorId)
    }

    if (filters?.table) {
      query = query.eq("table_name", filters.table)
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(filters?.limit || 100)

    if (error) {
      console.error("[v0] Error fetching audit logs:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching audit logs:", error)
    return []
  }
}

/**
 * Get app-level audit logs
 * Reads from: app_audit_log
 */
export async function getAppAuditLogs(limit: number = 100) {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("app_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("[v0] Error fetching app audit logs:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching app audit logs:", error)
    return []
  }
}

/**
 * Get background jobs for monitoring
 * Reads from: jobs
 */
export async function getJobs(filters?: { jobType?: string; limit?: number }): Promise<Job[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    let query = supabase.from("jobs").select("*")

    if (filters?.jobType) {
      query = query.eq("kind", filters.jobType)
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(filters?.limit || 50)

    if (error) {
      console.error("[v0] Error fetching jobs:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching jobs:", error)
    return []
  }
}

/**
 * Get platform webhooks
 * Reads from: webhooks
 */
export async function getPlatformWebhooks(): Promise<Webhook[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase.from("webhooks").select("*")

    if (error) {
      console.error("[v0] Error fetching webhooks:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching webhooks:", error)
    return []
  }
}
