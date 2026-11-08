import "server-only"

import { emailsFor } from "@/lib/data/admin/console"
import {
  missingReadinessItems,
  parseEvidence,
  readinessState,
  type ReadinessEvidence,
  type ReadinessItemId,
  type ReadinessState,
} from "@/lib/payments/provider-readiness-checklist"
import { CHECKOUT_PROVIDERS, type CheckoutPaymentProvider } from "@/lib/payments/providers/catalog"
import { createAdminClient } from "@/lib/supabase/admin"

// TICK-403: everything the Integrations page shows about going live with a
// payment provider. Service role; the page itself is super-admin only.

export interface ReadinessEventView {
  id: string
  action: string
  item: string | null
  reason: string | null
  actor: string
  at: string
}

export interface ProviderReadinessView {
  provider: CheckoutPaymentProvider
  state: ReadinessState
  checkoutEnabled: boolean
  approvedAt: string | null
  approvedBy: string | null
  blockedAt: string | null
  blockedReason: string | null
  evidence: Array<ReadinessEvidence & { recordedByEmail: string | null }>
  missing: ReadinessItemId[]
  history: ReadinessEventView[]
}

type Loose = { from: (table: string) => any }

export async function loadProviderReadiness(): Promise<ProviderReadinessView[]> {
  const admin = createAdminClient()
  const db = admin as unknown as Loose
  const [readinessRes, settingsRes, eventsRes] = await Promise.all([
    db
      .from("payment_provider_readiness")
      .select("provider, production_ready, approved_at, approved_by, evidence_refs, blocked_at, blocked_reason"),
    db.from("payment_provider_settings").select("provider, is_enabled"),
    db
      .from("payment_provider_readiness_events")
      .select("id, provider, action, item, reason, actor_id, created_at")
      .order("created_at", { ascending: false })
      .limit(60),
  ])
  if (readinessRes.error) console.error("[provider-readiness] readiness", readinessRes.error)
  if (eventsRes.error) console.error("[provider-readiness] history", eventsRes.error)

  const rows = new Map<string, any>(((readinessRes.data ?? []) as any[]).map((r) => [r.provider, r]))
  const enabled = new Map<string, boolean>(((settingsRes.data ?? []) as any[]).map((r) => [r.provider, Boolean(r.is_enabled)]))
  const events = (eventsRes.data ?? []) as Array<{
    id: string
    provider: string
    action: string
    item: string | null
    reason: string | null
    actor_id: string | null
    created_at: string
  }>

  const people = new Set<string>()
  for (const row of rows.values()) {
    if (row.approved_by) people.add(row.approved_by)
    for (const e of parseEvidence(row.evidence_refs)) if (e.recordedBy) people.add(e.recordedBy)
  }
  for (const e of events) if (e.actor_id) people.add(e.actor_id)
  const emails = people.size ? await emailsFor(admin, [...people]) : new Map<string, string>()
  const who = (id: string | null) => (id ? emails.get(id) ?? "an admin" : "an admin")

  return CHECKOUT_PROVIDERS.map((provider) => {
    const row = rows.get(provider)
    const evidence = parseEvidence(row?.evidence_refs)
    const productionReady = Boolean(row?.production_ready)
    const blockedAt = row?.blocked_at ?? null
    return {
      provider,
      state: readinessState({ productionReady, blockedAt }),
      // No settings row means "on" for availability (lib/payments/availability.ts).
      checkoutEnabled: enabled.has(provider) ? enabled.get(provider) === true : true,
      approvedAt: row?.approved_at ?? null,
      approvedBy: row?.approved_by ? who(row.approved_by) : null,
      blockedAt,
      blockedReason: row?.blocked_reason ?? null,
      evidence: evidence.map((e) => ({ ...e, recordedByEmail: e.recordedBy ? who(e.recordedBy) : null })),
      missing: missingReadinessItems(provider, evidence),
      history: events
        .filter((e) => e.provider === provider)
        .slice(0, 12)
        .map((e) => ({ id: e.id, action: e.action, item: e.item, reason: e.reason, actor: who(e.actor_id), at: e.created_at })),
    }
  })
}
