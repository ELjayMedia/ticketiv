import "server-only"

export const DELTAPAY_DEV_BASE_URL = "https://api.dev.deltacrypt.net"
export const DELTAPAY_PROD_BASE_URL = "https://api.prod.deltacrypt.net"

export type DeltaPaySessionStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "expired"
  | "cancelled"

export interface DeltaPayConfig {
  apiKey: string | null
  baseUrl: string
  operational: boolean
  problems: string[]
}

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

export function centsToDeltaPayAmount(amountCents: number): number {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    throw new Error("DeltaPay amount must be a positive integer number of cents")
  }
  return amountCents / 100
}

export function deltaPayAmountToCents(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("DeltaPay returned an invalid amount")
  }
  const cents = Math.round(amount * 100)
  if (Math.abs(amount * 100 - cents) > 1e-6 || !Number.isSafeInteger(cents)) {
    throw new Error("DeltaPay returned an amount with unsupported precision")
  }
  return cents
}

export function evaluateDeltaPayConfig(input: {
  apiKey?: string | null
  baseUrl?: string | null
  deploymentEnv?: string | null
  productionEnabled?: string | null
}): DeltaPayConfig {
  const problems: string[] = []
  const apiKey = input.apiKey?.trim() || null
  const deploymentEnv = input.deploymentEnv?.trim() || "development"
  const defaultBaseUrl = deploymentEnv === "production" ? DELTAPAY_PROD_BASE_URL : DELTAPAY_DEV_BASE_URL
  const baseUrl = (input.baseUrl?.trim() || defaultBaseUrl).replace(/\/$/, "")

  if (!apiKey) problems.push("DELTAPAY_API_KEY is not set.")

  let parsed: URL | null = null
  try {
    parsed = new URL(baseUrl)
    if (parsed.protocol !== "https:") problems.push("DELTAPAY_BASE_URL must use HTTPS.")
  } catch {
    problems.push("DELTAPAY_BASE_URL is invalid.")
  }

  const isDevHost = parsed?.hostname === "api.dev.deltacrypt.net"
  const isProdHost = parsed?.hostname === "api.prod.deltacrypt.net"
  if (deploymentEnv === "production") {
    if (input.productionEnabled?.trim().toLowerCase() !== "true") {
      problems.push("DELTAPAY_PRODUCTION_ENABLED must be true before DeltaPay can be used in production.")
    }
    if (!isProdHost) problems.push("Production DeltaPay must use https://api.prod.deltacrypt.net.")
  } else if (isProdHost && input.productionEnabled?.trim().toLowerCase() !== "true") {
    problems.push("DeltaPay production API use requires DELTAPAY_PRODUCTION_ENABLED=true.")
  }

  if (!isDevHost && !isProdHost) {
    problems.push("DELTAPAY_BASE_URL must use an approved DeltaPay API host.")
  }

  return { apiKey, baseUrl, operational: problems.length === 0, problems }
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
