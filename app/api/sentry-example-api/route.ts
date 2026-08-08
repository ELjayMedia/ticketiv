// Server half of the Sentry verification step. Exists only to throw, so the
// uncaught error travels through instrumentation.ts -> onRequestError ->
// Sentry using SENTRY_DSN. It reads nothing and writes nothing.

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

class SentryExampleApiError extends Error {
  constructor() {
    super("Sentry delivery check — server error (safe to resolve)")
    this.name = "SentryExampleApiError"
  }
}

export function GET() {
  throw new SentryExampleApiError()
}
