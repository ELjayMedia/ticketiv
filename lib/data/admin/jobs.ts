// Source: jobs table (flat). Group by kind for the queue overview;
// derive backlog from attempts < max AND run_after < now AND locked_at IS NULL.

import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"

export interface JobRow {
  id: string
  kind: string
  payload: unknown
  run_after: string | null
  attempts: number
  max_attempts: number
  last_error: string | null
  created_at: string
  locked_at: string | null
}

export interface JobKindStat {
  kind: string
  total: number
  pending: number
  in_flight: number
  failed: number
  oldest_pending_iso: string | null
}

export interface JobsOverview {
  totals: {
    total: number
    pending: number
    in_flight: number
    failed: number
  }
  byKind: JobKindStat[]
  recent: JobRow[]
}

export async function getJobsOverview(): Promise<JobsOverview> {
  const admin = createAdminClient()
  const now = new Date().toISOString()

  const { data, error } = await admin
    .from("jobs")
    .select("id, kind, payload, run_after, attempts, max_attempts, last_error, created_at, locked_at")
    .order("created_at", { ascending: false })
    .limit(500)

  if (error) {
    console.error("[admin/jobs] list failed", error)
    return {
      totals: { total: 0, pending: 0, in_flight: 0, failed: 0 },
      byKind: [],
      recent: [],
    }
  }

  const rows = (data ?? []) as JobRow[]
  const byKind = new Map<string, JobKindStat>()
  let pending = 0
  let inFlight = 0
  let failed = 0

  for (const j of rows) {
    const k = j.kind
    if (!byKind.has(k)) {
      byKind.set(k, {
        kind: k,
        total: 0,
        pending: 0,
        in_flight: 0,
        failed: 0,
        oldest_pending_iso: null,
      })
    }
    const stat = byKind.get(k)!
    stat.total += 1

    const isFailed = j.attempts >= j.max_attempts && Boolean(j.last_error)
    const isInFlight = Boolean(j.locked_at)
    const isPending =
      !isInFlight &&
      !isFailed &&
      (j.run_after === null || j.run_after <= now)

    if (isFailed) {
      stat.failed += 1
      failed += 1
    } else if (isInFlight) {
      stat.in_flight += 1
      inFlight += 1
    } else if (isPending) {
      stat.pending += 1
      pending += 1
      if (!stat.oldest_pending_iso || j.created_at < stat.oldest_pending_iso) {
        stat.oldest_pending_iso = j.created_at
      }
    }
  }

  const sortedKinds = [...byKind.values()].sort((a, b) => b.total - a.total)

  return {
    totals: {
      total: rows.length,
      pending,
      in_flight: inFlight,
      failed,
    },
    byKind: sortedKinds,
    recent: rows.slice(0, 50),
  }
}
