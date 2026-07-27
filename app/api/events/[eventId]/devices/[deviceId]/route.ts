import { NextResponse, type NextRequest } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ eventId: string; deviceId: string }> }

const MANAGER_ROLES = new Set(["admin", "organizer", "organizer_owner", "organizer_admin"])

// Unassign a device from this event. Direct client writes to `devices` are
// revoked from the authenticated role (remove_dangerous_client_table_privileges),
// so removal must go through this server route, which authorizes the caller and
// mutates with the service role — mirroring the setup-code creation flow.
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { eventId, deviceId } = await context.params
  const supabase = createServerSupabaseClient()
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 })

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()
  if (sessionError) return NextResponse.json({ error: "Failed to verify session" }, { status: 500 })
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, org_id")
    .eq("id", eventId)
    .maybeSingle()
  if (eventError) return NextResponse.json({ error: "Unable to load event" }, { status: 500 })
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })

  const { data: member, error: memberError } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", event.org_id)
    .eq("user_id", session.user.id)
    .maybeSingle()
  if (memberError) return NextResponse.json({ error: "Unable to verify organizer access" }, { status: 500 })

  const isOrgManager = Boolean(member?.role && MANAGER_ROLES.has(String(member.role)))

  // Platform admins manage every org's devices (matches the DB RLS). read_only_admin excluded.
  let isPlatformManager = false
  if (!isOrgManager) {
    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("role_tier")
      .eq("user_id", session.user.id)
      .eq("active", true)
      .maybeSingle()
    isPlatformManager = Boolean(adminRow?.role_tier && adminRow.role_tier !== "read_only_admin")
  }

  if (!isOrgManager && !isPlatformManager) {
    return NextResponse.json({ error: "Organizer manager access required" }, { status: 403 })
  }

  const admin = createAdminClient()
  const { error: updateError } = await admin
    .from("devices")
    .update({ event_id: null })
    .eq("id", deviceId)
    .eq("org_id", event.org_id)

  if (updateError) return NextResponse.json({ error: "Unable to remove device" }, { status: 500 })

  return NextResponse.json({ ok: true }, { status: 200 })
}
