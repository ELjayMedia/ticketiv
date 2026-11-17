import "server-only"

import { untyped } from "@/lib/data/admin/console"
import type { DuplicateRequestReason, DuplicateRequestStatus } from "@/lib/events/duplicates-core"
import { createAdminClient } from "@/lib/supabase/admin"

// Admin console: duplicate-event permission requests. Service-role reads,
// called only from pages behind requireAdminRole().

export interface AdminDuplicateEvent {
  id: string
  title: string
  slug: string | null
  status: string
  startsAt: string | null
  venueName: string | null
  org: { id: string; name: string }
}

export interface AdminDuplicateRequest {
  id: string
  status: DuplicateRequestStatus
  reason: DuplicateRequestReason
  message: string
  supportNote: string | null
  forwardedBy: "support" | "auto" | null
  forwardedAt: string | null
  decidedByRole: "support" | "organiser" | null
  decisionNote: string | null
  decidedAt: string | null
  createdAt: string
  event: AdminDuplicateEvent
  original: AdminDuplicateEvent
}

const EVENT_FIELDS = "id, title, slug, status, starts_at, venues(name), organizations(id, name)"

function mapEvent(row: any): AdminDuplicateEvent {
  return {
    id: row?.id ?? "",
    title: row?.title ?? "Untitled event",
    slug: row?.slug ?? null,
    status: String(row?.status ?? "draft"),
    startsAt: row?.starts_at ?? null,
    venueName: row?.venues?.name ?? null,
    org: { id: row?.organizations?.id ?? "", name: row?.organizations?.name ?? "Organiser" },
  }
}

export type DuplicateFilter = "support" | "organiser" | "closed"

export async function listDuplicateRequests(filter: DuplicateFilter): Promise<AdminDuplicateRequest[]> {
  const db = untyped(createAdminClient())
  const statuses = filter === "support" ? ["with_support"] : filter === "organiser" ? ["with_organiser"] : ["approved", "declined", "withdrawn"]
  const { data, error } = await db
    .from("event_duplicate_requests")
    .select(
      `id, status, reason, message, support_note, forwarded_by, forwarded_at, decided_by_role, decision_note, decided_at, created_at,
       event:events!event_duplicate_requests_event_id_fkey(${EVENT_FIELDS}),
       original:events!event_duplicate_requests_original_event_id_fkey(${EVENT_FIELDS})`,
    )
    .in("status", statuses)
    .order("created_at", { ascending: filter !== "closed" })
    .limit(100)
  if (error) {
    console.error("[admin] duplicate requests", error.code)
    return []
  }
  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    status: row.status,
    reason: row.reason,
    message: row.message,
    supportNote: row.support_note,
    forwardedBy: row.forwarded_by,
    forwardedAt: row.forwarded_at,
    decidedByRole: row.decided_by_role,
    decisionNote: row.decision_note,
    decidedAt: row.decided_at,
    createdAt: row.created_at,
    event: mapEvent(row.event),
    original: mapEvent(row.original),
  }))
}
