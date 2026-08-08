import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

// TICK-173 — keep the Sentry wiring intact.
//
// The SDK is already integrated across all four surfaces. The risk is not that
// someone forgets to add it; it is that `npx @sentry/wizard` gets run against a
// repo that already has it, re-scaffolding these files over the tuned config —
// dropping the DSN-absent no-op guard, the Next 16 hooks, or the build-safe
// source-map settings — and installing with npm on top of a pnpm workspace.
//
// These are static assertions so they run with no DSN and no network.

const root = process.cwd()
const read = (file: string) => readFileSync(join(root, file), "utf8")

describe("Sentry wiring", () => {
  it("initialises every runtime", () => {
    for (const file of ["sentry.server.config.ts", "sentry.edge.config.ts", "instrumentation-client.ts"]) {
      expect(existsSync(join(root, file)), `${file} is missing`).toBe(true)
      expect(read(file)).toContain("Sentry.init(")
    }
  })

  it("stays a no-op when the DSN is absent, so local and CI never phone home", () => {
    for (const file of ["sentry.server.config.ts", "sentry.edge.config.ts"]) {
      expect(read(file)).toContain("enabled: Boolean(process.env.SENTRY_DSN)")
    }
    expect(read("instrumentation-client.ts")).toContain(
      "enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN)",
    )
  })

  it("keeps the hooks that capture nested server and navigation errors", () => {
    const instrumentation = read("instrumentation.ts")
    expect(instrumentation).toContain("Sentry.captureRequestError")
    expect(instrumentation).toContain("./sentry.server.config")
    expect(instrumentation).toContain("./sentry.edge.config")
    expect(read("instrumentation-client.ts")).toContain("Sentry.captureRouterTransitionStart")
  })

  it("reports uncaught render errors from the global boundary", () => {
    expect(read("app/global-error.tsx")).toContain("Sentry.captureException")
  })

  it("wraps the Next config exactly once, and never fails a build without a token", () => {
    const config = read("next.config.mjs")
    expect(config).toContain("withSentryConfig(")
    expect(config.match(/withSentryConfig\(/g) ?? []).toHaveLength(1)
    expect(config).toContain("authToken: process.env.SENTRY_AUTH_TOKEN")
    expect(config).toContain("telemetry: false")
  })

  it("resolves org and project without depending on env being set", () => {
    // Leaving these to env alone warned six times per build ("No org provided.
    // Will not upload source maps.") and shipped minified production traces.
    // Neither slug is a secret — both appear in every Sentry URL.
    const config = read("next.config.mjs")
    expect(config).toMatch(/process\.env\.SENTRY_ORG\s*\|\|\s*"eljaymedia-5k"/)
    expect(config).toMatch(/process\.env\.SENTRY_PROJECT\s*\|\|\s*"ticketiv"/)
  })

  it("turns upload off outright when there is no token, rather than warning", () => {
    const config = read("next.config.mjs")
    expect(config).toContain("sourcemaps: { disable: !sentryUploadEnabled }")
    expect(config).toContain("release: { create: sentryUploadEnabled }")
  })

  it("lets @sentry/cli run its postinstall, or there is no uploader binary", () => {
    // pnpm 10 blocks build scripts by default. @sentry/cli's postinstall is what
    // fetches the CLI binary that performs the upload, so leaving it ignored
    // means source maps silently never ship even with a valid token.
    const pkg = JSON.parse(read("package.json")) as {
      pnpm?: { onlyBuiltDependencies?: string[] }
    }
    expect(pkg.pnpm?.onlyBuiltDependencies ?? []).toContain("@sentry/cli")
  })

  it("flushes the delivery check, because captured is not sent in serverless", () => {
    const route = read("app/api/health/sentry/route.ts")
    expect(route).toContain("Sentry.flush(")
    expect(route).toContain("Bearer ${expectedSecret}")
  })

  it("has not had an npm lockfile introduced alongside the pnpm workspace", () => {
    // The wizard installs with npm unless it detects otherwise; a stray
    // package-lock.json silently diverges from pnpm-lock.yaml.
    expect(existsSync(join(root, "package-lock.json"))).toBe(false)
    expect(existsSync(join(root, "yarn.lock"))).toBe(false)
    expect(existsSync(join(root, "pnpm-lock.yaml"))).toBe(true)
  })
})
