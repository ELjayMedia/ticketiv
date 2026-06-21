import { NextResponse, type NextRequest } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"

type RouteContext = { params: Promise<{ eventId: string }> }

async function getUserId() {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

const KNOWN_PROVIDERS = ["paystack", "flutterwave", "manual", "momo"] as const

async function canEdit(admin: ReturnType<typeof createAdminClient>, eventId: string, userId: string) {
  const { data: event, error } = await admin.from("events").select("id, org_id, refund_policy, attendee_fields, confirmation_message, payment_providers").eq("id", eventId).maybeSingle()
  if (error) throw error
  if (!event) return { ok: false, event: null }

  const { data: adminUser } = await admin.from("admin_users").select("user_id").eq("user_id", userId).eq("active", true).maybeSingle()
  if (adminUser) return { ok: true, event }

  const { data: member } = await admin.from("org_members").select("role").eq("org_id", event.org_id).eq("user_id", userId).maybeSingle()
  const ok = ["admin", "organizer", "organizer_owner", "organizer_admin"].includes(String(member?.role ?? ""))
  return { ok, event }
}

function listFrom(value: unknown) {
  if (Array.isArray(value)) return value.map(String).map((x) => x.trim()).filter(Boolean).slice(0, 20)
  if (typeof value === "string") return value.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 20)
  return []
}

/** Allowed-provider list from the request body, constrained to known keys. */
function providersFrom(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const set = new Set(value.map(String).map((x) => x.trim().toLowerCase()))
  return KNOWN_PROVIDERS.filter((p) => set.has(p))
}

/** Enabled payment providers the organizer may lock the event to. */
async function getAvailableProviders(admin: ReturnType<typeof createAdminClient>): Promise<string[]> {
  const { data } = await admin.from("payment_provider_settings").select("provider, is_enabled").eq("is_enabled", true)
  const enabled = new Set((data ?? []).map((r) => String((r as { provider: string }).provider)))
  // MoMo is env-configured (not a payment_provider_settings row) but is a real
  // rail in Eswatini — always offer it. Constrain to the known set.
  enabled.add("momo")
  return KNOWN_PROVIDERS.filter((p) => enabled.has(p))
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const admin = createAdminClient()
  const { ok, event } = await canEdit(admin, eventId, userId)
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  if (!ok) return NextResponse.json({ error: "Not allowed" }, { status: 403 })
  return NextResponse.json({ event, availableProviders: await getAvailableProviders(admin) })
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const admin = createAdminClient()
  const { ok, event } = await canEdit(admin, eventId, userId)
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  if (!ok) return NextResponse.json({ error: "Not allowed" }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const refundPolicy = typeof body.refund_policy === "string" ? body.refund_policy.trim() : ""
  const confirmationMessage = typeof body.confirmation_message === "string" ? body.confirmation_message.trim() : ""
  const attendeeFields = listFrom(body.attendee_fields)
  // Restrict the lock to providers that are actually available right now, so an
  // organizer can't lock an event to a disabled rail.
  const available = new Set(await getAvailableProviders(admin))
  const paymentProviders = providersFrom(body.payment_providers).filter((p) => available.has(p))

  const changes = {
    before: {
      refund_policy: event.refund_policy,
      attendee_fields: event.attendee_fields,
      confirmation_message: event.confirmation_message,
      payment_providers: event.payment_providers,
    },
    after: {
      refund_policy: refundPolicy || null,
      attendee_fields: attendeeFields,
      confirmation_message: confirmationMessage || null,
      payment_providers: paymentProviders,
    },
  }

  const { data: updatedEvent, error } = await admin
    .from("events")
    .update({ refund_policy: refundPolicy || null, attendee_fields: attendeeFields, confirmation_message: confirmationMessage || null, payment_providers: paymentProviders })
    .eq("id", eventId)
    .select("id, org_id, refund_policy, attendee_fields, confirmation_message, payment_providers")
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await admin.from("audit_log").insert({
    org_id: event.org_id,
    actor_id: userId,
    table_name: "events",
    record_id: eventId,
    action: "update",
    changes: { section: "policies", ...changes } as never,
  })

  return NextResponse.json({ event: updatedEvent })
}
