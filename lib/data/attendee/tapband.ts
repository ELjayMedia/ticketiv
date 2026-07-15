import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import {
  createTapBandLifecycleService,
  type TapBandCustomerCredential,
} from "@/lib/tapband/lifecycle"

export type TapBandStatusTone = "active" | "pending" | "warning" | "danger" | "muted"

export interface MyTapBandProfile {
  credentials: TapBandCredentialCard[]
  activeCredential: TapBandCredentialCard | null
  eligibleTickets: TapBandTicketLink[]
  lastUsed: TapBandLastUsedSummary | null
  supportHref: string
}

export interface TapBandCredentialCard {
  credentialId: string
  safeLabel: string
  serialSuffix: string | null
  status: string
  statusLabel: string
  statusTone: TapBandStatusTone
  issuedAt: string | null
  activatedAt: string | null
  lastUsedAt: string | null
  revokedAt: string | null
  replacementOfId: string | null
  replacedById: string | null
  lineageLabel: string | null
  canReportLost: boolean
}

export interface TapBandTicketLink {
  credentialId: string
  orderItemId: string
  eventId: string
  eventTitle: string
  ticketLabel: string
  eventStartsAt: string | null
  status: string
}

export interface TapBandLastUsedSummary {
  credentialId: string
  label: string
  at: string
}

export interface TapBandLostValidationResult {
  ok: boolean
  error?: string
}

export interface TapBandEntitlementRecord {
  credential_id: string
  event_id: string
  order_item_id: string
  status: string
  valid_from: string | null
  valid_until: string | null
  removed_at: string | null
  order_items?: MaybeRelation<TapBandOrderItemRecord>
}

interface TapBandOrderItemRecord {
  id: string
  name: string | null
  status: string | null
  checked_in_at: string | null
  ticket_types?: MaybeRelation<TapBandTicketTypeRecord>
}

interface TapBandTicketTypeRecord {
  name: string | null
  events?: MaybeRelation<TapBandEventRecord>
}

interface TapBandEventRecord {
  id: string
  title: string | null
  starts_at: string | null
}

type MaybeRelation<T> = T | T[] | null

const SUPPORT_HREF = "/support"
const LOST_CONFIRMATION = "LOST"
const LOST_REPORTABLE_STATUSES = new Set(["issued", "active", "suspended"])
const ACTIVE_ENTITLEMENT_STATUS = "active"
const INELIGIBLE_ORDER_STATUSES = new Set([
  "cancelled",
  "canceled",
  "checked_in",
  "refunded",
  "revoked",
  "void",
])

const STATUS_COPY: Record<string, { label: string; tone: TapBandStatusTone }> = {
  issued: { label: "Ready to activate", tone: "pending" },
  active: { label: "Active", tone: "active" },
  suspended: { label: "Paused", tone: "warning" },
  lost: { label: "Lost", tone: "danger" },
  revoked: { label: "Revoked", tone: "danger" },
  replaced: { label: "Replaced", tone: "muted" },
  retired: { label: "Retired", tone: "muted" },
  defective: { label: "Unavailable", tone: "danger" },
  destroyed: { label: "Destroyed", tone: "muted" },
}

export async function getMyTapBandProfile(): Promise<MyTapBandProfile | null> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  try {
    const service = createTapBandLifecycleService()
    const credentials = await service.listCustomerCredentials({ userId: user.id })
    const entitlements = await getTapBandEntitlements(credentials)

    return buildTapBandProfile(credentials, entitlements)
  } catch (error) {
    console.error("[tapband-profile] unable to load TapBand profile:", error)
    return buildTapBandProfile([])
  }
}

export function buildTapBandProfile(
  credentials: TapBandCustomerCredential[],
  entitlements: TapBandEntitlementRecord[] = [],
  now = new Date(),
): MyTapBandProfile {
  const cards = credentials
    .map(mapCredentialCard)
    .sort((a, b) => credentialSortValue(b) - credentialSortValue(a))

  const byId = new Map(cards.map((card) => [card.credentialId, card]))
  const cardsWithLineage = cards.map((card) => ({
    ...card,
    lineageLabel: friendlyLineage(card, byId),
  }))
  const ownedCredentialIds = new Set(cardsWithLineage.map((card) => card.credentialId))
  const activeCredentialIds = new Set(
    cardsWithLineage
      .filter((card) => card.status === "active")
      .map((card) => card.credentialId),
  )

  return {
    credentials: cardsWithLineage,
    activeCredential: cardsWithLineage.find((card) => card.status === "active") ?? null,
    eligibleTickets: entitlements
      .filter((entitlement) =>
        isEligibleEntitlement(entitlement, ownedCredentialIds, activeCredentialIds, now),
      )
      .map(mapEligibleTicket)
      .sort((a, b) => ticketSortValue(a) - ticketSortValue(b)),
    lastUsed: lastUsedSummary(cardsWithLineage),
    supportHref: SUPPORT_HREF,
  }
}

export function validateTapBandLostReport(
  profile: MyTapBandProfile,
  credentialId: string,
  confirmation: string | boolean,
): TapBandLostValidationResult {
  const confirmed =
    confirmation === true ||
    String(confirmation ?? "").trim().toUpperCase() === LOST_CONFIRMATION

  if (!confirmed) {
    return { ok: false, error: "Type LOST to confirm this band should stop working." }
  }

  const credential = profile.credentials.find((card) => card.credentialId === credentialId)
  if (!credential) {
    return { ok: false, error: "That TapBand is not linked to your account." }
  }

  if (!credential.canReportLost) {
    return { ok: false, error: "This TapBand is already inactive." }
  }

  return { ok: true }
}

async function getTapBandEntitlements(
  credentials: TapBandCustomerCredential[],
): Promise<TapBandEntitlementRecord[]> {
  const credentialIds = credentials.map((credential) => credential.credentialId).filter(Boolean)
  if (credentialIds.length === 0) return []

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("credential_entitlements")
    .select(`
      credential_id,
      event_id,
      order_item_id,
      status,
      valid_from,
      valid_until,
      removed_at,
      order_items (
        id,
        name,
        status,
        checked_in_at,
        ticket_types (
          name,
          events (
            id,
            title,
            starts_at
          )
        )
      )
    `)
    .in("credential_id", credentialIds)
    .order("valid_from", { ascending: true })

  if (error) {
    console.error("[tapband-profile] unable to load TapBand entitlements:", error)
    return []
  }

  return (data ?? []) as unknown as TapBandEntitlementRecord[]
}

function mapCredentialCard(credential: TapBandCustomerCredential): TapBandCredentialCard {
  const status = credential.status || "unknown"
  const copy = STATUS_COPY[status] ?? { label: titleCase(status), tone: "muted" as const }
  const suffix = serialSuffix(credential.credentialPublicId)

  return {
    credentialId: credential.credentialId,
    safeLabel: suffix ? `TapBand ending ${suffix}` : "TapBand",
    serialSuffix: suffix,
    status,
    statusLabel: copy.label,
    statusTone: copy.tone,
    issuedAt: credential.issuedAt,
    activatedAt: credential.activatedAt,
    lastUsedAt: credential.lastUsedAt,
    revokedAt: credential.revokedAt,
    replacementOfId: credential.replacementOfId,
    replacedById: credential.replacedById,
    lineageLabel: null,
    canReportLost: LOST_REPORTABLE_STATUSES.has(status),
  }
}

function isEligibleEntitlement(
  entitlement: TapBandEntitlementRecord,
  ownedCredentialIds: Set<string>,
  activeCredentialIds: Set<string>,
  now: Date,
) {
  if (!ownedCredentialIds.has(entitlement.credential_id)) return false
  if (!activeCredentialIds.has(entitlement.credential_id)) return false
  if (entitlement.status !== ACTIVE_ENTITLEMENT_STATUS) return false
  if (entitlement.removed_at) return false
  if (entitlement.valid_until && new Date(entitlement.valid_until).getTime() <= now.getTime()) {
    return false
  }

  const orderItem = firstRelation(entitlement.order_items)
  if (!orderItem) return false
  if (orderItem.checked_in_at) return false
  if (orderItem.status && INELIGIBLE_ORDER_STATUSES.has(orderItem.status)) return false

  const event = eventForOrderItem(orderItem)
  if (event?.starts_at && new Date(event.starts_at).getTime() < now.getTime()) {
    return false
  }

  return true
}

function mapEligibleTicket(entitlement: TapBandEntitlementRecord): TapBandTicketLink {
  const orderItem = firstRelation(entitlement.order_items)
  const ticketType = firstRelation(orderItem?.ticket_types)
  const event = orderItem ? eventForOrderItem(orderItem) : null

  return {
    credentialId: entitlement.credential_id,
    orderItemId: entitlement.order_item_id,
    eventId: event?.id ?? entitlement.event_id,
    eventTitle: event?.title ?? "Upcoming event",
    ticketLabel: orderItem?.name ?? ticketType?.name ?? "Ticket",
    eventStartsAt: event?.starts_at ?? null,
    status: orderItem?.status ?? entitlement.status,
  }
}

function eventForOrderItem(orderItem: TapBandOrderItemRecord) {
  const ticketType = firstRelation(orderItem.ticket_types)
  return firstRelation(ticketType?.events)
}

function friendlyLineage(
  card: TapBandCredentialCard,
  byId: Map<string, TapBandCredentialCard>,
) {
  if (card.replacedById) {
    const replacement = byId.get(card.replacedById)
    return replacement ? `Replaced by ${replacement.safeLabel}` : "Replaced by a newer TapBand"
  }
  if (card.replacementOfId) return "Replacement for a previous TapBand"
  return null
}

function lastUsedSummary(cards: TapBandCredentialCard[]): TapBandLastUsedSummary | null {
  const latest = cards
    .filter((card) => card.lastUsedAt)
    .sort((a, b) => new Date(b.lastUsedAt ?? 0).getTime() - new Date(a.lastUsedAt ?? 0).getTime())[0]

  return latest && latest.lastUsedAt
    ? { credentialId: latest.credentialId, label: latest.safeLabel, at: latest.lastUsedAt }
    : null
}

function serialSuffix(value: string) {
  const compact = value.replace(/[^a-z0-9]/gi, "").toUpperCase()
  return compact ? compact.slice(-4) : null
}

function credentialSortValue(card: TapBandCredentialCard) {
  if (card.status === "active") return Number.MAX_SAFE_INTEGER
  return new Date(card.activatedAt ?? card.issuedAt ?? card.lastUsedAt ?? 0).getTime()
}

function ticketSortValue(ticket: TapBandTicketLink) {
  return ticket.eventStartsAt ? new Date(ticket.eventStartsAt).getTime() : Number.MAX_SAFE_INTEGER
}

function firstRelation<T>(value: MaybeRelation<T> | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function titleCase(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
