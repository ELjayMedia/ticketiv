import { NextResponse, type NextRequest } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"

type RouteContext = { params: Promise<{ eventId: string; ticketTypeId: string }> }

const MANAGER_ROLES = new Set(["admin", "organizer", "organizer_owner", "organizer_admin"])

async function getUserId() {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

async function loadManageContext(admin: ReturnType<typeof createAdminClient>, eventId: string, userId: string) {
  const { data: event, error } = await admin.from("events").select("id, org_id").eq("id", eventId).maybeSingle()
  if (error) throw error
  if (!event) return { allowed: false, event: null }

  const { data: globalAdmin } = await admin.from("admin_users").select("user_id").eq("user_id", userId).eq("active", true).maybeSingle()
  if (globalAdmin) return { allowed: true, event }

  const { data: member } = await admin.from("org_members").select("role").eq("org_id", event.org_id).eq("user_id", userId).maybeSingle()
  return { allowed: Boolean(member?.role && MANAGER_ROLES.has(String(member.role))), event }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { eventId, ticketTypeId } = await context.params
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const admin = createAdminClient()
  const { allowed, event } = await loadManageContext(admin, eventId, userId)
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: "Permission denied" }, { status: 403 })

  const { data: existing, error: loadError } = await admin
    .from("ticket_types")
    .select("id, event_id, name")
    .eq("id", ticketTypeId)
    .eq("event_id", eventId)
    .maybeSingle()

  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 400 })
  if (!existing) return NextResponse.json({ error: "Ticket type not found" }, { status: 404 })

  const { count } = await admin
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("ticket_type_id", ticketTypeId)

  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: "This ticket type already has issued tickets. Hide or pause sales instead of deleting it." }, { status: 409 })
  }

  await admin.from("ticket_type_channels").delete().eq("ticket_type_id", ticketTypeId)
  const { error } = await admin.from("ticket_types").delete().eq("id", ticketTypeId).eq("event_id", eventId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await admin.from("audit_log").insert({
    org_id: event.org_id,
    actor_id: userId,
    table_name: "ticket_types",
    record_id: ticketTypeId,
    action: "delete",
    changes: { event_id: eventId, name: existing.name },
  })

  return NextResponse.json({ ok: true })
}
