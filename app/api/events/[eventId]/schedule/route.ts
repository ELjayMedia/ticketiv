import { NextResponse, type NextRequest } from "next/server"

import { getAuthenticatedUserId, loadEventManageContext } from "@/lib/api/event-management"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ eventId: string }> }
type ScheduleDateInput = { starts_at?: string; ends_at?: string }

function normalizeDateRows(body: any) {
  const sourceRows = Array.isArray(body.dates) && body.dates.length > 0 ? (body.dates as ScheduleDateInput[]) : [{ starts_at: body.starts_at, ends_at: body.ends_at }]

  const rows = sourceRows.map((item, index) => {
    const startsAt = typeof item.starts_at === "string" ? item.starts_at : ""
    const endsAt = typeof item.ends_at === "string" ? item.ends_at : ""
    const startDate = new Date(startsAt)
    const endDate = new Date(endsAt)

    if (!startsAt || Number.isNaN(startDate.getTime())) throw new Error(`Valid start date and time is required for date ${index + 1}`)
    if (!endsAt || Number.isNaN(endDate.getTime())) throw new Error(`Valid end date and time is required for date ${index + 1}`)
    if (endDate <= startDate) throw new Error(`End date must be after start date for date ${index + 1}`)

    return { starts_at: startDate.toISOString(), ends_at: endDate.toISOString() }
  })

  rows.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
  return rows
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const userId = await getAuthenticatedUserId()
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const admin = createAdminClient()
  const { allowed, event } = await loadEventManageContext(admin, eventId, userId, "id, org_id, starts_at, ends_at, tz")
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: "Permission denied" }, { status: 403 })

  const { data: dates, error } = await admin.from("event_dates").select("id, starts_at, ends_at").eq("event_id", eventId).order("starts_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ event, dates: dates ?? [] })
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const userId = await getAuthenticatedUserId()
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const admin = createAdminClient()
  const { allowed, event } = await loadEventManageContext(admin, eventId, userId, "id, org_id, starts_at, ends_at, tz")
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: "Permission denied" }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const tz = typeof body.tz === "string" && body.tz.trim() ? body.tz.trim() : "Africa/Mbabane"

  let rows: Array<{ starts_at: string; ends_at: string }>
  try {
    rows = normalizeDateRows(body)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Invalid schedule" }, { status: 400 })
  }

  const canonicalStart = rows[0].starts_at
  const canonicalEnd = rows.reduce((latest, row) => (new Date(row.ends_at).getTime() > new Date(latest).getTime() ? row.ends_at : latest), rows[0].ends_at)

  const { data: updatedEvent, error: updateError } = await admin
    .from("events")
    .update({ starts_at: canonicalStart, ends_at: canonicalEnd, tz })
    .eq("id", eventId)
    .select("id, org_id, starts_at, ends_at, tz")
    .maybeSingle()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })

  await admin.from("event_dates").delete().eq("event_id", eventId)
  const { data: savedDates, error: dateError } = await admin
    .from("event_dates")
    .insert(rows.map((row) => ({ event_id: eventId, starts_at: row.starts_at, ends_at: row.ends_at })))
    .select("id, starts_at, ends_at")
    .order("starts_at", { ascending: true })

  if (dateError) return NextResponse.json({ error: dateError.message }, { status: 400 })

  await admin.from("audit_log").insert({
    org_id: event.org_id,
    actor_id: userId,
    table_name: "events",
    record_id: eventId,
    action: "update",
    changes: { starts_at: canonicalStart, ends_at: canonicalEnd, tz, event_dates_count: rows.length },
  })

  return NextResponse.json({ event: updatedEvent, dates: savedDates ?? [] })
}
