import { NextResponse, type NextRequest } from "next/server"

import { isEventManager } from "@/lib/events/manage-access"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/auth/session"

type RouteContext = { params: Promise<{ eventId: string; userId: string }> }

async function getUserId() {
  return (await getAuthUser())?.id ?? null
}

async function canManage(admin: ReturnType<typeof createAdminClient>, eventId: string, userId: string) {
  const { data: event, error } = await admin.from("events").select("id, org_id").eq("id", eventId).maybeSingle()
  if (error) throw error
  if (!event) return { allowed: false, event: null }

  const { data: globalAdmin } = await admin.from("admin_users").select("role_tier").eq("user_id", userId).eq("active", true).maybeSingle()
  if (globalAdmin && globalAdmin.role_tier !== "read_only_admin") return { allowed: true, event }

  return { allowed: await isEventManager(admin, event, userId), event }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { eventId, userId } = await context.params
  const actorId = await getUserId()
  if (!actorId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const admin = createAdminClient()
  const { allowed, event } = await canManage(admin, eventId, actorId)
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: "Permission denied" }, { status: 403 })

  const { error } = await admin.from("event_staff").update({ active: false }).eq("event_id", eventId).eq("user_id", userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await admin.from("audit_log").insert({
    org_id: event.org_id,
    actor_id: actorId,
    table_name: "event_staff",
    record_id: userId,
    action: "update",
    changes: { active: false },
  })

  return NextResponse.json({ ok: true })
}
