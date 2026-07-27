import "server-only"

import { resolvePaystackKeyMode } from "@/lib/payments/paystack-key-mode"

export const TICKETIV_PRODUCTION_HOST = "ticketiv.app"
export const TICKETIV_PRODUCTION_SUPABASE_REF = "radsfmlsjznqvcpogluo"

type EnvBag = Record<string, string | undefined>
type DeploymentEnvironment = "production" | "preview" | "development" | "local" | "unknown"

export interface DeploymentSafetyReport {
  deploymentEnvironment: DeploymentEnvironment
  appHost: string | null
  supabaseProjectRef: string | null
  usesProductionSupabase: boolean
  issues: string[]
}

export interface DeploymentSafetyBanner {
  label: string
  message: string
  branchLabel: string | null
}

export class DeploymentSafetyError extends Error {
  readonly issues: string[]

  constructor(issues: string[]) {
    super(`Unsafe deployment configuration:\n- ${issues.join("\n- ")}`)
    this.name = "DeploymentSafetyError"
    this.issues = issues
  }
}

export function resolveDeploymentEnvironment(env: EnvBag = process.env): DeploymentEnvironment {
  const vercelEnv = env.VERCEL_ENV?.trim().toLowerCase()
  if (vercelEnv === "production" || vercelEnv === "preview" || vercelEnv === "development") return vercelEnv
  if (env.VERCEL === "1" || vercelEnv) return "unknown"
  return "local"
}

export function extractSupabaseProjectRef(value: string | null | undefined) {
  const hostname = parseHostname(value)
  if (!hostname) return null

  const match = hostname.match(/^([a-z0-9-]+)\.supabase\.co$/)
  return match?.[1] ?? null
}

export function describeDeploymentSafety(env: EnvBag = process.env): DeploymentSafetyReport {
  const deploymentEnvironment = resolveDeploymentEnvironment(env)
  const appHost = normalizeAppHost(env.NEXT_PUBLIC_APP_URL)
  const supabaseProjectRef = extractSupabaseProjectRef(env.NEXT_PUBLIC_SUPABASE_URL)
  const usesProductionSupabase = supabaseProjectRef === TICKETIV_PRODUCTION_SUPABASE_REF
  const issues: string[] = []
  const managedDeployment = env.VERCEL === "1" || Boolean(env.VERCEL_ENV)
  const nonProductionDeployment = deploymentEnvironment !== "production"
  const paystackMode = resolvePaystackKeyMode(env.PAYSTACK_SECRET_KEY)

  if (managedDeployment) {
    requireManagedEnv(env, "NEXT_PUBLIC_SUPABASE_URL", issues)
    requireManagedEnv(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY", issues)
    requireManagedEnv(env, "NEXT_PUBLIC_APP_URL", issues)
  }

  if (env.NEXT_PUBLIC_SUPABASE_URL && !supabaseProjectRef) {
    issues.push("NEXT_PUBLIC_SUPABASE_URL must be a valid Supabase project URL.")
  }

  if (env.NEXT_PUBLIC_APP_URL && !appHost) {
    issues.push("NEXT_PUBLIC_APP_URL must be an absolute https? URL.")
  }

  if (deploymentEnvironment === "production" && appHost && appHost !== TICKETIV_PRODUCTION_HOST) {
    issues.push(`Vercel production must use NEXT_PUBLIC_APP_URL=https://${TICKETIV_PRODUCTION_HOST}.`)
  }

  if (nonProductionDeployment && env.PAYSTACK_ALLOW_LIVE_MODE === "true") {
    issues.push("PAYSTACK_ALLOW_LIVE_MODE must not be true outside Vercel production.")
  }

  if (nonProductionDeployment && paystackMode === "live") {
    issues.push("PAYSTACK_SECRET_KEY must not be an sk_live_ key outside Vercel production.")
  }

  return {
    deploymentEnvironment,
    appHost,
    supabaseProjectRef,
    usesProductionSupabase,
    issues,
  }
}

export function assertDeploymentSafety(env: EnvBag = process.env) {
  const report = describeDeploymentSafety(env)
  if (report.issues.length > 0) {
    throw new DeploymentSafetyError(report.issues)
  }
  return report
}

export function getDeploymentSafetyBanner(env: EnvBag = process.env): DeploymentSafetyBanner | null {
  const report = describeDeploymentSafety(env)
  if (report.deploymentEnvironment === "production" || !report.usesProductionSupabase) return null

  return {
    label: `${formatDeploymentLabel(report.deploymentEnvironment)} build`,
    message: "Connected to production Supabase data",
    branchLabel: formatBranchLabel(env.VERCEL_GIT_COMMIT_REF),
  }
}

function requireManagedEnv(env: EnvBag, key: string, issues: string[]) {
  if (!env[key]?.trim()) {
    issues.push(`${key} must be set for Vercel preview/production deployments.`)
  }
}

function parseHostname(value: string | null | undefined) {
  const url = parseUrl(value)
  if (!url || url.protocol !== "https:") return null

  return url.hostname.toLowerCase()
}

function parseUrl(value: string | null | undefined) {
  const raw = value?.trim()
  if (!raw) return null

  try {
    return new URL(raw)
  } catch {
    return null
  }
}

function normalizeAppHost(value: string | null | undefined) {
  const url = parseUrl(value)
  if (!url || (url.protocol !== "https:" && url.protocol !== "http:")) return null
  return url.hostname.toLowerCase().replace(/^www\./, "")
}

function formatDeploymentLabel(deploymentEnvironment: DeploymentEnvironment) {
  if (deploymentEnvironment === "preview") return "Preview"
  if (deploymentEnvironment === "development") return "Development"
  if (deploymentEnvironment === "unknown") return "Non-production"
  return "Local"
}

function formatBranchLabel(branch: string | null | undefined) {
  const normalized = branch?.trim()
  if (!normalized) return null
  return normalized.length > 28 ? `${normalized.slice(0, 25)}...` : normalized
}
