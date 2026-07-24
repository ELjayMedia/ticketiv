import { NextResponse, type NextRequest } from "next/server"

import { getAuthenticatedUserId, loadEventManageContext } from "@/lib/api/event-management"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ eventId: string }> }

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const userId = await getAuthenticatedUserId()
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const admin = createAdminClient()
  const { allowed, event } = await loadEventManageContext(admin, eventId, userId, "id, org_id, slug")
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: "Permission denied" }, { status: 403 })

  const [{ data: eventData, error: eventError }, { data: categories, error: categoriesError }] = await Promise.all([
    admin.from("events").select("id, title, description, category, status, visibility, org_id").eq("id", eventId).maybeSingle(),
    admin.from("event_categories").select("id, name, slug, description").eq("is_active", true).order("sort_order", { ascending: true }).order("name", { ascending: true }),
  ])

  if (eventError) return NextResponse.json({ error: eventError.message }, { status: 400 })
  if (categoriesError) return NextResponse.json({ error: categoriesError.message }, { status: 400 })

  return NextResponse.json({ event: eventData, categories: categories ?? [] })
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const userId = await getAuthenticatedUserId()
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const admin = createAdminClient()
  const { allowed, event } = await loadEventManageContext(admin, eventId, userId, "id, org_id, slug")
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: "Permission denied" }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const title = typeof body.title === "string" ? body.title.trim() : ""
  const description = typeof body.description === "string" ? body.description.trim() : ""
  const category = typeof body.category === "string" && body.category.trim() ? body.category.trim() : null

  if (!title) return NextResponse.json({ error: "Event title is required" }, { status: 400 })

  if (category) {
    const { data: categoryRow, error: categoryError } = await admin.from("event_categories").select("slug").eq("slug", category).eq("is_active", true).maybeSingle()
    if (categoryError) return NextResponse.json({ error: categoryError.message }, { status: 400 })
    if (!categoryRow) return NextResponse.json({ error: "Select a valid active event category" }, { status: 400 })
  }

  const { data: updatedEvent, error } = await admin
    .from("events")
    .update({ title, description: description || null, category, slug: event.slug || slugify(title) })
    .eq("id", eventId)
    .select("id, title, description, category, status, visibility, org_id")
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await admin.from("audit_log").insert({ org_id: event.org_id, actor_id: userId, table_name: "events", record_id: eventId, action: "update", changes: { title, category } })

  return NextResponse.json({ event: updatedEvent })
}
