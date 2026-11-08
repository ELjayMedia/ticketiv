import { CHECKOUT_PROVIDERS, type CheckoutPaymentProvider } from "@/lib/payments/providers/catalog"

/** Every checkout provider passes the production-readiness gate before taking real money. */
export const PRODUCTION_READINESS_PROVIDERS: readonly CheckoutPaymentProvider[] = CHECKOUT_PROVIDERS

export type ProductionReadinessProvider = CheckoutPaymentProvider

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
