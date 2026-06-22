import "server-only"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface AttendeeWaitlistEntry {
  id: string
  eventId: string
  ticketTypeId: string | null
  userId: string | null
  email: string | null
  firstName: string | null
  lastName: string | null
  quantityRequested: number
  status: string
  offerExpiresAt: string | null
  notifiedAt: string | null
  joinedAt: string
  eventTitle: string | null
  eventSlug: string | null
  ticketTypeName: string | null
  ticketPriceCents: number | null
  ticketCurrency: string | null
  queuePosition: number | null
  queueLength: number | null
}

type WaitlistRow = {
  id: string
  event_id: string
  ticket_type_id: string | null
  user_id: string | null
  email: string | null
  first_name: string | null
  last_name: string | null
  quantity_requested: number
  status: string
  offer_expires_at: string | null
  notified_at: string | null
  joined_at: string
  events?: { title: string | null; slug: string | null } | null
  ticket_types?: { name: string | null; price_cents: number | null; currency: string | null } | null
}

function mapRow(row: WaitlistRow): AttendeeWaitlistEntry {
  return {
    id: row.id,
    eventId: row.event_id,
    ticketTypeId: row.ticket_type_id,
    userId: row.user_id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    quantityRequested: row.quantity_requested,
    status: row.status,
    offerExpiresAt: row.offer_expires_at,
    notifiedAt: row.notified_at,
    joinedAt: row.joined_at,
    eventTitle: row.events?.title ?? null,
    eventSlug: row.events?.slug ?? null,
    ticketTypeName: row.ticket_types?.name ?? null,
    ticketPriceCents: row.ticket_types?.price_cents ?? null,
    ticketCurrency: row.ticket_types?.currency ?? null,
    queuePosition: null,
    queueLength: null,
  }
}

const WAITLIST_SELECT = `
  id,
  event_id,
  ticket_type_id,
  user_id,
  email,
  first_name,
  last_name,
  quantity_requested,
  status,
  offer_expires_at,
  notified_at,
  joined_at,
  events:event_id(title, slug),
  ticket_types:ticket_type_id(name, price_cents, currency)
`

export async function getMyWaitlistEntries(): Promise<AttendeeWaitlistEntry[]> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return []

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const [listResult, posResult] = await Promise.all([
    supabase
      .from("waitlists")
      .select(WAITLIST_SELECT)
      .eq("user_id", user.id)
      .order("joined_at", { ascending: false })
      .limit(50),
    supabase.rpc("fn_my_waitlist_positions"),
  ])

  if (listResult.error) {
    console.error("[waitlist] list:", listResult.error)
    return []
  }

  const posMap = new Map<string, { position: number; queue_length: number }>()
  for (const p of (posResult.data ?? []) as Array<{ waitlist_id: string; position: number; queue_length: number }>) {
    posMap.set(p.waitlist_id, { position: p.position, queue_length: p.queue_length })
  }

  return ((listResult.data ?? []) as WaitlistRow[]).map((row) => {
    const pos = posMap.get(row.id)
    return {
      ...mapRow(row),
      queuePosition: pos?.position ?? null,
      queueLength: pos?.queue_length ?? null,
    }
  })
}

export async function getMyWaitlistOffer(waitlistId: string): Promise<AttendeeWaitlistEntry | null> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("waitlists")
    .select(WAITLIST_SELECT)
    .eq("id", waitlistId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) {
    console.error("[waitlist] offer detail:", error)
    return null
  }

  return data ? mapRow(data as WaitlistRow) : null
}
