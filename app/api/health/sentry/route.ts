import { NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"

// Is error monitoring actually delivering?
//
// Sentry.init is deliberately a no-op when the DSN is unset (see
// sentry.server.config.ts) so local and CI runs never phone home. The cost of
// that is silence: a production deployment with a missing DSN looks completely
// healthy while every captured error goes nowhere. Nothing else in the app can
// tell you the difference, which is exactly the failure mode that let the
// ops-alerts cron sit dead for three weeks.
//
// GET  → report configuration, send nothing.
// GET ?test=1 → also capture a real event and flush it, returning the event id
//               so it can be matched in the Sentry UI. That is the only check
//               that proves the whole path, not just the settings.
//
// CRON_SECRET-protected like the /api/cron/* routes: this reports which
// monitoring is configured, and ?test=1 can write to an external service.

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const FLUSH_TIMEOUT_MS = 4_000

export async function GET(request: Request) {
  const expectedSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get("authorization")

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const serverDsn = Boolean(process.env.SENTRY_DSN?.trim())
  const clientDsn = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN?.trim())

  // Source maps are uploaded at build time by withSentryConfig and are skipped
  // silently when the token is absent — the build still succeeds, you just get
  // minified stack traces, which is easy to miss until you need a trace.
  const sourceMaps = {
    org: Boolean(process.env.SENTRY_ORG?.trim()),
    project: Boolean(process.env.SENTRY_PROJECT?.trim()),
    authToken: Boolean(process.env.SENTRY_AUTH_TOKEN?.trim()),
  }

  const config = {
    serverDsn,
    clientDsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? null,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    sourceMapUploadConfigured: sourceMaps.org && sourceMaps.project && sourceMaps.authToken,
    sourceMaps,
  }

  const problems: string[] = []
  if (!serverDsn) problems.push("SENTRY_DSN is unset — server and edge errors are captured into a no-op.")
  if (!clientDsn) problems.push("NEXT_PUBLIC_SENTRY_DSN is unset — browser errors are captured into a no-op.")
  if (!config.sourceMapUploadConfigured) {
    const missing = Object.entries(sourceMaps)
      .filter(([, present]) => !present)
      .map(([name]) => `SENTRY_${name === "authToken" ? "AUTH_TOKEN" : name.toUpperCase()}`)
    problems.push(`Source maps are not uploaded (missing ${missing.join(", ")}); stack traces stay minified.`)
  }

  const wantsTest = new URL(request.url).searchParams.get("test") === "1"
  let testEvent: Record<string, unknown> | null = null

  if (wantsTest) {
    const stamp = new Date().toISOString()
    const eventId = Sentry.captureMessage(`Ticketiv delivery check ${stamp}`, {
      level: "info",
      tags: { area: "sentry-delivery-check" },
    })

    // Without this the event is usually lost. Serverless functions freeze the
    // moment the response is returned, and Sentry's transport batches in the
    // background — so "captured" does not mean "sent". This is the single most
    // common reason a correctly configured Next.js app shows nothing in Sentry.
    const flushed = await Sentry.flush(FLUSH_TIMEOUT_MS)

    testEvent = { eventId: eventId ?? null, flushed, sentAt: stamp }
    if (!eventId) problems.push("captureMessage returned no event id — the SDK is disabled (no DSN).")
    else if (!flushed) problems.push(`Event ${eventId} did not flush within ${FLUSH_TIMEOUT_MS}ms.`)
  }

  return NextResponse.json({
    ok: problems.length === 0,
    checkedAt: new Date().toISOString(),
    config,
    testEvent,
    problems,
  })
}
