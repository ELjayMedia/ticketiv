import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

const root = resolve(import.meta.dirname, "..")

describe("Coolify deployment contract", () => {
  it("uses a Dockerfile frontend that supports secret environment mounts", () => {
    const dockerfile = readFileSync(resolve(root, "Dockerfile"), "utf8")

    expect(dockerfile.startsWith("# syntax=docker/dockerfile:1.10\n")).toBe(true)
  })

  it("requires a successful health response with an explicit ready body", () => {
    const dockerfile = readFileSync(resolve(root, "Dockerfile"), "utf8")

    expect(dockerfile).toContain("if(!r.ok)process.exit(1)")
    expect(dockerfile).toContain("body?.ok===true")
    expect(dockerfile).not.toContain("r.status<500")
  })

  it("exposes the deployment tier and commit without Vercel-era variables", () => {
    const dockerfile = readFileSync(resolve(root, "Dockerfile"), "utf8")

    // Builder and runner both set them: the build-time safety check and the
    // runtime health/version code read DEPLOYMENT_ENV and SOURCE_COMMIT.
    expect(dockerfile.match(/DEPLOYMENT_ENV=\$\{DEPLOYMENT_ENV\} SOURCE_COMMIT=\$\{SOURCE_COMMIT\}/g)).toHaveLength(2)
    expect(dockerfile).not.toMatch(/VERCEL/)
  })

  it("keeps deployment credentials out of unprivileged verification", () => {
    const ci = readFileSync(resolve(root, ".github/workflows/checks.yml"), "utf8")
    expect(ci).not.toContain("secrets.SUPABASE_SERVICE_ROLE_KEY")
    expect(ci).not.toContain("secrets.COOLIFY")
    const deploy = readFileSync(resolve(root, "scripts/ci/deploy-coolify.mjs"), "utf8")
    expect(deploy).toContain("CF-Access-Client-Id")
    expect(deploy).toContain("CF-Access-Client-Secret")
  })
})
