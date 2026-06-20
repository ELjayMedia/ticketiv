import { withSentryConfig } from "@sentry/nextjs"

const optionalEnvVars = ["GOOGLE_MAPS_EMBED_KEY"]

// Warn about missing optional env vars but don't block the build
for (const envVar of optionalEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`⚠️  Missing optional env var: ${envVar}. Some features may be disabled.`)
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
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
