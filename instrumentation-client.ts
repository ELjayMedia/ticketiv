// TICK-173 — Sentry client init. No-op when NEXT_PUBLIC_SENTRY_DSN is unset.
import * as Sentry from "@sentry/nextjs"
import posthog from "posthog-js"

const posthogProjectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST
const missingPostHogVariable = !posthogProjectToken
  ? "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN"
  : !posthogHost
    ? "NEXT_PUBLIC_POSTHOG_HOST"
    : null

if (missingPostHogVariable) {
  if (process.env.NODE_ENV === "development") {
    throw new Error(
      `${missingPostHogVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingPostHogVariable} is configured`,
    )
  }
} else if (posthogProjectToken && posthogHost) {
  posthog.init(posthogProjectToken, {
    api_host: posthogHost,
    defaults: "2026-01-30",
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
  })
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  // Keep replay light; opt-in via env only.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_REPLAY_ON_ERROR ?? 0),
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
