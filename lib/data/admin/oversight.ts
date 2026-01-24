"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface Job {
  id: string
  job_type: string
  status: "pending" | "processing" | "completed" | "failed"
  payload?: Record<string, unknown>
  result?: Record<string, unknown>
  error?: string
  scheduled_at: string
  started_at?: string
  completed_at?: string
  created_at: string
}

export interface Webhook {
  id: string
  event_type: string
  url: string
  is_active: boolean
  created_at: string
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
export async function getJobs(filters?: { status?: string; jobType?: string; limit?: number }): Promise<Job[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    let query = supabase.from("jobs").select("*")

    if (filters?.status) {
      query = query.eq("status", filters.status)
    }

    if (filters?.jobType) {
      query = query.eq("job_type", filters.jobType)
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
