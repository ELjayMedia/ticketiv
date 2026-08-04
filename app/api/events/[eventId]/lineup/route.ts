import { NextResponse, type NextRequest } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"

type RouteContext = { params: Promise<{ eventId: string }> }
const MANAGER_ROLES = new Set(["admin", "organizer", "organizer_owner", "organizer_admin"])

type ArtistRow = {
  id: string
  name: string
  slug: string
  bio: string | null
  image_url: string | null
  primary_user_id: string | null
}

async function getCaller() {
  const supabase = createServerSupabaseClient()
  if (!supabase) return { supabase: null, userId: null }

  const { data, error } = await supabase.auth.getUser()
  if (error) return { supabase, userId: null }

  return { supabase, userId: data.user?.id ?? null }
}

async function canManage(admin: ReturnType<typeof createAdminClient>, eventId: string, userId: string) {
  const { data: event, error } = await admin.from("events").select("id, org_id").eq("id", eventId).maybeSingle()
  if (error) throw error
  if (!event) return { allowed: false, event: null }

  const { data: globalAdmin } = await admin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle()
  if (globalAdmin) return { allowed: true, event }

  const { data: member } = await admin
    .from("org_members")
    .select("role")
    .eq("org_id", event.org_id)
    .eq("user_id", userId)
    .maybeSingle()
  return { allowed: Boolean(member?.role && MANAGER_ROLES.has(String(member.role))), event }
}

function normalizeArtistQuery(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase().slice(0, 80)
}

function safeSearchTerm(value: string) {
  return value.replace(/[%_]/g, "")
}

function publicArtist(row: ArtistRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    bio: row.bio,
    image_url: row.image_url,
    is_claimed: Boolean(row.primary_user_id),
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const { userId } = await getCaller()
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const admin = createAdminClient()
  const { allowed, event } = await canManage(admin, eventId, userId)
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: "Permission denied" }, { status: 403 })

  const { data, error } = await admin
    .from("event_artists")
    .select("event_id, artist_id, role, artists(id, name, slug, bio, image_url, primary_user_id)")
    .eq("event_id", eventId)
    .order("role", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const lineup = (data ?? []).map((item: any) => {
    const artist = Array.isArray(item.artists) ? item.artists[0] : item.artists
    return {
      event_id: item.event_id,
      artist_id: item.artist_id,
      role: item.role,
      artists: artist ? publicArtist(artist as ArtistRow) : null,
    }
  })

  const query = safeSearchTerm(normalizeArtistQuery(request.nextUrl.searchParams.get("q") ?? ""))
  let suggestions: ReturnType<typeof publicArtist>[] = []

  if (query.length >= 2) {
    const { data: artists, error: artistError } = await admin
      .from("artists")
      .select("id, name, slug, bio, image_url, primary_user_id")
      .ilike("name_key", `%${query}%`)
      .order("name", { ascending: true })
      .limit(8)

    if (artistError) return NextResponse.json({ error: artistError.message }, { status: 400 })
    suggestions = ((artists ?? []) as ArtistRow[]).map(publicArtist)
  }

  return NextResponse.json({ lineup, suggestions })
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const { supabase, userId } = await getCaller()
  if (!supabase || !userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const admin = createAdminClient()
  const { allowed, event } = await canManage(admin, eventId, userId)
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: "Permission denied" }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const requestedArtistId = typeof body.artist_id === "string" && body.artist_id.trim() ? body.artist_id.trim() : null
  const role = typeof body.role === "string" && body.role.trim() ? body.role.trim() : "performer"
  const bio = typeof body.bio === "string" ? body.bio.trim() : ""
  const imageUrl = typeof body.image_url === "string" ? body.image_url.trim() : ""

  let name = typeof body.name === "string" ? body.name.trim() : ""
  let selectedArtist: ArtistRow | null = null

  if (requestedArtistId) {
    const { data: existingArtist, error: artistError } = await admin
      .from("artists")
      .select("id, name, slug, bio, image_url, primary_user_id")
      .eq("id", requestedArtistId)
      .maybeSingle()

    if (artistError) return NextResponse.json({ error: artistError.message }, { status: 400 })
    if (!existingArtist) return NextResponse.json({ error: "Artist profile not found" }, { status: 404 })

    selectedArtist = existingArtist as ArtistRow
    name = selectedArtist.name
  }

  if (!name) return NextResponse.json({ error: "Artist name is required" }, { status: 400 })

  // Use the caller-scoped client so auth.uid() and the organizer's claimed-account
  // state reach the RPC. The previous service-role call had no caller identity and
  // therefore always failed with claimed_account_required.
  const { data: linkedArtistId, error } = await supabase.rpc("fn_link_event_artist_by_name", {
    p_event_id: eventId,
    p_artist_name: name,
    p_role: role,
    p_bio: bio || null,
    p_image_url: imageUrl || null,
  })

  if (error) {
    const message = error.message?.includes("claimed_account_required")
      ? "Finish claiming your organizer account before editing this event. Artist profiles themselves do not need to be claimed."
      : error.message
    return NextResponse.json({ error: message }, { status: 400 })
  }

  await admin.from("audit_log").insert({
    org_id: event.org_id,
    actor_id: userId,
    table_name: "event_artists",
    record_id: eventId,
    action: "insert",
    changes: {
      artist_id: linkedArtistId,
      artist_name: name,
      role,
      source: selectedArtist ? "existing_profile" : "name_create_or_reuse",
    },
  })

  return NextResponse.json(
    {
      ok: true,
      artist_id: linkedArtistId,
      selected_existing: Boolean(selectedArtist),
    },
    { status: 201 },
  )
}
