import { NextResponse, type NextRequest } from "next/server"

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
    .select("id, org_id, starts_at, ends_at, tz")
    .eq("id", eventId)
    .maybeSingle()
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

  const { data: dates, error } = await admin
    .from("event_dates")
    .select("id, starts_at, ends_at")
    .eq("event_id", eventId)
    .order("starts_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ event, dates: dates ?? [] })
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
  const startsAt = typeof body.starts_at === "string" ? body.starts_at : ""
  const endsAt = typeof body.ends_at === "string" ? body.ends_at : ""
  const tz = typeof body.tz === "string" && body.tz.trim() ? body.tz.trim() : "Africa/Mbabane"

  const startDate = new Date(startsAt)
  const endDate = new Date(endsAt)

  if (!startsAt || Number.isNaN(startDate.getTime())) {
    return NextResponse.json({ error: "Valid start date and time is required" }, { status: 400 })
  }

  if (!endsAt || Number.isNaN(endDate.getTime())) {
    return NextResponse.json({ error: "Valid end date and time is required" }, { status: 400 })
  }

  if (endDate <= startDate) {
    return NextResponse.json({ error: "End date must be after start date" }, { status: 400 })
  }

  const startIso = startDate.toISOString()
  const endIso = endDate.toISOString()

  const { data: updatedEvent, error: updateError } = await admin
    .from("events")
    .update({ starts_at: startIso, ends_at: endIso, tz })
    .eq("id", eventId)
    .select("id, org_id, starts_at, ends_at, tz")
    .maybeSingle()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })

  await admin.from("event_dates").delete().eq("event_id", eventId)
  const { error: dateError } = await admin.from("event_dates").insert({ event_id: eventId, starts_at: startIso, ends_at: endIso })
  if (dateError) return NextResponse.json({ error: dateError.message }, { status: 400 })

  await admin.from("audit_log").insert({
    org_id: event.org_id,
    actor_id: userId,
    table_name: "events",
    record_id: eventId,
    action: "update",
    changes: { starts_at: startIso, ends_at: endIso, tz },
  })

  return NextResponse.json({ event: updatedEvent })
}
