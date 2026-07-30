import { NextResponse, type NextRequest } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"

type RouteContext = { params: Promise<{ eventId: string }> }

const MANAGER_ROLES = new Set(["admin", "organizer", "organizer_owner", "organizer_admin"])

async function getUserId() {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null
  const { data, error } = await supabase.auth.getUser()
  if (error) return null
  return data.user?.id ?? null
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

async function loadManageContext(admin: ReturnType<typeof createAdminClient>, eventId: string, userId: string) {
  const { data: event, error } = await admin.from("events").select("id, org_id, slug").eq("id", eventId).maybeSingle()
  if (error) throw error
  if (!event) return { allowed: false, event: null }

  const { data: globalAdmin } = await admin.from("admin_users").select("user_id").eq("user_id", userId).eq("active", true).maybeSingle()
  if (globalAdmin) return { allowed: true, event }

  const { data: member } = await admin.from("org_members").select("role").eq("org_id", event.org_id).eq("user_id", userId).maybeSingle()
  return { allowed: Boolean(member?.role && MANAGER_ROLES.has(String(member.role))), event }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const admin = createAdminClient()
  const { allowed, event } = await loadManageContext(admin, eventId, userId)
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: "Permission denied" }, { status: 403 })

  const [{ data: eventData, error: eventError }, { data: categories, error: categoriesError }] = await Promise.all([
    admin.from("events").select("id, title, description, category, cover_image_url, status, visibility, org_id").eq("id", eventId).maybeSingle(),
    admin.from("event_categories").select("id, name, slug, description").eq("is_active", true).order("sort_order", { ascending: true }).order("name", { ascending: true }),
  ])

  if (eventError) return NextResponse.json({ error: eventError.message }, { status: 400 })
  if (categoriesError) return NextResponse.json({ error: categoriesError.message }, { status: 400 })

  return NextResponse.json({ event: eventData, categories: categories ?? [] })
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const admin = createAdminClient()
  const { allowed, event } = await loadManageContext(admin, eventId, userId)
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: "Permission denied" }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const title = typeof body.title === "string" ? body.title.trim() : ""
  const description = typeof body.description === "string" ? body.description.trim() : ""
  const category = typeof body.category === "string" && body.category.trim() ? body.category.trim() : null
  const coverImageUrl = typeof body.cover_image_url === "string" && body.cover_image_url.trim()
    ? body.cover_image_url.trim()
    : null

  if (!title) return NextResponse.json({ error: "Event title is required" }, { status: 400 })

  if (category) {
    const { data: categoryRow, error: categoryError } = await admin.from("event_categories").select("slug").eq("slug", category).eq("is_active", true).maybeSingle()
    if (categoryError) return NextResponse.json({ error: categoryError.message }, { status: 400 })
    if (!categoryRow) return NextResponse.json({ error: "Select a valid active event category" }, { status: 400 })
  }

  const { data: updatedEvent, error } = await admin
    .from("events")
    .update({
      title,
      description: description || null,
      category,
      cover_image_url: coverImageUrl,
      slug: event.slug || slugify(title),
    })
    .eq("id", eventId)
    .select("id, title, description, category, cover_image_url, status, visibility, org_id")
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await admin.from("audit_log").insert({
    org_id: event.org_id,
    actor_id: userId,
    table_name: "events",
    record_id: eventId,
    action: "update",
    changes: { title, category, cover_image_url: coverImageUrl },
  })

  return NextResponse.json({ event: updatedEvent })
}
