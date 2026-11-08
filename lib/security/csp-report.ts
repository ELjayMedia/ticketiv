// Pure parsing of CSP violation reports, so it can be unit tested.

export interface CspReportSummary {
  directive: string
  /** Host of the blocked resource, or a keyword such as "inline" or "eval". */
  blockedHost: string
  /** Path only: query strings can carry tokens and are dropped. */
  documentPath: string | null
  sourceFile: string | null
}

const MAX_REPORTS = 20

const str = (value: unknown) => (typeof value === "string" ? value.trim() : "")

function hostOf(value: string): string {
  if (!value) return "unknown"
  if (!value.includes(":") || !/^[a-z][a-z0-9+.-]*:/i.test(value)) return value.slice(0, 60)
  try {
    const url = new URL(value)
    return url.host || url.protocol.replace(/:$/, "")
  } catch {
    return value.slice(0, 60)
  }
}

function pathOf(value: string): string | null {
  if (!value) return null
  try {
    return new URL(value).pathname.slice(0, 200)
  } catch {
    return null
  }
}

function sourceOf(value: string): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return `${url.host}${url.pathname}`.slice(0, 200)
  } catch {
    return value.slice(0, 200)
  }
}

function summarize(report: Record<string, unknown>): CspReportSummary | null {
  // Legacy report-uri uses kebab-case; the Reporting API uses camelCase.
  const directive =
    str(report["effective-directive"]) || str(report.effectiveDirective) || str(report["violated-directive"]) || str(report.violatedDirective)
  if (!directive) return null
  const blocked = str(report["blocked-uri"]) || str(report.blockedURL) || str(report.blockedUri)
  const document = str(report["document-uri"]) || str(report.documentURL) || str(report.documentUri)
  const source = str(report["source-file"]) || str(report.sourceFile)
  return {
    directive: directive.split(" ")[0].slice(0, 40),
    blockedHost: hostOf(blocked),
    documentPath: pathOf(document),
    sourceFile: sourceOf(source),
  }
}

/** Accepts `{ "csp-report": {...} }` or a Reporting API array; ignores anything else. */
export function summarizeCspReports(body: unknown): CspReportSummary[] {
  const candidates: Record<string, unknown>[] = []
  if (Array.isArray(body)) {
    for (const entry of body.slice(0, MAX_REPORTS)) {
      if (entry && typeof entry === "object" && (entry as { type?: unknown }).type === "csp-violation") {
        const inner = (entry as { body?: unknown }).body
        if (inner && typeof inner === "object") candidates.push(inner as Record<string, unknown>)
      }
    }
  } else if (body && typeof body === "object") {
    const legacy = (body as Record<string, unknown>)["csp-report"]
    if (legacy && typeof legacy === "object") candidates.push(legacy as Record<string, unknown>)
  }
  return candidates.map(summarize).filter((r): r is CspReportSummary => r !== null)
}
