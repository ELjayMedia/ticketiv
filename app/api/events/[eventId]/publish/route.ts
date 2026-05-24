import { NextResponse, type NextRequest } from "next/server"

import { notifyEventChanged, notifyEventPublished } from "@/lib/notifications"
import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"

type RouteContext = { params: Promise<{ eventId: string }> }
const MANAGER_ROLES = new Set(["admin", "organizer", "organizer_owner", "organizer_admin"])

async function getUserId() {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

async function loadManageContext(admin: ReturnType<typeof createAdminClient>, eventId: string, userId: string) {
  const { data: event, error } = await admin
    .from("events")
    .select("id, org_id, title, category, venue_id, starts_at, ends_at, status, visibility, cover_image_url, refund_policy, confirmation_message")
    .eq("id", eventId)
    .maybeSingle()
  if (error) throw error
  if (!event) return { allowed: false, event: null }

  const { data: globalAdmin } = await admin.from("admin_users").select("user_id").eq("user_id", userId).eq("active", true).maybeSingle()
  if (globalAdmin) return { allowed: true, event }

  const { data: member } = await admin.from("org_members").select("role").eq("org_id", event.org_id).eq("user_id", userId).maybeSingle()
  return { allowed: Boolean(member?.role && MANAGER_ROLES.has(String(member.role))), event }
}

type ReadinessCheck = {
  key: string
  label: string
  complete: boolean
  recommended: boolean
  hint: string
  step: string
}

function hasNonEmptyJson(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === "string") return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === "object") return Object.keys(value as object).length > 0
  return Boolean(value)
}

async function buildReadiness(admin: ReturnType<typeof createAdminClient>, event: any) {
  const eventId = event.id
  const orgId = event.org_id
  const [
    { data: ticketIdRows },
    { count: dateCount },
    { count: staffCount },
    { count: payoutCount },
    { data: liveStatsRow },
  ] = await Promise.all([
    admin.from("ticket_types").select("id, sales_status").eq("event_id", eventId),
    admin.from("event_dates").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    admin.from("event_staff").select("event_id", { count: "exact", head: true }).eq("event_id", eventId).eq("active", true),
    admin.from("payout_accounts").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    admin.from("event_live_stats").select("event_id").eq("event_id", eventId).maybeSingle(),
  ])

  const tickets = ticketIdRows ?? []
  const sellableTickets = tickets.filter((tt: any) => tt.sales_status === "on_sale" || tt.sales_status === "paused")
  const sellableIds = sellableTickets.map((tt: any) => tt.id)

  let onlineChannelCount = 0
  if (sellableIds.length > 0) {
    const { count } = await admin
      .from("ticket_type_channels")
      .select("ticket_type_id", { count: "exact", head: true })
      .in("ticket_type_id", sellableIds)
      .eq("channel", "online")
    onlineChannelCount = count ?? 0
  }

  const hasDates = Boolean(event.starts_at && event.ends_at) || (dateCount ?? 0) > 0
  const datesValid = !event.starts_at || !event.ends_at || new Date(event.ends_at) > new Date(event.starts_at)
  const hasPolicy = hasNonEmptyJson(event.refund_policy) || Boolean(event.confirmation_message?.trim())

  // Required checks gate publishing; recommended checks are surfaced to the
  // organiser but never block going live.
  const checks: ReadinessCheck[] = [
    {
      key: "title",
      label: "Event title",
      complete: Boolean(event.title?.trim()),
      recommended: false,
      step: "basics",
      hint: "Add a public-facing event title from the Basics tab.",
    },
    {
      key: "category",
      label: "Category",
      complete: Boolean(event.category),
      recommended: false,
      step: "basics",
      hint: "Pick a category in Basics so the event lands in the right discovery bucket.",
    },
    {
      key: "venue",
      label: "Venue",
      complete: Boolean(event.venue_id),
      recommended: false,
      step: "venue",
      hint: "Select or create a venue from the Venue tab.",
    },
    {
      key: "date",
      label: "Date and time",
      complete: hasDates && datesValid,
      recommended: false,
      step: "schedule",
      hint: !hasDates
        ? "Set the event start and end on the Schedule tab."
        : "End time must be after the start time.",
    },
    {
      key: "tickets",
      label: "At least one ticket type",
      complete: sellableTickets.length > 0,
      recommended: false,
      step: "tickets",
      hint: "Add a ticket type with sales_status on_sale or paused on the Tickets tab.",
    },
    {
      key: "online_channel",
      label: "Online sales channel",
      complete: onlineChannelCount > 0,
      recommended: false,
      step: "tickets",
      hint: "Enable the online channel on at least one ticket type so buyers can purchase from the public page.",
    },
    {
      key: "image",
      label: "Cover image",
      complete: Boolean(event.cover_image_url),
      recommended: false,
      step: "basics",
      hint: "Upload a cover image from Basics. A placeholder is enough but the image cannot be empty.",
    },
    {
      key: "policy",
      label: "Refund or support policy",
      complete: hasPolicy,
      recommended: false,
      step: "policies",
      hint: "Set a refund policy or confirmation message on the Policies tab so buyers know what to expect.",
    },
    {
      key: "payout_account",
      label: "Payout account",
      complete: (payoutCount ?? 0) > 0,
      recommended: true,
      step: "finance",
      hint: "Connect a payout account so cleared revenue can be settled to the organizer.",
    },
    {
      key: "staff",
      label: "Check-in staff or scanner",
      complete: (staffCount ?? 0) > 0,
      recommended: true,
      step: "staff",
      hint: "Assign at least one scanner from the Staff tab before event day.",
    },
    {
      key: "live_stats",
      label: "Live stats initialized",
      complete: Boolean(liveStatsRow),
      recommended: true,
      step: "tickets",
      hint: "Live stats are created automatically once tickets exist; if missing, recheck ticket setup.",
    },
  ]

  return { checks, ready: checks.every((check) => check.recommended || check.complete) }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const admin = createAdminClient()
  const { allowed, event } = await loadManageContext(admin, eventId, userId)
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: "Permission denied" }, { status: 403 })

  const readiness = await buildReadiness(admin, event)
  return NextResponse.json({ event, readiness })
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
  const publish = Boolean(body.publish)
  const readiness = await buildReadiness(admin, event)

  if (publish && !readiness.ready) {
    return NextResponse.json({ error: "Complete the readiness checklist before publishing.", readiness }, { status: 400 })
  }

  const nextStatus = publish ? "published" : "draft"
  const { data: updatedEvent, error } = await admin
    .from("events")
    .update({ status: nextStatus, published_at: publish ? new Date().toISOString() : null, visibility: publish ? "public" : event.visibility })
    .eq("id", eventId)
    .select("id, org_id, title, category, venue_id, starts_at, ends_at, status, visibility, cover_image_url, refund_policy, confirmation_message")
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await admin.from("audit_log").insert({
    org_id: event.org_id,
    actor_id: userId,
    table_name: "events",
    record_id: eventId,
    action: "update",
    changes: { status: nextStatus },
  })

  if (publish && event.status !== "published") {
    await notifyEventPublished({ orgId: event.org_id, eventId, title: updatedEvent?.title ?? event.title, actorId: userId })
  } else if (!publish && event.status === "published") {
    await notifyEventChanged({ orgId: event.org_id, eventId, title: updatedEvent?.title ?? event.title, changeType: "unpublished", actorId: userId, changes: { status: nextStatus } })
  }

  const nextReadiness = await buildReadiness(admin, updatedEvent)
  return NextResponse.json({ event: updatedEvent, readiness: nextReadiness })
}
