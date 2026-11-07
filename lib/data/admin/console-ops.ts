import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { emailsFor, humanFailureReason, loadNotes, personName, untyped, type AdminNote } from "@/lib/data/admin/console"
import {
  formatMoney,
  isUuid,
  orderRef,
  queueItemKey,
  scannerIsOffline,
  undeliveredOrders,
  type QueueKey,
} from "@/lib/super-admin/console"

// Admin console, phase 2: work queues, event and organizer profiles, and the
// read-only "View as". Service-role reads, called only from pages behind
// requireSuperAdmin() / requireAdminRole().

type Admin = ReturnType<typeof createAdminClient>

const HOUR = 60 * 60 * 1000

export interface QueueItem {
  key: string
  queue: QueueKey
  title: string
  detail: string
  at: string
  href: string
  tone: "danger" | "warning" | "muted"
  claimedBy: string | null
  claimedByMe: boolean
}

export interface WorkQueues {
  items: QueueItem[]
  counts: Record<QueueKey, number>
}

export async function getWorkQueues(viewerId: string, now = new Date()): Promise<WorkQueues> {
  const admin = createAdminClient()
  const db = untyped(admin)
  const since24h = new Date(now.getTime() - 24 * HOUR).toISOString()
  const since7d = new Date(now.getTime() - 7 * 24 * HOUR).toISOString()

  const [refsRes, notificationsRes, refundsRes, payoutsRes, issuesRes, devicesRes, claimsRes] = await Promise.all([
    db
      .from("payment_support_references")
      .select("ref, order_id, reason, provider, created_at")
      .gte("created_at", since24h)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("notifications")
      .select("status, created_at, payload")
      .eq("type", "ticket_issued")
      .gte("created_at", since7d)
      .order("created_at", { ascending: false })
      .limit(1000),
    admin
      .from("refunds")
      .select("id, amount_cents, currency, created_at, provider_payload, payments(order_id)")
      .eq("status", "requested")
      .order("created_at")
      .limit(50),
    admin
      .from("payouts")
      .select("id, amount_cents, currency, created_at, org_id, organizations(name)")
      .eq("status", "requested")
      .order("created_at")
      .limit(50),
    db
      .from("finance_reconciliation_issues")
      .select("id, title, severity, status, last_detected_at, org_id")
      .is("resolved_at", null)
      .order("last_detected_at", { ascending: false })
      .limit(50),
    admin
      .from("devices")
      .select("id, label, last_seen_at, event_id, events(id, title, starts_at, ends_at)")
      .not("event_id", "is", null)
      .limit(500),
    db.from("admin_queue_claims").select("item_key, admin_id"),
  ])

  const items: Array<Omit<QueueItem, "claimedBy" | "claimedByMe">> = []

  // One item per order: buyers often retry, each retry gets a new PAY- code.
  const seenOrders = new Set<string>()
  for (const ref of (refsRes.data ?? []) as Array<{ ref: string; order_id: string | null; reason: string; provider: string | null; created_at: string }>) {
    if (ref.order_id) {
      if (seenOrders.has(ref.order_id)) continue
      seenOrders.add(ref.order_id)
    }
    items.push({
      key: queueItemKey("payments", ref.order_id ?? ref.ref),
      queue: "payments",
      title: `${ref.ref}: payment could not start`,
      detail: [ref.provider, humanFailureReason(ref.reason), ref.order_id ? `order ${orderRef(ref.order_id)}` : null].filter(Boolean).join(" · "),
      at: ref.created_at,
      href: ref.order_id ? `/super-admin/order/${ref.order_id}` : `/super-admin/search?q=${ref.ref}`,
      tone: "danger",
    })
  }

  const deliveryRows = ((notificationsRes.data ?? []) as any[]).map((row) => ({
    order_id: typeof row.payload?.order_id === "string" ? row.payload.order_id : null,
    status: row.status as string,
    created_at: row.created_at as string,
  }))
  for (const entry of undeliveredOrders(deliveryRows).slice(0, 50)) {
    items.push({
      key: queueItemKey("delivery", entry.orderId),
      queue: "delivery",
      title: `Tickets not delivered for order ${orderRef(entry.orderId)}`,
      detail: "Every send failed and nothing went out later. Check the buyer's email, then resend.",
      at: entry.lastFailureAt,
      href: `/super-admin/order/${entry.orderId}`,
      tone: "danger",
    })
  }

  for (const refund of (refundsRes.data ?? []) as any[]) {
    const orderId: string | null = refund.payments?.order_id ?? refund.provider_payload?.order_id ?? null
    const source = refund.provider_payload?.source
    items.push({
      key: queueItemKey("refunds", refund.id),
      queue: "refunds",
      title: `Refund ${formatMoney(refund.amount_cents, refund.currency)} waiting for approval`,
      detail: [
        orderId ? `order ${orderRef(orderId)}` : null,
        source === "admin_console" ? "asked by staff" : source === "buyer" ? "asked by the buyer" : null,
        typeof refund.provider_payload?.reason === "string" ? refund.provider_payload.reason : null,
      ]
        .filter(Boolean)
        .join(" · "),
      at: refund.created_at,
      href: orderId ? `/super-admin/order/${orderId}#refunds` : "/super-admin/refunds",
      tone: "warning",
    })
  }

  for (const payout of (payoutsRes.data ?? []) as any[]) {
    items.push({
      key: queueItemKey("payouts", payout.id),
      queue: "payouts",
      title: `Payout ${formatMoney(payout.amount_cents, payout.currency)} requested`,
      detail: payout.organizations?.name ?? "Organizer",
      at: payout.created_at,
      href: "/super-admin/payouts",
      tone: "warning",
    })
  }

  for (const issue of (issuesRes.data ?? []) as any[]) {
    items.push({
      key: queueItemKey("reconciliation", issue.id),
      queue: "reconciliation",
      title: issue.title ?? "Reconciliation issue",
      detail: [issue.severity, issue.status].filter(Boolean).join(" · "),
      at: issue.last_detected_at,
      href: "/super-admin/reconciliation",
      tone: issue.severity === "critical" || issue.severity === "high" ? "danger" : "warning",
    })
  }

  for (const device of (devicesRes.data ?? []) as any[]) {
    const event = device.events
    if (!event?.starts_at) continue
    const starts = new Date(event.starts_at).getTime()
    const ends = event.ends_at ? new Date(event.ends_at).getTime() : starts + 12 * HOUR
    const soonOrLive = starts - 6 * HOUR <= now.getTime() && now.getTime() <= ends
    if (!soonOrLive || !scannerIsOffline(device.last_seen_at, now)) continue
    items.push({
      key: queueItemKey("scanners", device.id),
      queue: "scanners",
      title: `Scanner "${device.label ?? "unnamed"}" offline`,
      detail: `${event.title} · ${starts > now.getTime() ? "starts soon" : "running now"} · last seen ${device.last_seen_at ? new Date(device.last_seen_at).toLocaleTimeString("en-SZ", { timeStyle: "short" }) : "never"}`,
      at: device.last_seen_at ?? event.starts_at,
      href: `/super-admin/event/${event.id}`,
      tone: "danger",
    })
  }

  const claims = new Map(((claimsRes.data ?? []) as Array<{ item_key: string; admin_id: string }>).map((c) => [c.item_key, c.admin_id]))
  const emails = await emailsFor(admin, [...new Set(items.map((i) => claims.get(i.key)).filter(Boolean))])

  const counts = { payments: 0, delivery: 0, refunds: 0, payouts: 0, reconciliation: 0, scanners: 0 } as Record<QueueKey, number>
  for (const item of items) counts[item.queue] += 1

  return {
    counts,
    items: items
      .map((item) => {
        const owner = claims.get(item.key) ?? null
        return { ...item, claimedBy: owner ? (owner === viewerId ? "you" : emails.get(owner) ?? "another admin") : null, claimedByMe: owner === viewerId }
      })
      .sort((a, b) => (a.tone === b.tone ? b.at.localeCompare(a.at) : a.tone === "danger" ? -1 : b.tone === "danger" ? 1 : 0)),
  }
}

// ---------------------------------------------------------------------------
// Event 360

export interface Event360 {
  id: string
  title: string
  status: string
  startsAt: string | null
  endsAt: string | null
  city: string | null
  slug: string | null
  org: { id: string; name: string } | null
  ticketTypes: Array<{ id: string; name: string; priceCents: number; currency: string; quota: number | null; sold: number; salesStatus: string; pauseReason: string | null }>
  devices: Array<{ id: string; label: string | null; lastSeenAt: string | null; offline: boolean }>
  staffCount: number
  staff: Array<{ userId: string; email: string | null; role: string; active: boolean }>
  checkedIn: number
  issued: number
  paymentErrors: Array<{ ref: string; orderId: string | null; reason: string; createdAt: string }>
  pendingRefunds: number
  notes: Array<AdminNote & { authorEmail: string | null }>
}

export async function getEvent360(eventId: string, now = new Date()): Promise<Event360 | null> {
  if (!isUuid(eventId)) return null
  const admin = createAdminClient()
  const db = untyped(admin)

  const { data: event } = await admin
    .from("events")
    .select("id, title, status, starts_at, ends_at, city, slug, org_id, organizations(id, name)")
    .eq("id", eventId)
    .maybeSingle()
  if (!event) return null

  const [typesRes, devicesRes, staffRes, refsRes, refundsRes, notes] = await Promise.all([
    admin
      .from("ticket_types")
      .select("id, name, price_cents, currency, quota, sales_status, sales_pause_reason")
      .eq("event_id", eventId)
      .order("created_at"),
    admin.from("devices").select("id, label, last_seen_at").eq("event_id", eventId),
    admin.from("event_staff").select("user_id, role, active").eq("event_id", eventId).order("created_at").limit(50),
    db.from("payment_support_references").select("ref, order_id, reason, created_at").eq("event_id", eventId).order("created_at", { ascending: false }).limit(10),
    admin.from("refunds").select("id", { count: "exact", head: true }).eq("status", "requested").eq("provider_payload->>event_id", eventId),
    loadNotes(admin, "event", eventId),
  ])

  const types = typesRes.data ?? []
  const counts = await Promise.all(
    types.map(async (type) => {
      const [sold, checked] = await Promise.all([
        admin.from("order_items").select("id", { count: "exact", head: true }).eq("ticket_type_id", type.id).in("status", ["issued", "checked_in", "transferred"]),
        admin.from("order_items").select("id", { count: "exact", head: true }).eq("ticket_type_id", type.id).eq("status", "checked_in"),
      ])
      return { sold: sold.count ?? 0, checked: checked.count ?? 0 }
    }),
  )
  const staffRows = staffRes.data ?? []
  const authorEmails = await emailsFor(admin, [...staffRows.map((s) => s.user_id), ...notes.map((n) => n.author_id)])
  const org = (event as any).organizations

  return {
    id: event.id,
    title: event.title,
    status: event.status,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    city: event.city,
    slug: event.slug,
    org: org ? { id: org.id, name: org.name } : null,
    ticketTypes: types.map((type, index) => ({
      id: type.id,
      name: type.name,
      priceCents: type.price_cents ?? 0,
      currency: type.currency ?? "SZL",
      quota: type.quota ?? null,
      sold: counts[index].sold,
      salesStatus: type.sales_status ?? "on_sale",
      pauseReason: type.sales_pause_reason ?? null,
    })),
    devices: (devicesRes.data ?? []).map((device) => ({
      id: device.id,
      label: device.label,
      lastSeenAt: device.last_seen_at,
      offline: scannerIsOffline(device.last_seen_at, now),
    })),
    staffCount: staffRows.filter((s) => s.active !== false).length,
    staff: staffRows.map((s) => ({ userId: s.user_id, email: authorEmails.get(s.user_id) ?? null, role: String(s.role), active: s.active !== false })),
    issued: counts.reduce((sum, c) => sum + c.sold, 0),
    checkedIn: counts.reduce((sum, c) => sum + c.checked, 0),
    paymentErrors: ((refsRes.data ?? []) as any[]).map((r) => ({ ref: r.ref, orderId: r.order_id, reason: r.reason, createdAt: r.created_at })),
    pendingRefunds: refundsRes.count ?? 0,
    notes: notes.map((n) => ({ ...n, authorEmail: n.author_id ? authorEmails.get(n.author_id) ?? null : null })),
  }
}

// ---------------------------------------------------------------------------
// Organizer 360

export interface Organizer360 {
  id: string
  name: string
  slug: string | null
  createdAt: string
  members: Array<{ userId: string; email: string | null; role: string }>
  events: Array<{ id: string; title: string; status: string; startsAt: string | null }>
  payoutAccounts: Array<{ id: string; provider: string; isPrimary: boolean; createdAt: string }>
  payouts: Array<{ id: string; amountCents: number; currency: string; status: string; createdAt: string; failureReason: string | null }>
  openIssues: Array<{ id: string; title: string; severity: string }>
  notes: Array<AdminNote & { authorEmail: string | null }>
}

export async function getOrganizer360(orgId: string): Promise<Organizer360 | null> {
  if (!isUuid(orgId)) return null
  const admin = createAdminClient()
  const db = untyped(admin)

  const { data: org } = await admin.from("organizations").select("id, name, slug, created_at").eq("id", orgId).maybeSingle()
  if (!org) return null

  const [membersRes, eventsRes, accountsRes, payoutsRes, issuesRes, notes] = await Promise.all([
    admin.from("org_members").select("user_id, role").eq("org_id", orgId),
    admin.from("events").select("id, title, status, starts_at").eq("org_id", orgId).order("starts_at", { ascending: false }).limit(25),
    // Never the account details: provider and flags only.
    admin.from("payout_accounts").select("id, provider, is_primary, created_at").eq("org_id", orgId),
    // failure_reason comes from the payout provider tracking migration.
    db.from("payouts").select("id, amount_cents, currency, status, created_at, failure_reason").eq("org_id", orgId).order("created_at", { ascending: false }).limit(10),
    db.from("finance_reconciliation_issues").select("id, title, severity").eq("org_id", orgId).is("resolved_at", null).limit(20),
    loadNotes(admin, "organization", orgId),
  ])

  const members = membersRes.data ?? []
  const emails = await emailsFor(admin, [...members.map((m) => m.user_id), ...notes.map((n) => n.author_id)])

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    createdAt: org.created_at,
    members: members.map((m) => ({ userId: m.user_id, email: emails.get(m.user_id) ?? null, role: String(m.role) })),
    events: (eventsRes.data ?? []).map((e) => ({ id: e.id, title: e.title, status: e.status, startsAt: e.starts_at })),
    payoutAccounts: (accountsRes.data ?? []).map((a) => ({ id: a.id, provider: a.provider, isPrimary: Boolean(a.is_primary), createdAt: a.created_at ?? org.created_at })),
    payouts: ((payoutsRes.data ?? []) as any[]).map((p) => ({
      id: p.id,
      amountCents: p.amount_cents,
      currency: p.currency,
      status: p.status,
      createdAt: p.created_at,
      failureReason: p.failure_reason ?? null,
    })),
    openIssues: ((issuesRes.data ?? []) as any[]).map((i) => ({ id: i.id, title: i.title, severity: i.severity })),
    notes: notes.map((n) => ({ ...n, authorEmail: n.author_id ? emails.get(n.author_id) ?? null : null })),
  }
}

// ---------------------------------------------------------------------------
// View as (read only)

export type AttendeeTicketState = "valid" | "used" | "transferred" | "refunded" | "cancelled" | "pending"

export function attendeeTicketState(item: { status: string; checked_in_at?: string | null; refunded_at?: string | null; revoked_at?: string | null }): AttendeeTicketState {
  if (item.status === "refunded" || item.refunded_at) return "refunded"
  if (item.status === "revoked" || item.revoked_at) return "cancelled"
  if (item.status === "transferred") return "transferred"
  if (item.status === "checked_in" || item.checked_in_at) return "used"
  if (item.status === "issued") return "valid"
  return "pending"
}

export interface ViewAs {
  userId: string
  name: string
  email: string | null
  tickets: Array<{
    id: string
    eventTitle: string
    startsAt: string | null
    typeName: string
    state: AttendeeTicketState
    holder: string | null
    heldByThem: boolean
    upcoming: boolean
  }>
  workspaces: Array<{ orgId: string; orgName: string; role: string }>
  messages: Array<{ channel: string; status: string; createdAt: string; type: string }>
}

export async function getViewAs(userId: string, now = new Date()): Promise<ViewAs | null> {
  if (!isUuid(userId)) return null
  const admin = createAdminClient()
  const { data: authData } = await admin.auth.admin.getUserById(userId)
  const user = authData?.user
  if (!user) return null

  const select = "id, status, checked_in_at, refunded_at, revoked_at, holder_name, current_owner_id, holder_user_id, ticket_types(name, events(title, starts_at)), orders(buyer_id)"
  const [ownedRes, boughtOrdersRes, profileRes, membersRes, messagesRes] = await Promise.all([
    admin.from("order_items").select(select).or(`current_owner_id.eq.${userId},holder_user_id.eq.${userId}`).limit(100),
    admin.from("orders").select("id").eq("buyer_id", userId).limit(100),
    admin.from("profiles").select("display_name, name, surname").eq("user_id", userId).maybeSingle(),
    admin.from("org_members").select("org_id, role, organizations(name)").eq("user_id", userId),
    admin.from("notifications").select("channel, status, created_at, type").eq("user_id", userId).order("created_at", { ascending: false }).limit(15),
  ])
  const orderIds = (boughtOrdersRes.data ?? []).map((o) => o.id)
  const boughtRes = orderIds.length ? await admin.from("order_items").select(select).in("order_id", orderIds).limit(200) : { data: [] }

  const seen = new Map<string, any>()
  for (const item of [...((ownedRes.data ?? []) as any[]), ...((boughtRes.data ?? []) as any[])]) seen.set(item.id, item)

  const tickets = [...seen.values()]
    .map((item) => ({
      id: item.id as string,
      eventTitle: item.ticket_types?.events?.title ?? "Event",
      startsAt: (item.ticket_types?.events?.starts_at as string | null) ?? null,
      typeName: item.ticket_types?.name ?? "Ticket",
      state: attendeeTicketState(item),
      holder: (item.holder_name as string | null) ?? null,
      // A ticket bought by them but now owned by someone else shows as passed on.
      heldByThem: !item.current_owner_id || item.current_owner_id === userId,
      // Still shown under upcoming until 12 hours after the start.
      upcoming: !item.ticket_types?.events?.starts_at || new Date(item.ticket_types.events.starts_at).getTime() > now.getTime() - 12 * HOUR,
    }))
    .sort((a, b) => (b.startsAt ?? "").localeCompare(a.startsAt ?? ""))

  return {
    userId,
    name: personName({ ...(profileRes.data ?? {}), email: user.email }),
    email: user.email ?? null,
    tickets,
    workspaces: ((membersRes.data ?? []) as any[]).map((m) => ({ orgId: m.org_id, orgName: m.organizations?.name ?? "Organization", role: String(m.role) })),
    messages: (messagesRes.data ?? []).map((m) => ({ channel: m.channel ?? "in_app", status: m.status ?? "", createdAt: m.created_at, type: m.type })),
  }
}

/** Every View as is logged: who looked at whose account, and why. */
export async function recordViewAs(actorId: string, userId: string, reason: string): Promise<string> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("audit_log")
    .insert({
      actor_id: actorId,
      table_name: "auth.users",
      record_id: userId,
      action: "other",
      changes: { business_action: "admin_console", action: "view_as", summary: "Viewed their account (read only)", reason },
    })
    .select("id")
    .single()
  if (error || !data) throw new Error(`Couldn't log View as: ${error?.message ?? "unknown error"}`)
  return data.id
}

export const VIEW_AS_MINUTES = 30

/**
 * A View as page is only shown for a logged, recent View as by this admin for
 * this person. Returns the reason they gave, or null when the session is not valid.
 */
export async function validViewAsSession(sessionId: string, actorId: string, userId: string, now = new Date()): Promise<string | null> {
  if (!isUuid(sessionId)) return null
  const { data } = await createAdminClient()
    .from("audit_log")
    .select("actor_id, record_id, created_at, changes")
    .eq("id", sessionId)
    .maybeSingle()
  const changes = (data?.changes ?? {}) as Record<string, unknown>
  if (!data || data.actor_id !== actorId || data.record_id !== userId || changes.action !== "view_as" || !data.created_at) return null
  if (now.getTime() - new Date(data.created_at).getTime() > VIEW_AS_MINUTES * 60 * 1000) return null
  return typeof changes.reason === "string" ? changes.reason : ""
}

// ---------------------------------------------------------------------------
// Phase 3: Chatwoot cases matched to Ticketiv records

export interface CaseMatch {
  people: Array<{ id: string; name: string; email: string | null }>
  orders: Array<{ id: string; ref: string; status: string; eventTitle: string | null; createdAt: string }>
  suggestions: Array<{ text: string; href: string; cta: string }>
  matchedBy: string | null
}

export async function matchCaseRecords(email: string | null, phone: string | null): Promise<CaseMatch> {
  const admin = createAdminClient()
  const db = untyped(admin)
  const probes = [email, phone && phone.replace(/[^0-9+]/g, "").length >= 6 ? phone : null].filter((v): v is string => Boolean(v))
  if (!probes.length) return { people: [], orders: [], suggestions: [], matchedBy: null }

  const results = await Promise.all(
    probes.flatMap((probe) => [db.rpc("admin_search_people", { p_query: probe, p_limit: 3 }), db.rpc("admin_search_orders", { p_query: probe, p_limit: 5 })]),
  )
  const people = new Map<string, CaseMatch["people"][number]>()
  const orders = new Map<string, CaseMatch["orders"][number]>()
  results.forEach((res: any, index: number) => {
    for (const row of res?.data ?? []) {
      if (index % 2 === 0) {
        // Email must match exactly; a phone search is already digits-exact.
        if (email && probes[Math.floor(index / 2)] === email && row.email?.toLowerCase() !== email) continue
        people.set(row.user_id, { id: row.user_id, name: personName(row), email: row.email })
      } else {
        orders.set(row.order_id, { id: row.order_id, ref: orderRef(row.order_id), status: row.status, eventTitle: row.event_title, createdAt: row.created_at })
      }
    }
  })

  const orderList = [...orders.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)
  const suggestions: CaseMatch["suggestions"] = []
  if (orderList.length) {
    const ids = orderList.map((o) => o.id)
    const [deliveries, refs, refunds] = await Promise.all([
      admin.from("notifications").select("status, payload, created_at").eq("type", "ticket_issued").in("payload->>order_id", ids),
      db.from("payment_support_references").select("order_id").in("order_id", ids),
      admin.from("refunds").select("status, provider_payload").eq("status", "requested").in("provider_payload->>order_id", ids),
    ])
    const undelivered = undeliveredOrders(
      ((deliveries.data ?? []) as any[]).map((d) => ({ order_id: d.payload?.order_id ?? null, status: d.status, created_at: d.created_at })),
    ).map((u) => u.orderId)
    for (const id of undelivered) {
      suggestions.push({ text: `The tickets for order ${orderRef(id)} never arrived. Check the email address on the order, then resend.`, href: `/super-admin/order/${id}`, cta: "Open the order to resend" })
    }
    const failedPayments = new Set(((refs.data ?? []) as any[]).map((r) => r.order_id))
    for (const order of orderList.filter((o) => failedPayments.has(o.id) && o.status !== "paid")) {
      suggestions.push({ text: `Order ${order.ref} couldn't be paid: the payment didn't start, so nothing was charged.`, href: `/super-admin/order/${order.id}`, cta: "See what the provider said" })
    }
    for (const refund of (refunds.data ?? []) as any[]) {
      const id = refund.provider_payload?.order_id
      if (id) suggestions.push({ text: `A refund for order ${orderRef(id)} is waiting for approval.`, href: `/super-admin/order/${id}#refunds`, cta: "Open the refund" })
    }
  }

  return {
    people: [...people.values()],
    orders: orderList,
    suggestions: suggestions.slice(0, 3),
    matchedBy: people.size || orders.size ? [email && "email", phone && "phone"].filter(Boolean).join(" and ") : null,
  }
}

// ---------------------------------------------------------------------------
// Phase 3: saved replies and settings history

export interface SavedReply {
  id: string
  title: string
  body: string
  updatedAt: string
}

export async function listSavedReplies(): Promise<SavedReply[]> {
  const { data } = await untyped(createAdminClient()).from("admin_saved_replies").select("id, title, body, updated_at").order("title")
  return ((data ?? []) as any[]).map((r) => ({ id: r.id, title: r.title, body: r.body, updatedAt: r.updated_at }))
}

export interface SettingsHistoryEntry {
  id: number
  table: string
  recordId: string
  operation: "insert" | "update" | "delete"
  oldRow: Record<string, unknown> | null
  newRow: Record<string, unknown> | null
  changedFields: string[]
  actor: string | null
  reason: string | null
  at: string
}

export async function listSettingsHistory(table?: string | null, limit = 100): Promise<SettingsHistoryEntry[]> {
  const admin = createAdminClient()
  const db = untyped(admin)
  let query = db
    .from("admin_settings_history")
    .select("id, table_name, record_id, operation, old_row, new_row, changed_fields, actor_id, changed_at")
    .order("changed_at", { ascending: false })
    .limit(limit)
  if (table) query = query.eq("table_name", table)
  const { data } = await query
  const rows = (data ?? []) as any[]
  if (!rows.length) return []

  // Who and why: the console writes an audit row for each change; match it by
  // record and time (within 30 seconds) when the trigger couldn't see the actor.
  const oldest = rows[rows.length - 1].changed_at
  const { data: audits } = await admin
    .from("audit_log")
    .select("actor_id, table_name, record_id, changes, created_at")
    .in("table_name", [...new Set(rows.map((r) => r.table_name))])
    .gte("created_at", new Date(new Date(oldest).getTime() - 30_000).toISOString())
    .limit(500)
  const near = (row: any) =>
    ((audits ?? []) as any[]).find(
      (a) => a.table_name === row.table_name && a.record_id === row.record_id && Math.abs(new Date(a.created_at).getTime() - new Date(row.changed_at).getTime()) <= 30_000,
    )
  const matched = rows.map((row) => near(row))
  const emails = await emailsFor(admin, rows.map((row, i) => row.actor_id ?? matched[i]?.actor_id))

  return rows.map((row, i) => {
    const actorId = row.actor_id ?? matched[i]?.actor_id ?? null
    const reason = matched[i]?.changes?.reason
    return {
      id: Number(row.id),
      table: row.table_name,
      recordId: row.record_id,
      operation: row.operation,
      oldRow: row.old_row,
      newRow: row.new_row,
      changedFields: row.changed_fields ?? [],
      actor: actorId ? emails.get(actorId) ?? "an admin" : null,
      reason: typeof reason === "string" ? reason : null,
      at: row.changed_at,
    }
  })
}

// ---------------------------------------------------------------------------
// Home: recent admin activity

export interface AdminActivity {
  id: string
  who: string
  summary: string
  reason: string | null
  at: string
  href: string | null
}

/** The last console actions (business_action "admin_console"), newest first. */
export async function getRecentAdminActivity(limit = 6): Promise<AdminActivity[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("audit_log")
    .select("id, actor_id, table_name, record_id, changes, created_at")
    .eq("changes->>business_action", "admin_console")
    .order("created_at", { ascending: false })
    .limit(limit)
  const rows = (data ?? []) as any[]
  const emails = await emailsFor(admin, rows.map((row) => row.actor_id))
  return rows.map((row) => {
    const changes = (row.changes ?? {}) as Record<string, unknown>
    const orderId = typeof changes.order_id === "string" ? changes.order_id : row.table_name === "orders" ? row.record_id : null
    return {
      id: row.id,
      who: emails.get(row.actor_id) ?? "An admin",
      summary: String(changes.summary ?? "Admin action"),
      reason: typeof changes.reason === "string" ? changes.reason : null,
      at: row.created_at,
      href: orderId && isUuid(orderId) ? `/super-admin/order/${orderId}` : row.table_name === "auth.users" && isUuid(row.record_id) ? `/super-admin/people/${row.record_id}` : null,
    }
  })
}
