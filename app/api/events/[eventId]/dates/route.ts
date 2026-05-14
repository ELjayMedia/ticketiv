import { NextResponse, type NextRequest } from "next/server"

import { notifyEventChanged } from "@/lib/notifications"
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
  const { data: event, error } = await admin.from("events").select("id, org_id, title").eq("id", eventId).maybeSingle()
  if (error) throw error
  if (!event) return { allowed: false, event: null }

  const { data: globalAdmin } = await admin.from("admin_users").select("user_id").eq("user_id", userId).eq("active", true).maybeSingle()
  if (globalAdmin) return { allowed: true, event }

  const { data: member } = await admin.from("org_members").select("role").eq("org_id", event.org_id).eq("user_id", userId).maybeSingle()
  return { allowed: Boolean(member?.role && MANAGER_ROLES.has(String(member.role))), event }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const admin = createAdminClient()
  const { allowed, event } = await loadManageContext(admin, eventId, userId)
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: "Permission denied" }, { status: 403 })

  const { data, error } = await admin.from("event_dates").select("id, starts_at, ends_at").eq("event_id", eventId).order("starts_at", { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ dates: data ?? [] })
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
  const dates = Array.isArray(body.dates) ? body.dates : []
  const normalized = dates
    .map((item: any) => ({ starts_at: item.starts_at || null, ends_at: item.ends_at || null }))
    .filter((item: any) => item.starts_at && item.ends_at)
    .sort((a: any, b: any) => String(a.starts_at).localeCompare(String(b.starts_at)))

  if (normalized.length === 0) return NextResponse.json({ error: "At least one event date is required" }, { status: 400 })

  await admin.from("event_dates").delete().eq("event_id", eventId)
  const { data, error } = await admin
    .from("event_dates")
    .insert(normalized.map((item: any) => ({ event_id: eventId, starts_at: item.starts_at, ends_at: item.ends_at })))
    .select("id, starts_at, ends_at")

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const first = normalized[0]
  const last = normalized[normalized.length - 1]
  await admin.from("events").update({ starts_at: first.starts_at, ends_at: last.ends_at }).eq("id", eventId)

  await admin.from("audit_log").insert({
    org_id: event.org_id,
    actor_id: userId,
    table_name: "event_dates",
    record_id: eventId,
    action: "update",
    changes: { count: normalized.length, dates: normalized },
  })

  await notifyEventChanged({ orgId: event.org_id, eventId, title: event.title, changeType: "schedule_updated", actorId: userId, changes: { count: normalized.length } })

  return NextResponse.json({ dates: data ?? [] })
}
