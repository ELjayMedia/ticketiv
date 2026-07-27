// TICK-173 — Next.js instrumentation hook. Loads the runtime-appropriate Sentry
// config and forwards nested React Server Component / route errors to Sentry.
import * as Sentry from "@sentry/nextjs"

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertDeploymentSafety } = await import("./lib/deployment-safety")
    assertDeploymentSafety()
    await import("./sentry.server.config")
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}

export const onRequestError = Sentry.captureRequestError
