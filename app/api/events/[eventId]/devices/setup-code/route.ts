import { NextResponse, type NextRequest } from "next/server"

import {
  createDeviceSetupCode,
  DeviceProvisioningError,
  type ProvisionedDeviceRole,
} from "@/lib/scanner/device-provisioning"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ eventId: string }> }

const MANAGER_ROLES = new Set(["admin", "organizer", "organizer_owner", "organizer_admin"])
const SUPPORTED_ROLES = new Set<ProvisionedDeviceRole>([
  "organizer_scanner",
  "organizer_pos",
  "organizer_kiosk",
])

function parseDeviceRole(value: unknown): ProvisionedDeviceRole {
  return SUPPORTED_ROLES.has(value as ProvisionedDeviceRole)
    ? (value as ProvisionedDeviceRole)
    : "organizer_scanner"
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
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

  // Platform admins manage every org's devices (the DB RLS already treats them
  // as org managers). read_only_admin is excluded from this mutating action.
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

  const body = await request.json().catch(() => ({}))

  try {
    const setupCode = await createDeviceSetupCode({
      orgId: event.org_id,
      eventId: event.id,
      createdBy: session.user.id,
      label: typeof body.label === "string" ? body.label : "Gate scanner",
      deviceRole: parseDeviceRole(body.deviceRole),
      maxScansPerMinute: body.maxScansPerMinute,
    })

    return NextResponse.json(setupCode, { status: 201 })
  } catch (error) {
    if (error instanceof DeviceProvisioningError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Failed to create scanner setup code", error)
    return NextResponse.json({ error: "Unable to create setup code" }, { status: 500 })
  }
}
