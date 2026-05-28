import { NextResponse, type NextRequest } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"

type RouteContext = { params: Promise<{ eventId: string }> }

const MANAGER_ROLES = new Set(["admin", "organizer", "organizer_owner", "organizer_admin"])

type GuestlistEntryRow = {
  id: string
  event_id: string
  ticket_type_id: string | null
  full_name: string
  email: string | null
  phone: string | null
  allocation: number
  notes: string | null
  created_by: string | null
  created_at: string | null
  ticket_type?: { id: string; name: string } | null
}

async function getUserId() {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

async function loadManageContext(admin: ReturnType<typeof createAdminClient>, eventId: string, userId: string) {
  const { data: event, error } = await admin.from("events").select("id, org_id").eq("id", eventId).maybeSingle()
  if (error) throw error
  if (!event) return { allowed: false, event: null }

  const { data: globalAdmin } = await admin.from("admin_users").select("user_id").eq("user_id", userId).eq("active", true).maybeSingle()
  if (globalAdmin) return { allowed: true, event }

  const { data: member } = await admin.from("org_members").select("role").eq("org_id", event.org_id).eq("user_id", userId).maybeSingle()
  return { allowed: Boolean(member?.role && MANAGER_ROLES.has(String(member.role))), event }
}

async function requireManageContext(eventId: string) {
  const userId = await getUserId()
  if (!userId) return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) }

  const admin = createAdminClient()
  const { allowed, event } = await loadManageContext(admin, eventId, userId)
  if (!event) return { response: NextResponse.json({ error: "Event not found" }, { status: 404 }) }
  if (!allowed) return { response: NextResponse.json({ error: "Permission denied" }, { status: 403 }) }

  return { admin, event, userId }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const manageContext = await requireManageContext(eventId)
  if (manageContext.response) return manageContext.response

  const { admin } = manageContext

  const { data, error } = await admin
    .from("guestlist_entries")
    .select("id, event_id, ticket_type_id, full_name, email, phone, allocation, notes, created_by, created_at, ticket_type:ticket_types(id, name)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const entries = (data ?? []) as unknown as GuestlistEntryRow[]
  const fulfilmentCounts = await Promise.all(
    entries.map(async (entry) => {
      const { count } = await admin
        .from("guestlist_fulfillments")
        .select("id", { count: "exact", head: true })
        .eq("guestlist_entry_id", entry.id)

      return [entry.id, count ?? 0] as const
    }),
  )

  const fulfilledByEntryId = Object.fromEntries(fulfilmentCounts)

  return NextResponse.json({
    entries: entries.map((entry) => ({
      ...entry,
      fulfilled_count: fulfilledByEntryId[entry.id] ?? 0,
    })),
  })
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const manageContext = await requireManageContext(eventId)
  if (manageContext.response) return manageContext.response

  const { admin, event, userId } = manageContext
  const body = await request.json().catch(() => ({}))

  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : ""
  const email = typeof body.email === "string" && body.email.trim() ? body.email.trim().toLowerCase() : null
  const phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null
  const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null
  const ticketTypeId = typeof body.ticket_type_id === "string" && body.ticket_type_id.trim() ? body.ticket_type_id.trim() : null
  const allocation = Math.max(1, Math.floor(Number(body.allocation) || 1))

  if (!fullName) return NextResponse.json({ error: "Guest name is required" }, { status: 400 })

  if (ticketTypeId) {
    const { data: ticketType, error: ticketTypeError } = await admin
      .from("ticket_types")
      .select("id")
      .eq("id", ticketTypeId)
      .eq("event_id", eventId)
      .maybeSingle()

    if (ticketTypeError) return NextResponse.json({ error: ticketTypeError.message }, { status: 400 })
    if (!ticketType) return NextResponse.json({ error: "Ticket type does not belong to this event" }, { status: 400 })
  }

  const { data: entry, error } = await admin
    .from("guestlist_entries")
    .insert({
      event_id: eventId,
      ticket_type_id: ticketTypeId,
      full_name: fullName,
      email,
      phone,
      allocation,
      notes,
      created_by: userId,
    })
    .select("id, event_id, ticket_type_id, full_name, email, phone, allocation, notes, created_by, created_at, ticket_type:ticket_types(id, name)")
    .single()

  if (error || !entry) return NextResponse.json({ error: error?.message ?? "Unable to add guest" }, { status: 400 })

  await admin.from("audit_log").insert({
    org_id: event.org_id,
    actor_id: userId,
    table_name: "guestlist_entries",
    record_id: entry.id,
    action: "insert",
    changes: { event_id: eventId, full_name: fullName, ticket_type_id: ticketTypeId, allocation },
  })

  return NextResponse.json({ entry: { ...(entry as unknown as GuestlistEntryRow), fulfilled_count: 0 } }, { status: 201 })
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const manageContext = await requireManageContext(eventId)
  if (manageContext.response) return manageContext.response

  const { admin, event, userId } = manageContext
  const entryId = new URL(request.url).searchParams.get("id")
  if (!entryId) return NextResponse.json({ error: "Guestlist entry id is required" }, { status: 400 })

  const { data: entry, error: entryError } = await admin
    .from("guestlist_entries")
    .select("id, full_name, allocation")
    .eq("id", entryId)
    .eq("event_id", eventId)
    .maybeSingle()

  if (entryError) return NextResponse.json({ error: entryError.message }, { status: 400 })
  if (!entry) return NextResponse.json({ error: "Guestlist entry not found" }, { status: 404 })

  const { count: fulfilmentCount, error: fulfilmentError } = await admin
    .from("guestlist_fulfillments")
    .select("id", { count: "exact", head: true })
    .eq("guestlist_entry_id", entryId)

  if (fulfilmentError) return NextResponse.json({ error: fulfilmentError.message }, { status: 400 })
  if ((fulfilmentCount ?? 0) > 0) {
    return NextResponse.json({ error: "Guestlist entry has already been fulfilled and cannot be deleted" }, { status: 409 })
  }

  const { error } = await admin.from("guestlist_entries").delete().eq("id", entryId).eq("event_id", eventId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await admin.from("audit_log").insert({
    org_id: event.org_id,
    actor_id: userId,
    table_name: "guestlist_entries",
    record_id: entryId,
    action: "delete",
    changes: { event_id: eventId, full_name: entry.full_name, allocation: entry.allocation },
  })

  return NextResponse.json({ ok: true })
}
