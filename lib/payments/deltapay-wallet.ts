import "server-only"

import {
  buildEpsWithdrawal,
  buildEpsWithdrawalPreviewQuery,
  evaluateDeltaPayWalletConfig,
  payoutReference,
  readPreview,
  type DeltaPayWalletConfig,
  type EpsWithdrawalInput,
  type PreviewOutcome,
} from "@/lib/payments/deltapay-wallet-core"

export type { DeltaPayWalletConfig, EpsWithdrawalInput, PreviewOutcome } from "@/lib/payments/deltapay-wallet-core"

/**
 * Server-side DeltaPay wallet rail (organizer payouts). Fail-closed: nothing
 * is sent unless every DELTAPAY_* payout variable is present and consistent.
 */
export function getDeltaPayWalletConfig(): DeltaPayWalletConfig {
  return evaluateDeltaPayWalletConfig({
    apiKey: process.env.DELTAPAY_API_KEY,
    baseUrl: process.env.DELTAPAY_BASE_URL,
    walletAddress: process.env.DELTAPAY_WALLET_ADDRESS,
    privateKey: process.env.DELTAPAY_WALLET_PRIVATE_KEY,
    callbackPublicKey: process.env.DELTAPAY_CALLBACK_PUBLIC_KEY,
    payoutsEnabled: process.env.DELTAPAY_PAYOUTS_ENABLED,
    productionEnabled: process.env.DELTAPAY_PRODUCTION_ENABLED,
    deploymentEnv: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  })
}

export class DeltaPayWalletError extends Error {}

function requireConfig(): DeltaPayWalletConfig {
  const config = getDeltaPayWalletConfig()
  if (!config.operational) throw new DeltaPayWalletError(`DeltaPay payouts are not configured: ${config.problems.join(" ")}`)
  return config
}

async function call<T>(config: DeltaPayWalletConfig, path: string, init: RequestInit & { apiKey?: boolean } = {}): Promise<T> {
  const { apiKey, ...rest } = init
  let response: Response
  try {
    response = await fetch(`${config.baseUrl}${path}`, {
      ...rest,
      headers: {
        accept: "application/json",
        ...(apiKey && config.apiKey ? { "x-api-key": config.apiKey } : {}),
        ...(rest.body ? { "content-type": "application/json" } : {}),
      },
      cache: "no-store",
    })
  } catch {
    throw new DeltaPayWalletError("Unable to reach DeltaPay")
  }
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    // Never echo the request (it carries the wallet key); only DeltaPay's detail.
    const detail = payload && typeof payload === "object" && "detail" in payload ? String((payload as { detail?: unknown }).detail ?? "") : ""
    throw new DeltaPayWalletError(detail || `DeltaPay request failed with HTTP ${response.status}`)
  }
  return payload as T
}

/** Advisory check: balance, limits, recipient account. */
export async function previewEpsPayout(input: EpsWithdrawalInput): Promise<PreviewOutcome> {
  const config = requireConfig()
  const query = buildEpsWithdrawalPreviewQuery(input, config.walletAddress!)
  return readPreview(await call(config, `/transaction/eps-withdrawal-preview?${query}`, { apiKey: true }))
}

/** Creates, signs and submits the EPS transfer. Returns DeltaPay's blockchain tracking ID. */
export async function sendEpsPayout(input: EpsWithdrawalInput): Promise<{ trackingId: string; reference: string }> {
  const config = requireConfig()
  const payload = await call<{ success?: boolean; tracking_id?: unknown }>(config, "/transaction/eps-withdrawal", {
    method: "POST",
    body: JSON.stringify({ ...buildEpsWithdrawal(input), private_key: config.privateKey }),
  })
  const trackingId = payload?.tracking_id == null ? "" : String(payload.tracking_id)
  if (!payload?.success || !trackingId) throw new DeltaPayWalletError("DeltaPay did not accept the transfer")
  return { trackingId, reference: payoutReference(input.payoutId) }
}

export interface DeltaPayTransactionLookup {
  transactionId: number | null
  status: string | null
  amount: number | null
  metadata: string | null
}

/** The DeltaPay business transaction for a payout, by our reference. */
export async function lookupPayoutTransaction(payoutId: string): Promise<DeltaPayTransactionLookup | null> {
  const config = requireConfig()
  const query = new URLSearchParams({ metadata: payoutReference(payoutId) })
  let payload: Record<string, unknown> | null
  try {
    payload = await call<Record<string, unknown>>(config, `/full-transaction/from-metadata?${query}`, { apiKey: true })
  } catch (error) {
    if (error instanceof DeltaPayWalletError && /not found|404/i.test(error.message)) return null
    throw error
  }
  if (!payload) return null
  const tx = (payload.transaction && typeof payload.transaction === "object" ? payload.transaction : payload) as Record<string, unknown>
  return {
    transactionId: typeof tx.transaction_id === "number" ? tx.transaction_id : null,
    status: typeof tx.transaction_status === "string" ? tx.transaction_status : null,
    amount: typeof tx.amount === "number" ? tx.amount : null,
    metadata: typeof tx.metadata === "string" ? tx.metadata : null,
  }
}
