import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const harness = readFileSync(join(process.cwd(), "loadtest/k6-public.js"), "utf8")

describe("public load-test contract (TICK-181)", () => {
  it("measures discovery and search suggestions independently", () => {
    expect(harness).toContain('exec: "discover"')
    expect(harness).toContain('exec: "suggest"')
    expect(harness).toContain('new Trend("discover_ms", true)')
    expect(harness).toContain('new Trend("suggest_ms", true)')
    expect(harness).toContain('discover_ms: ["p(95)<800"]')
    expect(harness).toContain('suggest_ms: ["p(95)<800"]')
  })

  it("paces suggestions below the shared-IP limit and requires HTTP 200", () => {
    expect(harness).toContain('executor: "constant-arrival-rate"')
    expect(harness).toContain("rate: 30")
    expect(harness).toContain('timeUnit: "1m"')
    expect(harness).toContain('"suggest 200": (r) => r.status === 200')
    expect(harness).not.toContain("r.status === 429")
  })
})
