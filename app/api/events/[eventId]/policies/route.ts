import { NextResponse, type NextRequest } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"

type RouteContext = { params: Promise<{ eventId: string }> }

async function getUserId() {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

async function canEdit(admin: ReturnType<typeof createAdminClient>, eventId: string, userId: string) {
  const { data: event, error } = await admin.from("events").select("id, org_id, refund_policy, attendee_fields, confirmation_message").eq("id", eventId).maybeSingle()
  if (error) throw error
  if (!event) return { ok: false, event: null }

  const { data: adminUser } = await admin.from("admin_users").select("user_id").eq("user_id", userId).eq("active", true).maybeSingle()
  if (adminUser) return { ok: true, event }

  const { data: member } = await admin.from("org_members").select("role").eq("org_id", event.org_id).eq("user_id", userId).maybeSingle()
  const ok = ["admin", "organizer", "organizer_owner", "organizer_admin"].includes(String(member?.role ?? ""))
  return { ok, event }
}

function listFrom(value: unknown) {
  if (Array.isArray(value)) return value.map(String).map((x) => x.trim()).filter(Boolean).slice(0, 20)
  if (typeof value === "string") return value.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 20)
  return []
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const admin = createAdminClient()
  const { ok, event } = await canEdit(admin, eventId, userId)
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  if (!ok) return NextResponse.json({ error: "Not allowed" }, { status: 403 })
  return NextResponse.json({ event })
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const admin = createAdminClient()
  const { ok, event } = await canEdit(admin, eventId, userId)
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  if (!ok) return NextResponse.json({ error: "Not allowed" }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const refundPolicy = typeof body.refund_policy === "string" ? body.refund_policy.trim() : ""
  const confirmationMessage = typeof body.confirmation_message === "string" ? body.confirmation_message.trim() : ""
  const attendeeFields = listFrom(body.attendee_fields)

  const changes = {
    before: {
      refund_policy: event.refund_policy,
      attendee_fields: event.attendee_fields,
      confirmation_message: event.confirmation_message,
    },
    after: {
      refund_policy: refundPolicy || null,
      attendee_fields: attendeeFields,
      confirmation_message: confirmationMessage || null,
    },
  }

  const { data: updatedEvent, error } = await admin
    .from("events")
    .update({ refund_policy: refundPolicy || null, attendee_fields: attendeeFields, confirmation_message: confirmationMessage || null })
    .eq("id", eventId)
    .select("id, org_id, refund_policy, attendee_fields, confirmation_message")
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await admin.from("audit_log").insert({
    org_id: event.org_id,
    actor_id: userId,
    table_name: "events",
    record_id: eventId,
    action: "update",
    changes: { section: "policies", ...changes },
  })

  return NextResponse.json({ event: updatedEvent })
}
