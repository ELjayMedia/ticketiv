import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { classifySearch, isUuid, orderRef, type SearchKind } from "@/lib/super-admin/console"

// Admin console, phase 1: everything support needs to answer "what happened to
// this customer?" without opening the database. Service-role reads, called only
// from pages behind requireSuperAdmin().

type Admin = ReturnType<typeof createAdminClient>

// Tables and functions added by 20261106100000_admin_console_phase1.sql are not
// in the generated Database type yet; these rows describe them.
export interface AdminNote {
  id: string
  subject_type: "order" | "person" | "event" | "organization"
  subject_id: string
  author_id: string | null
  body: string
  created_at: string
}

export interface PaymentSupportReference {
  ref: string
  order_id: string | null
  event_id: string | null
  reason: string
  provider: string | null
  diagnostic: Record<string, unknown>
  created_at: string
}

interface PersonSearchRow {
  user_id: string
  email: string | null
  display_name: string | null
  name: string | null
  surname: string | null
  phone: string | null
  created_at: string
  last_sign_in_at: string | null
}

interface OrderSearchRow {
  order_id: string
  status: string
  total_cents: number | null
  currency: string | null
  buyer_email: string | null
  buyer_id: string | null
  event_id: string | null
  event_title: string | null
  item_count: number | null
  created_at: string
  matched_ticket_code: string | null
}

export function untyped(admin: Admin) {
  return admin as unknown as {
    from: (table: string) => any
    rpc: (fn: string, args: Record<string, unknown>) => any
  }
}

export interface SearchHit {
  kind: "payment" | "order" | "person" | "event" | "organization"
  title: string
  detail: string
  status: string | null
  tone: "danger" | "warning" | "success" | "muted"
  href: string
}

export interface ConsoleSearchResult {
  query: string
  kind: SearchKind
  hits: SearchHit[]
}

const ORDER_TONE: Record<string, SearchHit["tone"]> = {
  paid: "success",
  pending: "warning",
  failed: "danger",
  refunded: "muted",
}

export function personName(row: { display_name?: string | null; name?: string | null; surname?: string | null; email?: string | null }) {
  const full = [row.name, row.surname].filter(Boolean).join(" ").trim()
  return full || row.display_name || row.email || "Unnamed account"
}

export async function searchConsole(rawQuery: string): Promise<ConsoleSearchResult> {
  const { kind, query } = classifySearch(rawQuery)
  if (kind === "empty") return { query, kind, hits: [] }

  const admin = createAdminClient()
  const db = untyped(admin)
  const like = `%${query.replace(/[%_,()]/g, " ").trim()}%`
  const textual = kind === "text" || kind === "email"

  const [refs, orders, people, events, orgs] = await Promise.all([
    query.toUpperCase().startsWith("PAY-")
      ? db
          .from("payment_support_references")
          .select("ref, order_id, reason, provider, created_at")
          .ilike("ref", `${query.toUpperCase()}%`)
          .order("created_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
    kind === "payment_reference"
      ? Promise.resolve({ data: [] })
      : db.rpc("admin_search_orders", { p_query: query, p_limit: 10 }),
    kind === "payment_reference" || kind === "ticket_code"
      ? Promise.resolve({ data: [] })
      : db.rpc("admin_search_people", { p_query: query, p_limit: 8 }),
    kind === "text"
      ? admin.from("events").select("id, title, starts_at, status").ilike("title", like).order("starts_at", { ascending: false }).limit(5)
      : Promise.resolve({ data: [] }),
    textual
      ? admin.from("organizations").select("id, name, slug").ilike("name", like).limit(5)
      : Promise.resolve({ data: [] }),
  ])

  const hits: SearchHit[] = []

  for (const ref of (refs.data ?? []) as PaymentSupportReference[]) {
    hits.push({
      kind: "payment",
      title: `${ref.ref} · payment could not start`,
      detail: [ref.provider, humanFailureReason(ref.reason), new Date(ref.created_at).toLocaleString("en-SZ")].filter(Boolean).join(" · "),
      status: "Failed",
      tone: "danger",
      href: ref.order_id ? `/super-admin/order/${ref.order_id}?ref=${ref.ref}` : `/super-admin/search?q=${ref.ref}`,
    })
  }

  for (const order of (orders.data ?? []) as OrderSearchRow[]) {
    hits.push({
      kind: "order",
      title: `Order ${orderRef(order.order_id)}${order.event_title ? ` · ${order.event_title}` : ""}`,
      detail: [
        order.buyer_email,
        `${order.item_count ?? 0} ticket${order.item_count === 1 ? "" : "s"}`,
        order.matched_ticket_code ? `ticket ${order.matched_ticket_code}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      status: order.status,
      tone: ORDER_TONE[order.status] ?? "muted",
      href: `/super-admin/order/${order.order_id}`,
    })
  }

  for (const person of (people.data ?? []) as PersonSearchRow[]) {
    hits.push({
      kind: "person",
      title: personName(person),
      detail: [person.email, person.phone].filter(Boolean).join(" · "),
      status: person.last_sign_in_at ? null : "Never signed in",
      tone: "muted",
      href: `/super-admin/people/${person.user_id}`,
    })
  }

  for (const event of (events.data ?? []) as Array<{ id: string; title: string; starts_at: string | null; status: string }>) {
    hits.push({
      kind: "event",
      title: event.title,
      detail: event.starts_at ? new Date(event.starts_at).toLocaleString("en-SZ", { dateStyle: "medium", timeStyle: "short" }) : "No date",
      status: event.status,
      tone: "muted",
      href: `/super-admin/event/${event.id}`,
    })
  }

  for (const org of (orgs.data ?? []) as Array<{ id: string; name: string; slug: string | null }>) {
    hits.push({
      kind: "organization",
      title: org.name,
      detail: org.slug ? `/${org.slug}` : "Organizer",
      status: null,
      tone: "muted",
      href: `/super-admin/organizer/${org.id}`,
    })
  }

  return { query, kind, hits }
}

export function humanFailureReason(reason: string | null | undefined): string {
  switch (reason) {
    case "missing_configuration":
      return "payment provider is not configured"
    case "provider_rejected_initialization":
      return "payment provider refused to start the payment"
    case "no_matching_route":
      return "no payment method available for this event"
    case "routing_configuration_unavailable":
      return "payment routing could not be loaded"
    default:
      return reason ?? ""
  }
}

// ---------------------------------------------------------------------------
// Order 360

export interface TimelineEntry {
  at: string
  title: string
  detail: string | null
  tone: "danger" | "warning" | "success" | "accent" | "muted"
}

export interface Order360 {
  id: string
  ref: string
  status: string
  totalCents: number
  currency: string
  createdAt: string
  buyerId: string | null
  buyerEmail: string | null
  buyerPhone: string | null
  buyerName: string | null
  event: { id: string; title: string; startsAt: string | null; orgId: string | null; orgName: string | null } | null
  items: Array<{
    id: string
    code: string | null
    typeName: string
    priceCents: number
    status: string
    holderName: string | null
    checkedInAt: string | null
  }>
  payments: Array<{ id: string; provider: string; status: string; amountCents: number; createdAt: string }>
  attempts: Array<{ id: string; provider: string; status: string; attemptNo: number; createdAt: string }>
  refunds: Array<{ id: string; status: string; amountCents: number; createdAt: string; reason: string | null; source: string | null }>
  deliveries: Array<{ channel: string; status: string; error: string | null; createdAt: string }>
  supportRefs: PaymentSupportReference[]
  notes: Array<AdminNote & { authorEmail: string | null }>
  timeline: TimelineEntry[]
  flags: string[]
}

export async function getOrder360(orderId: string): Promise<Order360 | null> {
  if (!isUuid(orderId)) return null
  const admin = createAdminClient()
  const db = untyped(admin)

  const { data: order } = await admin
    .from("orders")
    .select("id, status, total_cents, currency, created_at, buyer_id, buyer_email, email, buyer_phone, phone")
    .eq("id", orderId)
    .maybeSingle()
  if (!order) return null

  const [itemsRes, paymentsRes, attemptsRes, deliveriesRes, refsRes, auditRes, notesRes] = await Promise.all([
    admin
      .from("order_items")
      .select("id, ticket_code, status, holder_name, checked_in_at, created_at, ticket_types(name, price_cents, event_id)")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
    admin.from("payments").select("id, provider, status, amount_cents, created_at").eq("order_id", orderId).order("created_at"),
    admin.from("payment_attempts").select("id, provider, status, attempt_no, created_at").eq("order_id", orderId).order("created_at"),
    admin
      .from("notifications")
      .select("channel, status, last_error, created_at, type")
      .eq("payload->>order_id", orderId)
      .order("created_at"),
    db.from("payment_support_references").select("*").eq("order_id", orderId).order("created_at"),
    admin
      .from("audit_log")
      .select("id, actor_id, action, changes, created_at, table_name")
      .or(`record_id.eq.${orderId},changes->>order_id.eq.${orderId}`)
      .order("created_at", { ascending: false })
      .limit(50),
    loadNotes(admin, "order", orderId),
  ])

  const items = (itemsRes.data ?? []) as any[]
  const eventId: string | null = items[0]?.ticket_types?.event_id ?? null
  const payments = paymentsRes.data ?? []

  const [eventRes, refundsRes, buyerRes] = await Promise.all([
    eventId
      ? admin.from("events").select("id, title, starts_at, org_id, organizations(name)").eq("id", eventId).maybeSingle()
      : Promise.resolve({ data: null }),
    payments.length
      ? admin
          .from("refunds")
          .select("id, status, amount_cents, created_at, provider_payload")
          .in("payment_id", payments.map((p) => p.id))
          .order("created_at")
      : Promise.resolve({ data: [] }),
    order.buyer_id
      ? admin.from("profiles").select("display_name, name, surname").eq("user_id", order.buyer_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const event = eventRes.data as any
  const refunds = ((refundsRes.data ?? []) as any[]).map((r) => ({
    id: r.id as string,
    status: r.status as string,
    amountCents: r.amount_cents as number,
    createdAt: r.created_at as string,
    reason: (r.provider_payload?.reason as string | undefined) ?? null,
    source: (r.provider_payload?.source as string | undefined) ?? null,
  }))
  const deliveries = ((deliveriesRes.data ?? []) as any[]).map((d) => ({
    channel: d.channel as string,
    status: d.status as string,
    error: (d.last_error as string | null) ?? null,
    createdAt: d.created_at as string,
  }))
  const supportRefs = (refsRes.data ?? []) as PaymentSupportReference[]
  const audit = (auditRes.data ?? []) as any[]
  const actorEmails = await emailsFor(admin, audit.map((a) => a.actor_id).concat(notesRes.map((n) => n.author_id)))

  const timeline: TimelineEntry[] = [
    { at: order.created_at, title: "Order created", detail: `${items.length} ticket${items.length === 1 ? "" : "s"}`, tone: "muted" },
  ]
  for (const ref of supportRefs) {
    timeline.push({ at: ref.created_at, title: `${ref.ref}: payment could not start`, detail: humanFailureReason(ref.reason), tone: "danger" })
  }
  for (const attempt of attemptsRes.data ?? []) {
    timeline.push({
      at: attempt.created_at,
      title: `Payment attempt ${attempt.attempt_no} · ${attempt.provider}`,
      detail: attempt.status,
      tone: attempt.status === "failed" ? "danger" : "muted",
    })
  }
  for (const payment of payments) {
    timeline.push({
      at: payment.created_at ?? order.created_at,
      title: `Payment ${payment.status ?? "pending"}`,
      detail: `${payment.provider} · ${(payment.amount_cents / 100).toFixed(2)}`,
      tone: payment.status === "succeeded" ? "success" : payment.status === "failed" ? "danger" : "muted",
    })
  }
  for (const delivery of deliveries) {
    timeline.push({
      at: delivery.createdAt,
      title: `Ticket ${delivery.channel} ${delivery.status}`,
      detail: delivery.error,
      tone: delivery.status === "failed" ? "danger" : delivery.status === "sent" ? "success" : "muted",
    })
  }
  for (const refund of refunds) {
    timeline.push({
      at: refund.createdAt,
      title: `Refund ${refund.status}`,
      detail: [refund.source === "admin_console" ? "requested by staff" : refund.source, refund.reason].filter(Boolean).join(" · ") || null,
      tone: "warning",
    })
  }
  for (const entry of audit) {
    const changes = (entry.changes ?? {}) as Record<string, unknown>
    if (changes.business_action !== "admin_console") continue
    timeline.push({
      at: entry.created_at,
      title: String(changes.summary ?? changes.action ?? "Admin action"),
      detail: [actorEmails.get(entry.actor_id) ?? "admin", changes.reason ? `reason: ${changes.reason}` : null].filter(Boolean).join(" · "),
      tone: "accent",
    })
  }
  timeline.sort((a, b) => b.at.localeCompare(a.at))

  const flags: string[] = []
  if (deliveries.some((d) => d.status === "failed") && !deliveries.some((d) => d.status === "sent")) flags.push("Ticket delivery failed")
  if (supportRefs.length) flags.push("Payment errors")
  if (refunds.some((r) => r.status === "requested" || r.status === "processing")) flags.push("Refund in progress")

  return {
    id: order.id,
    ref: orderRef(order.id),
    status: order.status,
    totalCents: order.total_cents ?? 0,
    currency: order.currency ?? "SZL",
    createdAt: order.created_at,
    buyerId: order.buyer_id,
    buyerEmail: order.buyer_email ?? order.email ?? null,
    buyerPhone: order.buyer_phone ?? order.phone ?? null,
    buyerName: buyerRes.data ? personName(buyerRes.data as any) : null,
    event: event
      ? { id: event.id, title: event.title, startsAt: event.starts_at, orgId: event.org_id, orgName: event.organizations?.name ?? null }
      : null,
    items: items.map((item) => ({
      id: item.id,
      code: item.ticket_code ?? null,
      typeName: item.ticket_types?.name ?? "Ticket",
      priceCents: item.ticket_types?.price_cents ?? 0,
      status: item.status,
      holderName: item.holder_name ?? null,
      checkedInAt: item.checked_in_at ?? null,
    })),
    payments: payments.map((p) => ({ id: p.id, provider: p.provider, status: p.status ?? "pending", amountCents: p.amount_cents, createdAt: p.created_at ?? order.created_at })),
    attempts: (attemptsRes.data ?? []).map((a) => ({ id: a.id, provider: a.provider, status: a.status, attemptNo: a.attempt_no, createdAt: a.created_at })),
    refunds,
    deliveries,
    supportRefs,
    notes: notesRes.map((n) => ({ ...n, authorEmail: n.author_id ? actorEmails.get(n.author_id) ?? null : null })),
    timeline,
    flags,
  }
}

// ---------------------------------------------------------------------------
// Person 360

export interface Person360 {
  id: string
  email: string | null
  name: string
  phone: string | null
  createdAt: string
  lastSignInAt: string | null
  emailConfirmed: boolean
  signInMethods: string[]
  adminRole: string | null
  memberships: Array<{ orgId: string; orgName: string; role: string }>
  orders: Array<{ id: string; ref: string; status: string; totalCents: number; currency: string; createdAt: string; guest: boolean }>
  deliveryProblems: Array<{ orderId: string | null; channel: string; error: string | null; createdAt: string }>
  notes: Array<AdminNote & { authorEmail: string | null }>
  history: Array<{ at: string; title: string; detail: string | null }>
}

export async function getPerson360(userId: string): Promise<Person360 | null> {
  if (!isUuid(userId)) return null
  const admin = createAdminClient()

  const { data: authData, error } = await admin.auth.admin.getUserById(userId)
  const user = authData?.user
  if (error || !user) return null

  const email = user.email ?? null
  const [profileRes, privateRes, adminRes, membersRes, ordersRes, guestOrdersRes, deliveriesRes, auditRes, notes] = await Promise.all([
    admin.from("profiles").select("display_name, name, surname").eq("user_id", userId).maybeSingle(),
    untyped(admin).from("user_private_profiles").select("name, surname, phone").eq("user_id", userId).maybeSingle(),
    admin.from("admin_users").select("role_tier, active").eq("user_id", userId).maybeSingle(),
    admin.from("org_members").select("org_id, role, organizations(name)").eq("user_id", userId),
    admin
      .from("orders")
      .select("id, status, total_cents, currency, created_at")
      .eq("buyer_id", userId)
      .order("created_at", { ascending: false })
      .limit(25),
    email
      ? admin
          .from("orders")
          .select("id, status, total_cents, currency, created_at")
          .is("buyer_id", null)
          .ilike("buyer_email", email)
          .order("created_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),
    admin
      .from("notifications")
      .select("channel, status, last_error, created_at, payload")
      .eq("user_id", userId)
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("audit_log")
      .select("actor_id, changes, created_at")
      .eq("record_id", userId)
      .order("created_at", { ascending: false })
      .limit(30),
    loadNotes(admin, "person", userId),
  ])

  const profile = profileRes.data
  const priv = privateRes.data
  const audit = (auditRes.data ?? []) as any[]
  const emails = await emailsFor(admin, audit.map((a) => a.actor_id).concat(notes.map((n) => n.author_id)))

  const history: Person360["history"] = [{ at: user.created_at, title: "Account created", detail: null }]
  if (user.last_sign_in_at) history.push({ at: user.last_sign_in_at, title: "Last signed in", detail: null })
  for (const entry of audit) {
    const changes = (entry.changes ?? {}) as Record<string, unknown>
    if (changes.business_action !== "admin_console") continue
    history.push({
      at: entry.created_at,
      title: String(changes.summary ?? "Admin action"),
      detail: [emails.get(entry.actor_id) ?? "admin", changes.reason ? `reason: ${changes.reason}` : null].filter(Boolean).join(" · "),
    })
  }
  history.sort((a, b) => b.at.localeCompare(a.at))

  const toOrder = (guest: boolean) => (o: any) => ({
    id: o.id as string,
    ref: orderRef(o.id),
    status: o.status as string,
    totalCents: (o.total_cents as number) ?? 0,
    currency: (o.currency as string) ?? "SZL",
    createdAt: o.created_at as string,
    guest,
  })

  return {
    id: user.id,
    email,
    name: personName({ display_name: profile?.display_name, name: priv?.name ?? profile?.name, surname: priv?.surname ?? profile?.surname, email }),
    phone: priv?.phone ?? user.phone ?? null,
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at ?? null,
    emailConfirmed: Boolean(user.email_confirmed_at),
    signInMethods: Array.from(new Set((user.identities ?? []).map((identity) => identity.provider))),
    adminRole: adminRes.data?.active ? adminRes.data.role_tier : null,
    memberships: ((membersRes.data ?? []) as any[]).map((m) => ({ orgId: m.org_id, orgName: m.organizations?.name ?? "Organization", role: m.role })),
    orders: [...(ordersRes.data ?? []).map(toOrder(false)), ...((guestOrdersRes.data ?? []) as any[]).map(toOrder(true))].filter(
      (order, index, all) => all.findIndex((other) => other.id === order.id) === index,
    ),
    deliveryProblems: ((deliveriesRes.data ?? []) as any[]).map((d) => ({
      orderId: (d.payload?.order_id as string | undefined) ?? null,
      channel: d.channel,
      error: d.last_error,
      createdAt: d.created_at,
    })),
    notes: notes.map((n) => ({ ...n, authorEmail: n.author_id ? emails.get(n.author_id) ?? null : null })),
    history,
  }
}

// ---------------------------------------------------------------------------
// Team

export interface AdminTeamMember {
  userId: string
  email: string | null
  role: string
  active: boolean
  addedAt: string
  lastSignInAt: string | null
  pending: boolean
  mfa: boolean
}

export async function listAdminTeam(): Promise<AdminTeamMember[]> {
  const admin = createAdminClient()
  const { data } = await admin.from("admin_users").select("user_id, role_tier, active, created_at").order("created_at")
  const rows = data ?? []
  const users = await Promise.all(rows.map((row) => admin.auth.admin.getUserById(row.user_id)))
  return rows.map((row, index) => {
    const user = users[index]?.data?.user
    return {
      userId: row.user_id,
      email: user?.email ?? null,
      role: row.role_tier,
      active: row.active,
      addedAt: row.created_at,
      lastSignInAt: user?.last_sign_in_at ?? null,
      pending: !user?.last_sign_in_at,
      mfa: (user?.factors ?? []).some((factor) => factor.status === "verified"),
    }
  })
}

// ---------------------------------------------------------------------------

export async function loadNotes(admin: Admin, subjectType: AdminNote["subject_type"], subjectId: string): Promise<AdminNote[]> {
  const { data } = await untyped(admin)
    .from("admin_notes")
    .select("id, subject_type, subject_id, author_id, body, created_at")
    .eq("subject_type", subjectType)
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false })
    .limit(50)
  return (data ?? []) as AdminNote[]
}

export async function emailsFor(admin: Admin, ids: Array<string | null | undefined>): Promise<Map<string, string>> {
  const unique = Array.from(new Set(ids.filter((id): id is string => Boolean(id)))).slice(0, 20)
  const results = await Promise.all(unique.map((id) => admin.auth.admin.getUserById(id)))
  const map = new Map<string, string>()
  results.forEach((result, index) => {
    const email = result.data?.user?.email
    if (email) map.set(unique[index], email)
  })
  return map
}
