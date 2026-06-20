// TICK-173 — Sentry server-side init. Loaded via instrumentation.ts register().
// No-op when SENTRY_DSN is unset (Sentry disables capture with an empty dsn),
// matching the codebase's graceful-degradation pattern for optional services.
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
})
