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
