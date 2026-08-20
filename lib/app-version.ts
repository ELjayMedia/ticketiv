import "server-only"

import packageJson from "@/package.json"

// The profile footer used to render the literal string "current", because
// ProfileScreen's appVersion prop defaulted to it and nothing ever passed a
// value. "current" tells nobody which build they are on, which is exactly the
// question a support ticket needs answered. Resolve the real build identity
// from the package version plus the deployment's git commit instead.

type EnvBag = Record<string, string | undefined>

export const APP_PACKAGE_VERSION = packageJson.version

const SHORT_SHA_LENGTH = 7

function shortCommitSha(env: EnvBag) {
  const sha = env.VERCEL_GIT_COMMIT_SHA?.trim()
  if (!sha) return null
  return sha.slice(0, SHORT_SHA_LENGTH)
}

/**
 * Build identity for the profile footer ("ticketiv · <version>").
 *
 * - `NEXT_PUBLIC_APP_VERSION` wins when set, so a release process can stamp a
 *   tag name without a code change.
 * - Vercel production: `v0.1.0 · a1b2c3d`
 * - Vercel preview: `v0.1.0-preview · a1b2c3d`
 * - Anywhere without a commit sha (local `next dev`): `v0.1.0 · dev`
 */
export function resolveAppVersion(env: EnvBag = process.env): string {
  const override = env.NEXT_PUBLIC_APP_VERSION?.trim()
  if (override) return override

  const version = `v${APP_PACKAGE_VERSION}`
  const sha = shortCommitSha(env)
  if (!sha) return `${version} · dev`

  const vercelEnv = env.VERCEL_ENV?.trim().toLowerCase()
  const label = vercelEnv === "production" ? version : `${version}-${vercelEnv || "preview"}`
  return `${label} · ${sha}`
}

export function getAppVersion(): string {
  return resolveAppVersion()
}
