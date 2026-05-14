import { NextResponse, type NextRequest } from "next/server"

import { notifyEventChanged, notifyEventPublished } from "@/lib/notifications"
import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"

type RouteContext = { params: Promise<{ eventId: string }> }
const MANAGER_ROLES = new Set(["admin", "organizer", "organizer_owner", "organizer_admin"])

async function getUserId() {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

async function loadManageContext(admin: ReturnType<typeof createAdminClient>, eventId: string, userId: string) {
  const { data: event, error } = await admin
    .from("events")
    .select("id, org_id, title, category, venue_id, starts_at, ends_at, status, visibility")
    .eq("id", eventId)
    .maybeSingle()
  if (error) throw error
  if (!event) return { allowed: false, event: null }

  const { data: globalAdmin } = await admin.from("admin_users").select("user_id").eq("user_id", userId).eq("active", true).maybeSingle()
  if (globalAdmin) return { allowed: true, event }

  const { data: member } = await admin.from("org_members").select("role").eq("org_id", event.org_id).eq("user_id", userId).maybeSingle()
  return { allowed: Boolean(member?.role && MANAGER_ROLES.has(String(member.role))), event }
}

async function buildReadiness(admin: ReturnType<typeof createAdminClient>, event: any) {
  const [{ count: ticketCount }, { count: dateCount }] = await Promise.all([
    admin.from("ticket_types").select("id", { count: "exact", head: true }).eq("event_id", event.id),
    admin.from("event_dates").select("id", { count: "exact", head: true }).eq("event_id", event.id),
  ])

  const checks = [
    { key: "title", label: "Event title", complete: Boolean(event.title?.trim()) },
    { key: "category", label: "Category", complete: Boolean(event.category) },
    { key: "venue", label: "Venue", complete: Boolean(event.venue_id) },
    { key: "date", label: "Date and time", complete: Boolean(event.starts_at && event.ends_at) || (dateCount ?? 0) > 0 },
    { key: "tickets", label: "Ticket type", complete: (ticketCount ?? 0) > 0 },
  ]

  return { checks, ready: checks.every((check) => check.complete) }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const admin = createAdminClient()
  const { allowed, event } = await loadManageContext(admin, eventId, userId)
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: "Permission denied" }, { status: 403 })

  const readiness = await buildReadiness(admin, event)
  return NextResponse.json({ event, readiness })
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const admin = createAdminClient()
  const { allowed, event } = await loadManageContext(admin, eventId, userId)
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: "Permission denied" }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const publish = Boolean(body.publish)
  const readiness = await buildReadiness(admin, event)

  if (publish && !readiness.ready) {
    return NextResponse.json({ error: "Complete the readiness checklist before publishing.", readiness }, { status: 400 })
  }

  const nextStatus = publish ? "published" : "draft"
  const { data: updatedEvent, error } = await admin
    .from("events")
    .update({ status: nextStatus, published_at: publish ? new Date().toISOString() : null, visibility: publish ? "public" : event.visibility })
    .eq("id", eventId)
    .select("id, org_id, title, category, venue_id, starts_at, ends_at, status, visibility")
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await admin.from("audit_log").insert({
    org_id: event.org_id,
    actor_id: userId,
    table_name: "events",
    record_id: eventId,
    action: "update",
    changes: { status: nextStatus },
  })

  if (publish && event.status !== "published") {
    await notifyEventPublished({ orgId: event.org_id, eventId, title: updatedEvent?.title ?? event.title, actorId: userId })
  } else if (!publish && event.status === "published") {
    await notifyEventChanged({ orgId: event.org_id, eventId, title: updatedEvent?.title ?? event.title, changeType: "unpublished", actorId: userId, changes: { status: nextStatus } })
  }

  const nextReadiness = await buildReadiness(admin, updatedEvent)
  return NextResponse.json({ event: updatedEvent, readiness: nextReadiness })
}
