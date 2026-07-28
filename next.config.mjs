import { withSentryConfig } from "@sentry/nextjs"

const optionalEnvVars = ["GOOGLE_MAPS_EMBED_KEY"]

// Warn about missing optional env vars but don't block the build
for (const envVar of optionalEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`⚠️  Missing optional env var: ${envVar}. Some features may be disabled.`)
  }
}

assertManagedDeploymentSafety()

function assertManagedDeploymentSafety() {
  const env = process.env
  const managedDeployment = env.VERCEL === "1" || Boolean(env.VERCEL_ENV)
  if (!managedDeployment) return

  const issues = []
  const vercelEnv = env.VERCEL_ENV?.trim().toLowerCase()
  const nonProductionDeployment = vercelEnv !== "production"
  const appHost = normalizeAppHost(env.NEXT_PUBLIC_APP_URL)
  const supabaseProjectRef = extractSupabaseProjectRef(env.NEXT_PUBLIC_SUPABASE_URL)

  requireManagedEnv(env, "NEXT_PUBLIC_SUPABASE_URL", issues)
  requireManagedEnv(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY", issues)
  requireManagedEnv(env, "NEXT_PUBLIC_APP_URL", issues)

  if (env.NEXT_PUBLIC_SUPABASE_URL && !supabaseProjectRef) {
    issues.push("NEXT_PUBLIC_SUPABASE_URL must be a valid https://<project-ref>.supabase.co URL.")
  }

  if (env.NEXT_PUBLIC_APP_URL && !appHost) {
    issues.push("NEXT_PUBLIC_APP_URL must be an absolute https? URL or bare hostname.")
  }

  if (vercelEnv === "production" && appHost && appHost !== "ticketiv.app") {
    issues.push("Vercel production must use NEXT_PUBLIC_APP_URL=https://ticketiv.app.")
  }

  if (nonProductionDeployment && env.PAYSTACK_ALLOW_LIVE_MODE === "true") {
    issues.push("PAYSTACK_ALLOW_LIVE_MODE must not be true outside Vercel production.")
  }

  if (nonProductionDeployment && env.PAYSTACK_SECRET_KEY?.trim().startsWith("sk_live_")) {
    issues.push("PAYSTACK_SECRET_KEY must not be an sk_live_ key outside Vercel production.")
  }

  if (issues.length > 0) {
    throw new Error(`Unsafe deployment configuration:\n- ${issues.join("\n- ")}`)
  }
}

function requireManagedEnv(env, key, issues) {
  if (!env[key]?.trim()) {
    issues.push(`${key} must be set for Vercel preview/production deployments.`)
  }
}

function extractSupabaseProjectRef(value) {
  const hostname = parseHttpsHostname(value)
  if (!hostname) return null
  return hostname.match(/^([a-z0-9-]+)\.supabase\.co$/)?.[1] ?? null
}

function parseHttpsHostname(value) {
  const url = parseUrl(value)
  if (!url || url.protocol !== "https:") return null
  return url.hostname.toLowerCase()
}

function normalizeAppHost(value) {
  const url = parseHttpUrl(value, { allowBareHostname: true })
  if (!url || (url.protocol !== "https:" && url.protocol !== "http:")) return null
  return url.hostname.toLowerCase().replace(/^www\./, "")
}

function parseUrl(value) {
  const raw = value?.trim()
  if (!raw) return null

  try {
    return new URL(raw)
  } catch {
    return null
  }
}

function parseHttpUrl(value, options = {}) {
  const raw = value?.trim()
  if (!raw) return null

  const candidate = options.allowBareHostname && isBareHttpHostname(raw) ? `https://${raw}` : raw

  try {
    return new URL(candidate)
  } catch {
    return null
  }
}

function isBareHttpHostname(value) {
  if (value.includes("://") || value.includes("@") || /\s/.test(value)) return false
  return /^(localhost|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]*)(?::\d+)?(?:[/?#].*)?$/i.test(
    value,
  )
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Workspace packages ship raw TypeScript (ADR 0001 / TICK-328); Next
  // transpiles them instead of expecting prebuilt JS.
  transpilePackages: ["@ticketiv/adapters", "@ticketiv/shared", "@ticketiv/tokens"],
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      { source: "/hifi", destination: "/hifi/index.html" },
      { source: "/hifi/wireframes", destination: "/hifi/wireframes.html" },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  // TICK-173. Source-map upload runs only when SENTRY_AUTH_TOKEN is present
  // (set on Vercel); otherwise it is skipped so local/CI builds never fail.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  telemetry: false,
})
