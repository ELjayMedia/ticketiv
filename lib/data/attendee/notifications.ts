import { createServerSupabaseClient } from "@/lib/supabase-server"

export type NotificationActionKind =
  | "ticket"
  | "transfer"
  | "waitlist"
  | "resale"
  | "refund"
  | "event"
  | "generic"

export interface AttendeeNotification {
  id: string
  type: string
  status: string | null
  channel: string | null
  title: string
  message: string
  createdAt: string
  readAt: string | null
  isUnread: boolean
  actionHref: string
  actionLabel: string
  actionKind: NotificationActionKind
}

type RawNotificationPayload = Record<string, unknown> | null

type RawNotificationRow = {
  id: string
  type: string | null
  payload: RawNotificationPayload
  status: string | null
  channel: string | null
  created_at: string | null
  sent_at: string | null
  delivered_at: string | null
  read_at: string | null
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null
}

function titleCaseType(type: string): string {
  return type
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

function baseFields(row: RawNotificationRow) {
  return {
    readAt: row.read_at,
    isUnread: row.read_at == null,
  }
}

function mapNotification(row: RawNotificationRow): AttendeeNotification {
  const type = row.type ?? "generic"
  const payload = row.payload ?? {}
  const eventTitle = asText(payload.eventTitle) ?? asText(payload.event_title)
  const ticketId = asText(payload.ticketId) ?? asText(payload.ticket_id) ?? asText(payload.orderItemId) ?? asText(payload.order_item_id)
  const transferId = asText(payload.transferId) ?? asText(payload.transfer_id)
  const waitlistId = asText(payload.waitlistId) ?? asText(payload.waitlist_id)
  const resaleId = asText(payload.resaleId) ?? asText(payload.resale_id) ?? asText(payload.listingId) ?? asText(payload.listing_id)
  const refundId = asText(payload.refundId) ?? asText(payload.refund_id)
  const eventId = asText(payload.eventId) ?? asText(payload.event_id) ?? asText(payload.eventSlug) ?? asText(payload.event_slug)
  const explicitTitle = asText(payload.title)
  const explicitMessage = asText(payload.message) ?? asText(payload.body)
  const base = baseFields(row)

  if (type.includes("transfer")) {
    return {
      id: row.id,
      type,
      status: row.status,
      channel: row.channel,
      title: explicitTitle ?? "Ticket transfer update",
      message: explicitMessage ?? (eventTitle ? `There is a transfer update for ${eventTitle}.` : "You have a ticket transfer update."),
      createdAt: row.created_at ?? row.sent_at ?? new Date().toISOString(),
      ...base,
      actionHref: transferId ? `/transfers?transferId=${encodeURIComponent(transferId)}` : "/transfers",
      actionLabel: "View transfer",
      actionKind: "transfer",
    }
  }

  if (type.includes("waitlist")) {
    return {
      id: row.id,
      type,
      status: row.status,
      channel: row.channel,
      title: explicitTitle ?? "Waitlist update",
      message: explicitMessage ?? (eventTitle ? `There is a waitlist update for ${eventTitle}.` : "Your waitlist status has changed."),
      createdAt: row.created_at ?? row.sent_at ?? new Date().toISOString(),
      ...base,
      actionHref: waitlistId ? `/waitlist?waitlistId=${encodeURIComponent(waitlistId)}` : "/waitlist",
      actionLabel: "View waitlist",
      actionKind: "waitlist",
    }
  }

  if (type.includes("resale") || type.includes("listing")) {
    return {
      id: row.id,
      type,
      status: row.status,
      channel: row.channel,
      title: explicitTitle ?? "Ticket listing update",
      message: explicitMessage ?? (eventTitle ? `There is a listing update for ${eventTitle}.` : "Your ticket listing has an update."),
      createdAt: row.created_at ?? row.sent_at ?? new Date().toISOString(),
      ...base,
      actionHref: resaleId ? `/resale?listingId=${encodeURIComponent(resaleId)}` : "/resale",
      actionLabel: "View listing",
      actionKind: "resale",
    }
  }

  if (type.includes("refund")) {
    return {
      id: row.id,
      type,
      status: row.status,
      channel: row.channel,
      title: explicitTitle ?? "Refund update",
      message: explicitMessage ?? (eventTitle ? `There is a refund update for ${eventTitle}.` : "Your refund status has changed."),
      createdAt: row.created_at ?? row.sent_at ?? new Date().toISOString(),
      ...base,
      actionHref: refundId ? `/orders?refundId=${encodeURIComponent(refundId)}` : "/orders",
      actionLabel: "View order",
      actionKind: "refund",
    }
  }

  if (type.includes("event")) {
    return {
      id: row.id,
      type,
      status: row.status,
      channel: row.channel,
      title: explicitTitle ?? "Event update",
      message: explicitMessage ?? (eventTitle ? `${eventTitle} has an update.` : "An event you follow has an update."),
      createdAt: row.created_at ?? row.sent_at ?? new Date().toISOString(),
      ...base,
      actionHref: eventId ? `/events/${encodeURIComponent(eventId)}` : "/",
      actionLabel: "View event",
      actionKind: "event",
    }
  }

  if (type.includes("ticket") || type.includes("order")) {
    return {
      id: row.id,
      type,
      status: row.status,
      channel: row.channel,
      title: explicitTitle ?? "Ticket update",
      message: explicitMessage ?? (eventTitle ? `Your ticket for ${eventTitle} has an update.` : "Your ticket has an update."),
      createdAt: row.created_at ?? row.sent_at ?? new Date().toISOString(),
      ...base,
      actionHref: ticketId ? `/tickets/${encodeURIComponent(ticketId)}` : "/tickets",
      actionLabel: "View ticket",
      actionKind: "ticket",
    }
  }

  return {
    id: row.id,
    type,
    status: row.status,
    channel: row.channel,
    title: explicitTitle ?? titleCaseType(type),
    message: explicitMessage ?? "You have a Ticketiv update.",
    createdAt: row.created_at ?? row.sent_at ?? new Date().toISOString(),
    ...base,
    actionHref: "/me",
    actionLabel: "View account",
    actionKind: "generic",
  }
}

export async function getMyNotifications(): Promise<AttendeeNotification[]> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return []

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("notifications")
    .select("id,type,payload,status,channel,created_at,sent_at,delivered_at,read_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    console.error("[notifications] list:", error)
    return []
  }

  return ((data ?? []) as RawNotificationRow[]).map(mapNotification)
}

export async function getMyMutedNotificationTypes(): Promise<string[]> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return []
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.rpc as any)('fn_get_my_notification_mutes')
  return (data as string[]) ?? []
}

export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return 0

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 0

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null)

  if (error) {
    console.error("[notifications] unread count:", error)
    return 0
  }

  return count ?? 0
}
