import { NextResponse, type NextRequest } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"

type RouteContext = {
  params: Promise<{ eventId: string }>
}

const MANAGER_ROLES = new Set(["admin", "organizer", "organizer_owner", "organizer_admin"])

async function getAuthenticatedUserId() {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null

  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session?.user?.id ?? null
}

async function canManageEvent(admin: ReturnType<typeof createAdminClient>, eventId: string, userId: string) {
  const { data: event, error } = await admin
    .from("events")
    .select("id, org_id, venue_id")
    .eq("id", eventId)
    .maybeSingle()

  if (error) throw error
  if (!event) return { allowed: false, event: null }

  const { data: adminUser } = await admin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle()

  if (adminUser) return { allowed: true, event }

  const { data: membership } = await admin
    .from("org_members")
    .select("role")
    .eq("org_id", event.org_id)
    .eq("user_id", userId)
    .maybeSingle()

  return { allowed: Boolean(membership?.role && MANAGER_ROLES.has(String(membership.role))), event }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const userId = await getAuthenticatedUserId()

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { allowed, event } = await canManageEvent(admin, eventId, userId)

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 })
  }

  if (!allowed) {
    return NextResponse.json({ error: "You do not have permission to manage this event" }, { status: 403 })
  }

  const [{ data: currentVenue }, { data: venues, error }] = await Promise.all([
    event.venue_id
      ? admin.from("venues").select("id, name, city, address, capacity, tz").eq("id", event.venue_id).maybeSingle()
      : Promise.resolve({ data: null }),
    admin
      .from("venues")
      .select("id, name, city, address, capacity, tz")
      .order("name", { ascending: true })
      .limit(50),
  ])

  if (error) throw error

  return NextResponse.json({ currentVenue, venues: venues ?? [] })
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const userId = await getAuthenticatedUserId()

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { allowed, event } = await canManageEvent(admin, eventId, userId)

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 })
  }

  if (!allowed) {
    return NextResponse.json({ error: "You do not have permission to manage this event" }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const existingVenueId = typeof body.venue_id === "string" ? body.venue_id.trim() : ""
  const name = typeof body.name === "string" ? body.name.trim() : ""
  const city = typeof body.city === "string" ? body.city.trim() : ""
  const address = typeof body.address === "string" ? body.address.trim() : ""
  const tz = typeof body.tz === "string" && body.tz.trim() ? body.tz.trim() : "Africa/Mbabane"
  const capacityValue = body.capacity === "" || body.capacity == null ? null : Number(body.capacity)
  const capacity = Number.isFinite(capacityValue) ? Number(capacityValue) : null

  let venueId = existingVenueId

  if (!venueId) {
    if (!name) {
      return NextResponse.json({ error: "Venue name is required" }, { status: 400 })
    }

    const { data, error } = await admin.rpc("fn_get_or_create_venue", {
      p_name: name,
      p_city: city || null,
      p_address: address || null,
      p_tz: tz,
      p_capacity: capacity,
    })

    if (error) {
      console.error("[events/venue] Failed to get or create venue:", error.message)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    venueId = String(data)
  }

  const { data: venue, error: venueError } = await admin
    .from("venues")
    .select("id, name, city, address, capacity, tz")
    .eq("id", venueId)
    .maybeSingle()

  if (venueError) throw venueError
  if (!venue) return NextResponse.json({ error: "Venue not found" }, { status: 404 })

  const { error: updateError } = await admin
    .from("events")
    .update({ venue_id: venue.id, city: venue.city ?? city || null })
    .eq("id", eventId)

  if (updateError) {
    console.error("[events/venue] Failed to update event venue:", updateError.message)
    return NextResponse.json({ error: updateError.message }, { status: 400 })
  }

  await admin.from("audit_log").insert({
    org_id: event.org_id,
    actor_id: userId,
    table_name: "events",
    record_id: eventId,
    action: "update",
    changes: { venue_id: venue.id },
  })

  return NextResponse.json({ venue })
}
