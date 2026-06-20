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
  const { data: event, error } = await admin.from("events").select("id, org_id, venue_id").eq("id", eventId).maybeSingle()
  if (error) throw error
  if (!event) return { allowed: false, event: null }

  const { data: adminUser } = await admin.from("admin_users").select("user_id").eq("user_id", userId).eq("active", true).maybeSingle()
  if (adminUser) return { allowed: true, event }

  const { data: membership } = await admin.from("org_members").select("role").eq("org_id", event.org_id).eq("user_id", userId).maybeSingle()
  return { allowed: Boolean(membership?.role && MANAGER_ROLES.has(String(membership.role))), event }
}

function normalizeCapacity(value: unknown) {
  if (value === "" || value == null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : null
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const userId = await getAuthenticatedUserId()
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const admin = createAdminClient()
  const { allowed, event } = await canManageEvent(admin, eventId, userId)
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: "You do not have permission to manage this event" }, { status: 403 })

  const search = request.nextUrl.searchParams.get("q")?.trim() ?? ""
  let venuesQuery = admin.from("venues").select("id, name, city, address, capacity, tz").order("name", { ascending: true }).limit(search ? 12 : 50)

  if (search) {
    const escaped = search.replace(/[%_]/g, "")
    venuesQuery = venuesQuery.or(`name.ilike.%${escaped}%,city.ilike.%${escaped}%,address.ilike.%${escaped}%`)
  }

  const [{ data: currentVenue }, { data: venues, error }] = await Promise.all([
    event.venue_id ? admin.from("venues").select("id, name, city, address, capacity, tz").eq("id", event.venue_id).maybeSingle() : Promise.resolve({ data: null }),
    venuesQuery,
  ])

  if (error) throw error
  return NextResponse.json({ currentVenue, venues: venues ?? [] })
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const userId = await getAuthenticatedUserId()
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const admin = createAdminClient()
  const { allowed, event } = await canManageEvent(admin, eventId, userId)
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: "You do not have permission to manage this event" }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const existingVenueId = normalizeText(body.venue_id)
  const name = normalizeText(body.name)
  const city = normalizeText(body.city)
  const address = normalizeText(body.address)
  const tz = normalizeText(body.tz) || "Africa/Mbabane"
  const capacity = normalizeCapacity(body.capacity)

  let venueId = existingVenueId

  if (!venueId) {
    if (!name) return NextResponse.json({ error: "Venue name is required" }, { status: 400 })

    const { data, error } = await admin.rpc("fn_get_or_create_venue", {
      p_name: name,
      p_city: city || undefined,
      p_address: address || undefined,
      p_tz: tz,
      p_capacity: capacity ?? undefined,
    })

    if (error) {
      console.error("[events/venue] Failed to get or create venue:", error.message)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    venueId = String(data)
  }

  const { data: venue, error: venueError } = await admin.from("venues").select("id, name, city, address, capacity, tz").eq("id", venueId).maybeSingle()
  if (venueError) throw venueError
  if (!venue) return NextResponse.json({ error: "Venue not found" }, { status: 404 })

  const nextCity = venue.city ?? (city || null)
  const { error: updateError } = await admin.from("events").update({ venue_id: venue.id, city: nextCity }).eq("id", eventId)
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
    changes: { venue_id: venue.id, venue_name: venue.name, city: venue.city },
  })

  return NextResponse.json({ venue })
}
