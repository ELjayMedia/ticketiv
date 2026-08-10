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
  // Warn, never throw. Every other optional service here degrades to a no-op
  // when unconfigured — Sentry, WhatsApp, SMS, push, rate limiting, MoMo — and
  // .env.production does not load in development, so throwing would break the
  // dev server for anyone who has not set up PostHog locally.
  if (process.env.NODE_ENV === "development") {
    console.warn(
      `[posthog] ${missingPostHogVariable} is not set — product analytics are disabled for this session.`,
    )
  }
} else if (posthogProjectToken && posthogHost) {
  posthog.init(posthogProjectToken, {
    api_host: posthogHost,
    defaults: "2026-01-30",

    // Sentry owns errors. Two SDKs hooking the same global handlers means the
    // same exception is reported twice, in two products, with two triage
    // queues — and PostHog's copy has no source maps behind it.
    capture_exceptions: false,

    // Privacy flags are set explicitly rather than inherited from the dated
    // `defaults` bundle, because what those defaults enable can change and this
    // app renders payout account details, ID numbers on organizer signup, and
    // checkout. Autocapture records clicks, element text and URLs across every
    // route; the events worth having are captured deliberately via
    // posthog.capture() at the call sites. Session recording can also be turned
    // on remotely from PostHog project settings, so it is pinned off here where
    // the decision is reviewable in code.
    autocapture: false,
    disable_session_recording: true,

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
