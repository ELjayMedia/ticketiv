export const PRODUCTION_READINESS_PROVIDERS = ["paystack", "momo", "deltapay"] as const

export type ProductionReadinessProvider = (typeof PRODUCTION_READINESS_PROVIDERS)[number]

export interface ProviderProductionReadiness {
  provider: ProductionReadinessProvider
  productionReady: boolean
  approvedAt: string | null
  approvedBy: string | null
  evidenceRefs: unknown[]
  blockedAt: string | null
  blockedReason: string | null
}

export function assertProviderReadinessState(readiness: ProviderProductionReadiness): void {
  if (readiness.blockedAt || readiness.blockedReason) {
    throw new Error(
      `Refusing real-money ${readiness.provider} payment: provider production readiness is blocked` +
        (readiness.blockedReason ? ` (${readiness.blockedReason})` : "") +
        ".",
    )
  }

  if (!readiness.productionReady) {
    throw new Error(
      `Refusing real-money ${readiness.provider} payment: provider has not passed the TICK-400 production-readiness gate.`,
    )
  }

  if (!readiness.approvedAt || !readiness.approvedBy || readiness.evidenceRefs.length === 0) {
    throw new Error(
      `Refusing real-money ${readiness.provider} payment: production approval evidence is incomplete.`,
    )
  }
}
