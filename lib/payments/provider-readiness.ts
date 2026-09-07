import "server-only"

import {
  assertProviderReadinessState,
  type ProductionReadinessProvider,
  type ProviderProductionReadiness,
} from "@/lib/payments/provider-readiness-core"
import { createAdminClient } from "@/lib/supabase/admin"

type ProviderReadinessRow = {
  provider: ProductionReadinessProvider
  production_ready: boolean
  approved_at: string | null
  approved_by: string | null
  evidence_refs: unknown[] | null
  blocked_at: string | null
  blocked_reason: string | null
}

type ReadinessQueryResult<T> = Promise<{ data: T | null; error: unknown }>

type ReadinessQuery = {
  eq(column: string, value: string): {
    maybeSingle<T>(): ReadinessQueryResult<T>
  }
}

type ReadinessTableClient = {
  select(columns: string): ReadinessQuery
}

type ReadinessAdminClient = {
  from(relation: "payment_provider_readiness"): ReadinessTableClient
}

export async function getProviderProductionReadiness(
  provider: ProductionReadinessProvider,
): Promise<ProviderProductionReadiness> {
  const admin = createAdminClient()
  if (!admin) throw new Error("Supabase is not configured")

  // The table is introduced by the same PR, so the generated Database type from
  // the current production schema cannot contain it until the migration lands.
  // Keep this single lookup structurally typed; regenerate types after deploy.
  const readinessAdmin = admin as unknown as ReadinessAdminClient
  const { data, error } = await readinessAdmin
    .from("payment_provider_readiness")
    .select("provider, production_ready, approved_at, approved_by, evidence_refs, blocked_at, blocked_reason")
    .eq("provider", provider)
    .maybeSingle<ProviderReadinessRow>()

  if (error) {
    console.error("Failed to load provider production readiness", { provider, error })
    throw new Error(
      `Refusing real-money ${provider} payment: provider production-readiness state is unavailable.`,
    )
  }

  if (!data) {
    return {
      provider,
      productionReady: false,
      approvedAt: null,
      approvedBy: null,
      evidenceRefs: [],
      blockedAt: null,
      blockedReason: null,
    }
  }

  return {
    provider: data.provider,
    productionReady: Boolean(data.production_ready),
    approvedAt: data.approved_at,
    approvedBy: data.approved_by,
    evidenceRefs: Array.isArray(data.evidence_refs) ? data.evidence_refs : [],
    blockedAt: data.blocked_at,
    blockedReason: data.blocked_reason,
  }
}

export async function assertProviderProductionReady(
  provider: ProductionReadinessProvider,
): Promise<void> {
  const readiness = await getProviderProductionReadiness(provider)
  assertProviderReadinessState(readiness)
}
