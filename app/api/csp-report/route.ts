import { NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"

import { clientKey, rateLimit } from "@/lib/rate-limit"
import { summarizeCspReports } from "@/lib/security/csp-report"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_BODY_BYTES = 16 * 1024

/**
 * Receives Content-Security-Policy violation reports from browsers (both the
 * legacy `report-uri` JSON and the Reporting API batch format). The policy is
 * report-only for now: these reports show what a strict policy would block,
 * so it can be tightened and then enforced without breaking checkout.
 *
 * Reports are grouped in Sentry by directive and blocked host. The endpoint
 * always answers 204 so a browser never retries, and drops oversized or
 * excessive traffic without storing it.
 */
export async function POST(request: Request) {
  const rl = await rateLimit("security:csp-report", clientKey(request), 30, 60)
  if (!rl.allowed) return new NextResponse(null, { status: 204 })

  const raw = await request.text()
  if (raw.length === 0 || raw.length > MAX_BODY_BYTES) return new NextResponse(null, { status: 204 })

  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return new NextResponse(null, { status: 204 })
  }

  for (const report of summarizeCspReports(body)) {
    Sentry.captureMessage(`CSP report-only: ${report.directive} blocked ${report.blockedHost}`, {
      level: "info",
      fingerprint: ["csp-report", report.directive, report.blockedHost],
      tags: { csp_directive: report.directive, csp_blocked_host: report.blockedHost },
      extra: { documentPath: report.documentPath, sourceFile: report.sourceFile },
    })
  }
  return new NextResponse(null, { status: 204 })
}
