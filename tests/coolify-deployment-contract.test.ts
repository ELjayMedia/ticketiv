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

  it("synchronizes the deployed GitHub revision into Coolify", () => {
    const workflow = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8")

    expect(workflow).toContain("SOURCE_COMMIT: ${{ github.sha }}")
    expect(workflow).toContain('--arg source_commit "$SOURCE_COMMIT"')
    expect(workflow).toContain(
      '{key:"SOURCE_COMMIT", value:$source_commit, is_runtime:true, is_buildtime:true, is_shown_once:false}',
    )
  })

  it("synchronizes cron and monitoring secrets without logging their values", () => {
    const workflow = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8")
    const dockerfile = readFileSync(resolve(root, "Dockerfile"), "utf8")
    const nextConfig = readFileSync(resolve(root, "next.config.mjs"), "utf8")

    expect(workflow).toContain("version: 3.0.0")
    expect(workflow).toContain("from vault.decrypted_secrets")
    expect(workflow).toContain("--read-only")
    expect(workflow).toContain("::add-mask::$CRON_SECRET")
    expect(workflow).toContain("::add-mask::$SENTRY_DSN")
    expect(workflow).toContain(
      "https://sentry.io/api/0/projects/eljaymedia-5k/ticketiv/keys/",
    )
    expect(workflow).toContain(
      '{key:"CRON_SECRET", value:$cron_secret, is_runtime:true, is_buildtime:false, is_shown_once:true}',
    )
    expect(workflow).toContain(
      '{key:"NEXT_PUBLIC_SENTRY_DSN", value:$sentry_dsn, is_runtime:true, is_buildtime:true, is_shown_once:true}',
    )
    expect(workflow).toContain(
      '{key:"SENTRY_AUTH_TOKEN", value:$sentry_token, is_runtime:false, is_buildtime:true, is_shown_once:true}',
    )
    expect(workflow).toContain(
      '{key:"SENTRY_SOURCE_MAPS_BUILD_ENABLED", value:"true", is_runtime:true, is_buildtime:true, is_shown_once:false}',
    )
    expect(workflow).toContain('--data-binary \'{"use_build_secrets":true}\'')
    expect(workflow).toContain(".settings.use_build_secrets == true")
    expect(workflow).toContain("refusing to deploy")
    expect(dockerfile).toContain('${SENTRY_SOURCE_MAPS_BUILD_ENABLED:-false}')
    expect(dockerfile).toContain('test -n "${SENTRY_AUTH_TOKEN:-}"')
    expect(dockerfile).toContain('test "${NODE_OPTIONS:-}" = "--max-old-space-size=4096"')
    expect(dockerfile).toContain('rm -rf /app/.next/cache')
    expect(nextConfig).toContain("deleteSourcemapsAfterUpload: sentryUploadEnabled")
    expect(workflow).not.toMatch(/echo\s+["']?\$(?:CRON_SECRET|SENTRY_DSN)["']?\s*$/m)
  })

  it("authenticates every Coolify API call through Cloudflare Access", () => {
    const workflow = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8")

    expect(workflow).toContain(
      "CLOUDFLARE_ACCESS_CLIENT_ID: ${{ secrets.CLOUDFLARE_ACCESS_CLIENT_ID }}",
    )
    expect(workflow).toContain(
      "CLOUDFLARE_ACCESS_CLIENT_SECRET: ${{ secrets.CLOUDFLARE_ACCESS_CLIENT_SECRET }}",
    )
    expect(workflow).toContain(
      '--header "CF-Access-Client-Id: ${CLOUDFLARE_ACCESS_CLIENT_ID}"',
    )
    expect(workflow).toContain(
      '--header "CF-Access-Client-Secret: ${CLOUDFLARE_ACCESS_CLIENT_SECRET}"',
    )
    expect(workflow.match(/--location --max-redirs 0/g)).toHaveLength(4)
  })
})
