"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export type AuditAction = "INSERT" | "UPDATE" | "DELETE"

export async function getAuditLogs(filters?: { orgId?: string; actorId?: string; tableName?: string; limit?: number; offset?: number }) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return []

  try {
    let query = supabase.from("audit_log").select("*")

    if (filters?.orgId) {
      query = query.eq("org_id", filters.orgId)
    }

    if (filters?.actorId) {
      query = query.eq("actor_id", filters.actorId)
    }

    if (filters?.tableName) {
      query = query.eq("table_name", filters.tableName)
    }

    query = query.order("created_at", { ascending: false })

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
    }

    const { data, error } = await query

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

export async function logAuditEvent(auditLog: {
  orgId?: string
  actorId?: string
  tableName: string
  recordId?: string
  action: AuditAction
  changes?: Record<string, unknown>
  ip?: string
  userAgent?: string
}) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from("audit_log")
      .insert([
        {
          org_id: auditLog.orgId,
          actor_id: auditLog.actorId,
          table_name: auditLog.tableName,
          record_id: auditLog.recordId,
          action: auditLog.action,
          changes: auditLog.changes,
          ip: auditLog.ip,
          user_agent: auditLog.userAgent,
        },
      ])
      .select()

    if (error) {
      console.error("[v0] Error logging audit event:", error)
      return null
    }

    return data?.[0] || null
  } catch (error) {
    console.error("[v0] Unexpected error logging audit event:", error)
    return null
  }
}

export async function getAuditLogsByRecord(tableName: string, recordId: string) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("audit_log")
      .select("*")
      .eq("table_name", tableName)
      .eq("record_id", recordId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching record audit logs:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching record audit logs:", error)
    return []
  }
}

export async function deleteAuditLog(auditLogId: string) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return false

  try {
    const { error } = await supabase
      .from("audit_log")
      .delete()
      .eq("id", auditLogId)

    if (error) {
      console.error("[v0] Error deleting audit log:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("[v0] Unexpected error deleting audit log:", error)
    return false
  }
}
