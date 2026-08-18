import "server-only"

import {
  centsToDeltaPayAmount,
  evaluateDeltaPayConfig,
  type DeltaPayConfig,
  type DeltaPaySessionStatus,
} from "@/lib/payments/deltapay-core"

export {
  centsToDeltaPayAmount,
  deltaPayAmountToCents,
  evaluateDeltaPayConfig,
  DELTAPAY_DEV_BASE_URL,
  DELTAPAY_PROD_BASE_URL,
} from "@/lib/payments/deltapay-core"
export type { DeltaPayConfig, DeltaPaySessionStatus } from "@/lib/payments/deltapay-core"

export interface DeltaPayHostedSession {
  checkout_session_id: string
  checkout_url: string
  expires_at: string
}

export interface DeltaPayVerifiedSession {
  checkout_session_id: string
  status: DeltaPaySessionStatus
  merchant_reference: string
  platform_order_id: string | null
  amount: number
  finalised_at: string | null
}

export interface CreateDeltaPaySessionInput {
  amountCents: number
  merchantReference: string
  platformOrderId: string
  returnUrl: string
  callbackUrl: string
  displayDescription?: string | null
  metadata?: string | null
}

export function getDeltaPayConfig(): DeltaPayConfig {
  return evaluateDeltaPayConfig({
    apiKey: process.env.DELTAPAY_API_KEY,
    baseUrl: process.env.DELTAPAY_BASE_URL,
    deploymentEnv: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    productionEnabled: process.env.DELTAPAY_PRODUCTION_ENABLED,
  })
}

async function deltaPayRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const config = getDeltaPayConfig()
  if (!config.operational || !config.apiKey) {
    throw new Error(`DeltaPay is not configured: ${config.problems.join(" ")}`)
  }

  let response: Response
  try {
    response = await fetch(`${config.baseUrl}${path}`, {
      ...init,
      headers: {
        accept: "application/json",
        "x-api-key": config.apiKey,
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    })
  } catch {
    throw new Error("Unable to reach DeltaPay")
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = payload && typeof payload === "object" && "detail" in payload
      ? String((payload as { detail?: unknown }).detail ?? "")
      : ""
    throw new Error(detail || `DeltaPay request failed with HTTP ${response.status}`)
  }
  if (!payload || typeof payload !== "object") throw new Error("DeltaPay returned an invalid response")
  return payload as T
}

export async function createDeltaPayHostedSession(
  input: CreateDeltaPaySessionInput,
): Promise<DeltaPayHostedSession> {
  const payload = await deltaPayRequest<DeltaPayHostedSession>("/v1/hosted-checkout/sessions", {
    method: "POST",
    body: JSON.stringify({
      amount: centsToDeltaPayAmount(input.amountCents),
      merchant_reference: input.merchantReference,
      platform_order_id: input.platformOrderId,
      return_url: input.returnUrl,
      session_callback_url: input.callbackUrl,
      ...(input.displayDescription ? { display_description: input.displayDescription } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
    }),
  })

  if (!payload.checkout_session_id || !payload.checkout_url || !payload.expires_at) {
    throw new Error("DeltaPay session response is incomplete")
  }
  return payload
}

export async function verifyDeltaPayHostedSession(
  checkoutSessionId: string,
): Promise<DeltaPayVerifiedSession> {
  if (!checkoutSessionId.trim()) throw new Error("DeltaPay checkout session id is required")
  const payload = await deltaPayRequest<DeltaPayVerifiedSession>(
    `/v1/hosted-checkout/sessions/${encodeURIComponent(checkoutSessionId)}/verify-return`,
  )

  if (!payload.checkout_session_id || !payload.status || !payload.merchant_reference) {
    throw new Error("DeltaPay verification response is incomplete")
  }
  return payload
}
