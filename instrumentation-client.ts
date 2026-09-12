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
  // Analytics configuration must never prevent the attendee application from
  // hydrating. Local development and CI intentionally run without PostHog in
  // some environments; warn there, but keep product interactions functional.
  if (process.env.NODE_ENV === "development") {
    console.warn(
      `${missingPostHogVariable} required by PostHog is not configured; analytics capture is disabled for this client session.`,
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
  integrations: [Sentry.replayIntegration()],
  tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  replaysSessionSampleRate: Number(
    process.env.NEXT_PUBLIC_SENTRY_REPLAY_SESSION_SAMPLE_RATE ?? 0.1,
  ),
  replaysOnErrorSampleRate: Number(
    process.env.NEXT_PUBLIC_SENTRY_REPLAY_ON_ERROR ?? 1,
  ),
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
