import { describe, expect, it } from "vitest"

import { summarizeCspReports } from "@/lib/security/csp-report"

describe("summarizeCspReports", () => {
  it("reads the legacy report-uri format and drops query strings", () => {
    const [report] = summarizeCspReports({
      "csp-report": {
        "document-uri": "https://ticketiv.app/t/abc?token=secret",
        "effective-directive": "script-src-elem",
        "blocked-uri": "https://evil.example/x.js?k=1",
        "source-file": "https://ticketiv.app/_next/static/chunk.js?v=2",
      },
    })
    expect(report).toEqual({
      directive: "script-src-elem",
      blockedHost: "evil.example",
      documentPath: "/t/abc",
      sourceFile: "ticketiv.app/_next/static/chunk.js",
    })
  })

  it("reads Reporting API batches and keeps keywords like inline", () => {
    const reports = summarizeCspReports([
      { type: "csp-violation", body: { documentURL: "https://ticketiv.app/", effectiveDirective: "script-src", blockedURL: "inline" } },
      { type: "deprecation", body: { message: "ignored" } },
    ])
    expect(reports).toHaveLength(1)
    expect(reports[0]).toMatchObject({ directive: "script-src", blockedHost: "inline", documentPath: "/" })
  })

  it("ignores junk and caps batch size", () => {
    expect(summarizeCspReports(null)).toEqual([])
    expect(summarizeCspReports({ nope: true })).toEqual([])
    expect(summarizeCspReports({ "csp-report": { "blocked-uri": "x" } })).toEqual([])
    const many = Array.from({ length: 50 }, () => ({ type: "csp-violation", body: { effectiveDirective: "img-src", blockedURL: "https://a.b/c" } }))
    expect(summarizeCspReports(many)).toHaveLength(20)
  })
})
