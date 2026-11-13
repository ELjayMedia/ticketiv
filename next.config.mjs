import { withSentryConfig } from "@sentry/nextjs/config"

const optionalEnvVars = ["GOOGLE_MAPS_EMBED_KEY"]

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "0" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), payment=(self), usb=(), interest-cohort=()",
  },
  {
    key: "Content-Security-Policy",
    value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; upgrade-insecure-requests",
  },
  {
    key: "Content-Security-Policy-Report-Only",
    value:
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://*.posthog.com https://chat.eljaymedia.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.posthog.com https://*.sentry.io https://chat.eljaymedia.com wss://chat.eljaymedia.com; frame-src 'self' https://www.google.com https://chat.eljaymedia.com; worker-src 'self' blob:; manifest-src 'self'; media-src 'self' blob: https:; form-action 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; report-uri /api/csp-report; report-to csp",
  },
  { key: "Reporting-Endpoints", value: 'csp="/api/csp-report"' },
]

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
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }]
  },
  // The retired Pages Router "safe mode" placeholders used to answer these
  // paths with a static "No events to show" page; send them to the live
  // App Router equivalents instead.
  async redirects() {
    return [
      { source: "/events", destination: "/browse", permanent: false },
      { source: "/artists", destination: "/search", permanent: false },
      { source: "/categories", destination: "/browse", permanent: false },
      // US spelling of the public organisers directory.
      { source: "/organizers", destination: "/organisers", permanent: true },
      { source: "/organizers/:id", destination: "/organisers/:id", permanent: true },
    ]
  },
  async rewrites() {
    return [
      { source: "/hifi", destination: "/hifi/index.html" },
      { source: "/hifi/wireframes", destination: "/hifi/wireframes.html" },
    ]
  },
}

// The org and project slugs are not secrets — they are visible in every Sentry
// URL — so they default in code rather than depending on env being present in
// each of production, preview and local. Relying on env produced this on every
// build, three times over (Node.js, Edge, Client):
//
//   Warning: No organization slug provided. Will not create release.
//   Warning: No org provided. Will not upload source maps.
//
// which meant production stack traces stayed minified. Env still wins, so a
// different org/project can be pointed at without a code change.
const SENTRY_ORG = process.env.SENTRY_ORG || "eljaymedia-5k"
const SENTRY_PROJECT = process.env.SENTRY_PROJECT || "ticketiv"

// Uploading needs a token. Without one there is nothing to upload *to*, so turn
// the machinery off explicitly instead of letting it start and warn — a quiet
// build that never had a token is honest; a noisy one trains people to ignore
// Sentry warnings, including the ones that matter.
const sentryUploadEnabled = Boolean(process.env.SENTRY_AUTH_TOKEN?.trim())

export default withSentryConfig(nextConfig, {
  // TICK-173. Source-map upload runs only when SENTRY_AUTH_TOKEN is present
  // (set on Vercel); otherwise it is skipped so local/CI builds never fail.
  org: SENTRY_ORG,
  project: SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  telemetry: false,
  sourcemaps: {
    disable: !sentryUploadEnabled,
    // Uploaded maps are observability artifacts, not runtime assets. Keeping
    // them in the final image wastes disk and risks serving implementation
    // details if a future route exposes a build directory.
    deleteSourcemapsAfterUpload: sentryUploadEnabled,
  },
  release: { create: sentryUploadEnabled },
})
