import { NextResponse, type NextRequest } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"

type RouteContext = { params: Promise<{ eventId: string }> }

const MANAGER_ROLES = new Set(["admin", "organizer", "organizer_owner", "organizer_admin"])
const EVENT_STAFF_ROLES = new Set(["scanner", "organizer_staff", "organizer_admin"])

async function getUserId() {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

async function canManage(admin: ReturnType<typeof createAdminClient>, eventId: string, userId: string) {
  const { data: event, error } = await admin.from("events").select("id, org_id").eq("id", eventId).maybeSingle()
  if (error) throw error
  if (!event) return { allowed: false, event: null }

  const { data: globalAdmin } = await admin.from("admin_users").select("user_id").eq("user_id", userId).eq("active", true).maybeSingle()
  if (globalAdmin) return { allowed: true, event }

  const { data: member } = await admin.from("org_members").select("role").eq("org_id", event.org_id).eq("user_id", userId).maybeSingle()
  return { allowed: Boolean(member?.role && MANAGER_ROLES.has(String(member.role))), event }
}

async function findUserByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  let page = 1
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 })
    if (error) throw error
    const user = data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase())
    if (user) return user
    if (data.users.length < 100) break
    page += 1
  }
  return null
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const admin = createAdminClient()
  const { allowed, event } = await canManage(admin, eventId, userId)
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: "Permission denied" }, { status: 403 })

  const { data, error } = await admin
    .from("event_staff")
    .select("event_id, user_id, role, active, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const staff = await Promise.all(
    (data ?? []).map(async (row) => {
      const { data: authUser } = await admin.auth.admin.getUserById(row.user_id)
      return { ...row, email: authUser?.user?.email ?? null }
    })
  )

  return NextResponse.json({ staff })
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const actorId = await getUserId()
  if (!actorId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const admin = createAdminClient()
  const { allowed, event } = await canManage(admin, eventId, actorId)
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: "Permission denied" }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
  const role = typeof body.role === "string" ? body.role : "scanner"

  if (!email || !email.includes("@")) return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
  if (!EVENT_STAFF_ROLES.has(role)) return NextResponse.json({ error: "Invalid staff role" }, { status: 400 })

  const user = await findUserByEmail(admin, email)
  if (!user) return NextResponse.json({ error: "User must sign up before being added as event staff" }, { status: 404 })

  const { data: staff, error } = await admin
    .from("event_staff")
    .upsert({ event_id: eventId, user_id: user.id, role, active: true }, { onConflict: "event_id,user_id" })
    .select("event_id, user_id, role, active, created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await admin.from("audit_log").insert({
    org_id: event.org_id,
    actor_id: actorId,
    table_name: "event_staff",
    record_id: user.id,
    action: "insert",
    changes: { event_id: eventId, role },
  })

  return NextResponse.json({ staff: { ...staff, email: user.email ?? email } }, { status: 201 })
}
