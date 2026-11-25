import { NextResponse, type NextRequest } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { sponsorErrorMessage, type EventSponsor, type LibrarySponsor } from "@/lib/sponsors"

// Event wizard → Sponsors. GET returns the event's sponsors and the shared
// sponsor directory (searchable); POST finds or adds a sponsor (filling in a
// missing logo or website only) or replaces the event's list. Writes go through
// RPCs with the caller's session, which re-check they can manage the organisation.
// Changing an existing logo is a super-admin job (command centre → Sponsors).

type RouteContext = { params: Promise<{ eventId: string }> }
type Untyped = { from: (t: string) => any }

const MANAGER_ROLES = new Set(["admin", "organizer", "organizer_owner", "organizer_admin"])
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function caller() {
  const supabase = createServerSupabaseClient()
  if (!supabase) return { supabase: null, userId: null }
  const { data } = await supabase.auth.getUser()
  return { supabase, userId: data.user?.id ?? null }
}

async function canManage(admin: ReturnType<typeof createAdminClient>, eventId: string, userId: string, readOnly = false) {
  const { data: event, error } = await admin.from("events").select("id, org_id").eq("id", eventId).maybeSingle()
  if (error) throw error
  if (!event) return { allowed: false, event: null }
  const { data: globalAdmin } = await admin.from("admin_users").select("role_tier").eq("user_id", userId).eq("active", true).maybeSingle()
  if (globalAdmin && (readOnly || globalAdmin.role_tier !== "read_only_admin")) return { allowed: true, event }
  const { data: member } = await admin.from("org_members").select("role").eq("org_id", event.org_id).eq("user_id", userId).maybeSingle()
  return { allowed: Boolean(member?.role && MANAGER_ROLES.has(String(member.role))), event }
}

async function load(eventId: string, query: string) {
  const db = createAdminClient() as unknown as Untyped
  let library = db.from("sponsors").select("id, name, logo_url, website_url").order("name").limit(query ? 20 : 100)
  if (query) library = library.ilike("name", `%${query.replace(/[%_,()]/g, "")}%`)
  const [{ data: rows, error: rowsError }, { data: lib, error: libError }] = await Promise.all([
    db
      .from("event_sponsors")
      .select("featured, sort_order, sponsors:sponsor_id(id, name, logo_url, website_url)")
      .eq("event_id", eventId)
      .order("sort_order"),
    library,
  ])
  if (rowsError) throw rowsError
  if (libError) throw libError
  const sponsors: EventSponsor[] = ((rows ?? []) as { featured: boolean; sponsors: { id: string; name: string; logo_url: string | null; website_url: string | null } | null }[])
    .filter((r) => r.sponsors)
    .map((r) => ({ id: r.sponsors!.id, name: r.sponsors!.name, logoUrl: r.sponsors!.logo_url, websiteUrl: r.sponsors!.website_url, featured: Boolean(r.featured) }))
  const libraryRows: LibrarySponsor[] = ((lib ?? []) as { id: string; name: string; logo_url: string | null; website_url: string | null }[]).map((s) => ({
    id: s.id,
    name: s.name,
    logoUrl: s.logo_url,
    websiteUrl: s.website_url,
  }))
  return { sponsors, library: libraryRows }
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const { userId } = await caller()
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const admin = createAdminClient()
  const { allowed, event } = await canManage(admin, eventId, userId, true)
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: "You do not have permission to manage this event" }, { status: 403 })
  const query = request.nextUrl.searchParams.get("q")?.trim().slice(0, 80) ?? ""
  return NextResponse.json(await load(eventId, query))
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const { supabase, userId } = await caller()
  if (!supabase || !userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const admin = createAdminClient()
  const { allowed, event } = await canManage(admin, eventId, userId)
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: "You do not have permission to manage this event" }, { status: 403 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const text = (v: unknown) => (typeof v === "string" ? v.trim() : "")

  if (body.action === "save_sponsor") {
    const sponsorId = text(body.sponsor_id)
    if (sponsorId && !UUID.test(sponsorId)) return NextResponse.json({ error: "Unknown sponsor" }, { status: 400 })
    const { data, error } = await supabase.rpc("fn_save_sponsor", {
      p_org_id: event.org_id,
      p_name: text(body.name) || null,
      p_logo_url: text(body.logo_url) || null,
      p_website_url: text(body.website_url) || null,
      p_sponsor_id: sponsorId || null,
    })
    if (error) return NextResponse.json({ error: sponsorErrorMessage(error) }, { status: 400 })
    return NextResponse.json({ sponsorId: data, ...(await load(eventId, text(body.name).slice(0, 80))) })
  }

  if (body.action === "set_event_sponsors") {
    const list = Array.isArray(body.sponsors) ? body.sponsors : null
    if (!list) return NextResponse.json({ error: "Sponsors are missing" }, { status: 400 })
    const sponsors = list.map((s) => {
      const row = (s ?? {}) as Record<string, unknown>
      return { sponsor_id: text(row.sponsor_id), featured: row.featured === true }
    })
    if (sponsors.some((s) => !UUID.test(s.sponsor_id))) return NextResponse.json({ error: "Unknown sponsor" }, { status: 400 })
    const { error } = await supabase.rpc("fn_event_set_sponsors", { p_event_id: eventId, p_sponsors: sponsors })
    if (error) return NextResponse.json({ error: sponsorErrorMessage(error) }, { status: 400 })
    return NextResponse.json(await load(eventId, ""))
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
